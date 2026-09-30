import { db } from '../firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { type NotificationItem, type NotificationType } from '../types';

function mergeById(a: NotificationItem[], b: NotificationItem[]): NotificationItem[] {
  const map = new Map<string, NotificationItem>();
  [...a, ...b].forEach((n) => {
    if (n.id) map.set(n.id, n);
  });
  return Array.from(map.values()).sort(
    (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
  );
}

export const notificationService = {
  subscribeUserNotifications(
    userId: string,
    callback: (notifications: NotificationItem[]) => void,
    email?: string | null
  ) {
    let byUid: NotificationItem[] = [];
    let byEmail: NotificationItem[] = [];
    const emit = () => callback(mergeById(byUid, byEmail));

    const unsubUid = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', userId)),
      (snapshot) => {
        byUid = [];
        snapshot.forEach((docSnap) => {
          byUid.push({ id: docSnap.id, ...(docSnap.data() as Omit<NotificationItem, 'id'>) });
        });
        emit();
      },
      (error) => {
        const fbErr = error as { code?: string; message?: string };
        console.error(
          '[Firestore ERROR] notificationService.subscribeUserNotifications (userId)',
          '\n  operation: onSnapshot',
          '\n  path: notifications where userId ==', userId,
          '\n  error code:', fbErr.code ?? 'unknown',
          '\n  error message:', fbErr.message ?? String(error)
        );
        byUid = [];
        emit();
      }
    );

    let unsubEmail = () => {};
    if (email) {
      unsubEmail = onSnapshot(
        query(collection(db, 'notifications'), where('email', '==', email.toLowerCase())),
        (snapshot) => {
          byEmail = [];
          snapshot.forEach((docSnap) => {
            byEmail.push({ id: docSnap.id, ...(docSnap.data() as Omit<NotificationItem, 'id'>) });
          });
          emit();
        },
        () => {
          byEmail = [];
          emit();
        }
      );
    }

    return () => {
      unsubUid();
      unsubEmail();
    };
  },

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  },

  async markAllAsRead(userId: string, email?: string | null): Promise<void> {
    try {
      const queries = [query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false))];
      if (email) {
        queries.push(
          query(collection(db, 'notifications'), where('email', '==', email.toLowerCase()), where('read', '==', false))
        );
      }
      const batch = writeBatch(db);
      const seen = new Set<string>();
      for (const q of queries) {
        const snap = await getDocs(q);
        snap.forEach((d) => {
          if (!seen.has(d.id)) {
            seen.add(d.id);
            batch.update(d.ref, { read: true });
          }
        });
      }
      await batch.commit();
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  },

  async createNotification(notif: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notif,
      email: notif.email?.toLowerCase() || notif.userId,
      read: false,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  },

  async notifyEventInvitees(
    eventId: string,
    type: NotificationType,
    title: string,
    message: string
  ): Promise<void> {
    try {
      const snap = await getDocs(query(collection(db, 'email_invites'), where('eventId', '==', eventId)));
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach((d) => {
        const email = String(d.data().email || '').toLowerCase();
        if (!email || count >= 400) return;
        const ref = doc(collection(db, 'notifications'));
        batch.set(ref, {
          userId: email,
          email,
          eventId,
          type,
          title,
          message,
          read: false,
          createdAt: new Date().toISOString(),
        });
        count += 1;
      });
      if (count > 0) await batch.commit();
    } catch (e) {
      console.warn('[notificationService] notifyEventInvitees:', e);
    }
  },
};
