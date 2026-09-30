import { db } from '../firebase/config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { type EventItem } from '../types';
import { notificationService } from './notificationService';

export const eventService = {
  async createEvent(event: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const eventRef = doc(collection(db, 'events'));
    const now = new Date().toISOString();
    const newEvent: EventItem = {
      ...event,
      id: eventRef.id,
      createdAt: now,
      updatedAt: now,
      rsvpStats: {
        yes: 0,
        maybe: 0,
        no: 0,
        waitlist: 0,
        guestCount: 0,
        occupiedSeats: 0,
      },
      waitlistQueue: [],
    };
    await setDoc(eventRef, newEvent);
    return eventRef.id;
  },

  async updateEvent(eventId: string, updates: Partial<EventItem>): Promise<void> {
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async cancelEvent(eventId: string): Promise<void> {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    const title = eventSnap.exists() ? (eventSnap.data() as EventItem).title : 'an event';
    await updateDoc(eventRef, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
    await notificationService.notifyEventInvitees(
      eventId,
      'EVENT_CANCELLED',
      'Event cancelled',
      `${title} has been cancelled by the organizer.`
    );
  },

  async getEvent(eventId: string): Promise<EventItem | null> {
    const eventRef = doc(db, 'events', eventId);
    const snap = await getDoc(eventRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<EventItem, 'id'>) };
  },

  subscribeEvent(eventId: string, callback: (event: EventItem | null) => void) {
    const eventRef = doc(db, 'events', eventId);
    return onSnapshot(eventRef, (snap) => {
      if (!snap.exists()) {
        callback(null);
      } else {
        callback({ id: snap.id, ...(snap.data() as Omit<EventItem, 'id'>) });
      }
    });
  },

  async getPublishedEvents(): Promise<EventItem[]> {
    try {
      const q = query(
        collection(db, 'events'),
        where('status', '==', 'published')
      );
      const snap = await getDocs(q);
      const events: EventItem[] = [];
      snap.forEach((d) => {
        events.push({ id: d.id, ...(d.data() as Omit<EventItem, 'id'>) });
      });
      return events.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    } catch {
      return [];
    }
  },

  subscribeOrganizerEvents(organizerId: string, callback: (events: EventItem[]) => void) {
    const q = query(
      collection(db, 'events'),
      where('organizerId', '==', organizerId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const events: EventItem[] = [];
        snapshot.forEach((docSnap) => {
          events.push({ id: docSnap.id, ...(docSnap.data() as Omit<EventItem, 'id'>) });
        });
        events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(events);
      },
      (error) => {
        console.warn('Organizer events onSnapshot fallback:', error);
        callback([]);
      }
    );
  },

  subscribeAllPublishedEvents(callback: (events: EventItem[]) => void) {
    // IMPORTANT: The `where` clause must match the Firestore security rule condition
    // so Firestore can verify at query time that only permitted documents are returned.
    // Without this filter, an attendee's collection-wide query is rejected with
    // permission-denied (the rule cannot be satisfied for the full collection).
    const q = query(
      collection(db, 'events'),
      where('status', 'in', ['published', 'completed'])
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const events: EventItem[] = [];
        snapshot.forEach((docSnap) => {
          events.push({ id: docSnap.id, ...(docSnap.data() as EventItem) });
        });
        events.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        callback(events);
      },
      (err) => {
        console.error('[eventService] subscribeAllPublishedEvents error:', err);
        callback([]);
      }
    );
  },
};
