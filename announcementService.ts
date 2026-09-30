import { db } from '../firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDocs,
} from 'firebase/firestore';
import { type Announcement } from '../types';
import { notificationService } from './notificationService';

export const announcementService = {
  async createAnnouncement(
    announcement: Omit<Announcement, 'id' | 'createdAt'> & { organizerId?: string }
  ): Promise<string> {
    const createdAt = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'announcements'), {
      ...announcement,
      createdAt,
    });
    await notificationService.notifyEventInvitees(
      announcement.eventId,
      'ANNOUNCEMENT',
      announcement.title,
      announcement.message
    );
    return docRef.id;
  },

  subscribeEventAnnouncements(eventId: string, callback: (items: Announcement[]) => void) {
    const q = query(
      collection(db, 'announcements'),
      where('eventId', '==', eventId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Announcement[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<Announcement, 'id'>) });
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      (error) => {
        console.warn('Announcements snapshot fallback:', error);
        callback([]);
      }
    );
  },

  async getRecentAnnouncements(limitCount = 10): Promise<Announcement[]> {
    try {
      const q = query(collection(db, 'announcements'));
      const snap = await getDocs(q);
      const list: Announcement[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<Announcement, 'id'>) });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list.slice(0, limitCount);
    } catch {
      return [];
    }
  },
};
