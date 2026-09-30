import { db } from '../firebase/config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { type CheckInRecord, type Invitee, type EventItem } from '../types';

export interface CheckInResult {
  success: boolean;
  message: string;
  invite?: Invitee;
  event?: EventItem;
  alreadyCheckedIn?: boolean;
  checkedInAt?: string;
}

export const checkinService = {
  async findAttendee(eventId: string, tokenOrQuery: string): Promise<{ invite: Invitee | null; event: EventItem | null; error?: string }> {
    let token = tokenOrQuery.trim();
    let targetEventId = eventId;

    if (token.includes('?')) {
      try {
        const url = new URL(token);
        const urlEventId = url.searchParams.get('e');
        const urlToken = url.searchParams.get('t');
        if (urlToken) token = urlToken;
        if (urlEventId) targetEventId = urlEventId;
      } catch {
        // Not a standard URL, treat as raw token or query
      }
    }

    try {
      const eventRef = doc(db, 'events', targetEventId);
      const eventSnap = await getDoc(eventRef);
      if (!eventSnap.exists()) {
        return { invite: null, event: null, error: 'Event not found' };
      }
      const event = { id: eventSnap.id, ...(eventSnap.data() as Omit<EventItem, 'id'>) };

      const invitesRef = collection(db, `events_invites/${targetEventId}/invites`);
      let q = query(invitesRef, where('token', '==', token));
      let snap = await getDocs(q);

      if (snap.empty && token.includes('@')) {
        q = query(invitesRef, where('email', '==', token.toLowerCase()));
        snap = await getDocs(q);
      }

      if (snap.empty) {
        return { invite: null, event, error: 'No invitation found matching this token/email' };
      }

      const firstDoc = snap.docs[0];
      const invite = { id: firstDoc.id, ...(firstDoc.data() as Omit<Invitee, 'id'>) };
      return { invite, event };
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };
      console.error(
        '[Firestore ERROR] checkinService.findAttendee',
        '\n  operation: getDocs (invite lookup)',
        `\n  path: events_invites/${targetEventId}/invites`,
        '\n  error code:', fbErr.code ?? 'unknown',
        '\n  error message:', fbErr.message ?? String(err)
      );
      return {
        invite: null,
        event: null,
        error: fbErr.code === 'permission-denied'
          ? 'Permission denied. You must be signed in as the event organizer.'
          : 'Lookup failed — please check your connection and try again.',
      };
    }
  },

  async recordCheckIn(
    eventId: string,
    invite: Invitee,
    method: 'qr' | 'manual'
  ): Promise<CheckInResult> {
    const inviteId = invite.id!;
    const checkRef = doc(db, `events_checkins/${eventId}/checks`, inviteId);
    const inviteRef = doc(db, `events_invites/${eventId}/invites`, inviteId);
    const emailInviteRef = doc(db, 'email_invites', inviteId);

    try {
      return await runTransaction(db, async (transaction) => {
        const checkSnap = await transaction.get(checkRef);
        if (checkSnap.exists()) {
          const existing = checkSnap.data() as CheckInRecord;
          return {
            success: false,
            alreadyCheckedIn: true,
            checkedInAt: existing.timestamp,
            message: `Already checked in at ${new Date(existing.timestamp).toLocaleTimeString()}`,
            invite,
          };
        }

        const now = new Date().toISOString();
        const checkRecord: CheckInRecord = {
          id: inviteId,
          eventId,
          inviteId,
          attendeeName: invite.name,
          attendeeEmail: invite.email,
          method,
          timestamp: now,
        };

        transaction.set(checkRef, checkRecord);

        // Update invite status — token-matching rule allows 'checked-in' status update
        transaction.update(inviteRef, {
          status: 'checked-in',
          token: invite.token, // required by update rule: token must stay unchanged
        });

        // email_invites update rule requires email, eventId, inviteId to be present
        // and unchanged — always include them so the rule can validate identity fields.
        transaction.set(emailInviteRef, {
          email: invite.email,
          eventId,
          inviteId,
          status: 'checked-in',
          updatedAt: now,
        }, { merge: true });

        return {
          success: true,
          message: `Successfully checked in ${invite.name}!`,
          invite: { ...invite, status: 'checked-in' as const },
          checkedInAt: now,
        };
      });
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };
      console.error(
        '[Firestore ERROR] checkinService.recordCheckIn',
        '\n  operation: runTransaction (check-in)',
        `\n  path: events_checkins/${eventId}/checks/${inviteId}`,
        '\n  error code:', fbErr.code ?? 'unknown',
        '\n  error message:', fbErr.message ?? String(err)
      );
      return {
        success: false,
        message: fbErr.code === 'permission-denied'
          ? 'Permission denied. You must be signed in as the event organizer to check in attendees.'
          : (err instanceof Error ? err.message : 'Check-in failed. Sign in as the event organizer.'),
        invite,
      };
    }
  },

  subscribeEventCheckins(eventId: string, callback: (checks: CheckInRecord[]) => void) {
    const checksRef = collection(db, `events_checkins/${eventId}/checks`);
    return onSnapshot(
      checksRef,
      (snapshot) => {
        const list: CheckInRecord[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as CheckInRecord) });
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        callback(list);
      },
      (error) => {
        console.warn('Checkins snapshot fallback:', error);
        callback([]);
      }
    );
  },
};
