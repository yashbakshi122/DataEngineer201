import { db, functions } from '../firebase/config';
import {
  collection,
  doc,
  getDocs,
  runTransaction,
  onSnapshot,
  query,
  where,
  addDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth } from '../firebase/config';
import {
  type RSVPAnswer,
  type RSVPRecord,
  type Invitee,
  type EventItem,
  type EventRsvpStats,
  type WaitlistEntry,
} from '../types';

export interface SubmitRSVPParams {
  eventId: string;
  token: string;
  answer: RSVPAnswer;
  guests: number;
}

export interface SubmitRSVPResult {
  success: boolean;
  status: 'yes' | 'maybe' | 'no' | 'waitlist';
  message: string;
  waitlistPosition?: number;
}

const emptyStats = (): EventRsvpStats => ({
  yes: 0,
  maybe: 0,
  no: 0,
  waitlist: 0,
  guestCount: 0,
  occupiedSeats: 0,
});

function subtractAnswer(
  stats: EventRsvpStats,
  queue: WaitlistEntry[],
  answer: RSVPAnswer | Invitee['status'] | undefined,
  guests: number,
  inviteId: string
) {
  if (answer === 'yes' || answer === 'checked-in') {
    stats.yes = Math.max(0, stats.yes - 1);
    stats.guestCount = Math.max(0, stats.guestCount - guests);
    stats.occupiedSeats = Math.max(0, stats.occupiedSeats - (1 + guests));
  } else if (answer === 'maybe') {
    stats.maybe = Math.max(0, stats.maybe - 1);
  } else if (answer === 'no') {
    stats.no = Math.max(0, stats.no - 1);
  } else if (answer === 'waitlist') {
    stats.waitlist = Math.max(0, stats.waitlist - 1);
    const idx = queue.findIndex((w) => w.inviteId === inviteId);
    if (idx >= 0) queue.splice(idx, 1);
  }
}

function addAnswer(
  stats: EventRsvpStats,
  queue: WaitlistEntry[],
  answer: RSVPAnswer,
  guests: number,
  inviteId: string,
  timestamp: string
) {
  if (answer === 'yes') {
    stats.yes += 1;
    stats.guestCount += guests;
    stats.occupiedSeats += 1 + guests;
  } else if (answer === 'maybe') {
    stats.maybe += 1;
  } else if (answer === 'no') {
    stats.no += 1;
  } else if (answer === 'waitlist') {
    stats.waitlist += 1;
    if (!queue.some((w) => w.inviteId === inviteId)) {
      queue.push({ inviteId, timestamp, guests });
    }
  }
}

async function submitRSVPClient({
  eventId,
  token,
  answer,
  guests,
}: SubmitRSVPParams): Promise<SubmitRSVPResult> {
  const invitesCol = collection(db, `events_invites/${eventId}/invites`);
  const inviteQuery = query(invitesCol, where('token', '==', token));
  const inviteLookup = await getDocs(inviteQuery);
  if (inviteLookup.empty) {
    throw new Error('Invalid or expired invitation token.');
  }
  const inviteSnap0 = inviteLookup.docs[0];
  const inviteId = inviteSnap0.id;

  // These are captured outside the transaction so post-transaction code can use them.
  let capturedPromoted: Array<{ inviteId: string; guests: number }> = [];
  let capturedQueuedSnaps: Record<string, Invitee> = {};
  let capturedEventTitle = '';

  const result = await runTransaction(db, async (transaction) => {
    const eventRef = doc(db, 'events', eventId);
    const inviteRef = doc(db, `events_invites/${eventId}/invites`, inviteId);
    const rsvpRef = doc(db, `events_rsvps/${eventId}/rsvps`, inviteId);
    const emailInviteRef = doc(db, 'email_invites', inviteId);

    const eventSnap = await transaction.get(eventRef);
    const inviteDoc = await transaction.get(inviteRef);
    const existingRsvp = await transaction.get(rsvpRef);

    if (!eventSnap.exists()) throw new Error('Event does not exist.');
    if (!inviteDoc.exists()) throw new Error('Invalid or expired invitation token.');

    const eventData = eventSnap.data() as EventItem;
    const invite = { id: inviteDoc.id, ...(inviteDoc.data() as Omit<Invitee, 'id'>) };

    const queuedIds = [...new Set((eventData.waitlistQueue || []).map((w) => w.inviteId))];
    const queuedInviteSnaps: Record<string, Invitee> = {};
    for (const qid of queuedIds) {
      const qSnap = await transaction.get(doc(db, `events_invites/${eventId}/invites`, qid));
      if (qSnap.exists()) {
        queuedInviteSnaps[qid] = { id: qSnap.id, ...(qSnap.data() as Omit<Invitee, 'id'>) };
      }
    }

    // Expose to outer scope for post-transaction notification sending
    capturedQueuedSnaps = queuedInviteSnaps;
    capturedEventTitle = eventData.title;

    if (invite.token !== token) {
      throw new Error('Invalid or expired invitation token.');
    }
    if (eventData.status === 'cancelled') {
      throw new Error('This event has been cancelled.');
    }
    if (eventData.rsvpDeadline) {
      const deadline = new Date(eventData.rsvpDeadline).getTime();
      if (Date.now() > deadline) {
        throw new Error('RSVP deadline for this event has passed.');
      }
    }

    const allowedGuests = invite.plusOnesAllowed || 0;
    const requestedGuests = Math.min(Math.max(0, guests), allowedGuests);

    const stats: EventRsvpStats = { ...emptyStats(), ...(eventData.rsvpStats || {}) };
    const queue: WaitlistEntry[] = [...(eventData.waitlistQueue || [])];

    const prevAnswer = (existingRsvp.exists()
      ? (existingRsvp.data() as RSVPRecord).answer
      : invite.status) as RSVPAnswer | Invitee['status'] | undefined;
    const prevGuests = existingRsvp.exists()
      ? (existingRsvp.data() as RSVPRecord).guests || 0
      : invite.plusOnesCount || 0;

    subtractAnswer(stats, queue, prevAnswer, prevGuests, inviteId);

    let finalStatus: RSVPAnswer = answer;
    let waitlistPosition: number | undefined;

    if (answer === 'yes') {
      const seatsNeeded = 1 + requestedGuests;
      if (stats.occupiedSeats + seatsNeeded > eventData.capacity) {
        finalStatus = 'waitlist';
      }
    }

    const now = new Date().toISOString();
    addAnswer(stats, queue, finalStatus, requestedGuests, inviteId, now);

    if (finalStatus === 'waitlist') {
      queue.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      waitlistPosition = queue.findIndex((w) => w.inviteId === inviteId) + 1;
    }

    const promoted: Array<{ inviteId: string; guests: number }> = [];
    if (prevAnswer === 'yes' || prevAnswer === 'checked-in') {
      queue.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      while (queue.length > 0) {
        const next = queue[0];
        const seats = 1 + (next.guests || 0);
        if (stats.occupiedSeats + seats > eventData.capacity) break;
        queue.shift();
        stats.waitlist = Math.max(0, stats.waitlist - 1);
        addAnswer(stats, queue, 'yes', next.guests || 0, next.inviteId, now);
        promoted.push({ inviteId: next.inviteId, guests: next.guests || 0 });
      }
      capturedPromoted = promoted; // expose for post-transaction notification
    }

    transaction.set(rsvpRef, {
      eventId,
      inviteId,
      token,
      name: invite.name,
      email: invite.email,
      answer: finalStatus,
      guests: requestedGuests,
      timestamp: now,
      updatedAt: now,
    });

    transaction.update(inviteRef, {
      status: finalStatus,
      plusOnesCount: requestedGuests,
      waitlistPosition: waitlistPosition ?? null,
      token: invite.token,
    });

    transaction.set(
      emailInviteRef,
      {
        inviteId,
        eventId,
        email: invite.email,
        name: invite.name,
        token: invite.token,
        status: finalStatus,
        plusOnesAllowed: invite.plusOnesAllowed || 0,
        plusOnesCount: requestedGuests,
        waitlistPosition: waitlistPosition ?? null,
        createdAt: invite.createdAt,
        updatedAt: now,
      },
      { merge: true }
    );

    transaction.update(eventRef, {
      rsvpStats: stats,
      waitlistQueue: queue,
      updatedAt: now,
    });

    for (const p of promoted) {
      const promotedRsvpRef = doc(db, `events_rsvps/${eventId}/rsvps`, p.inviteId);
      const promotedInviteRef = doc(db, `events_invites/${eventId}/invites`, p.inviteId);
      const promotedEmailRef = doc(db, 'email_invites', p.inviteId);

      transaction.set(promotedRsvpRef, { answer: 'yes', updatedAt: now }, { merge: true });
      transaction.update(promotedInviteRef, { status: 'yes', waitlistPosition: null });
      transaction.set(promotedEmailRef, { status: 'yes', waitlistPosition: null, updatedAt: now }, { merge: true });

      // NOTE: Waitlist-promotion notifications are NOT written inside this transaction.
      // Notification creation requires isAuthed() in the Firestore rule, but this
      // client transaction may run unauthenticated (token-based RSVP flow).
      // Notifications for promoted attendees are sent after the transaction completes,
      // only when the caller is authenticated. The Cloud Function path handles this
      // atomically for the authenticated/server-side flow.
    }

    if (finalStatus === 'waitlist') {
      return {
        success: true,
        status: 'waitlist' as const,
        waitlistPosition,
        message: `Event has reached full capacity. You are placed at waitlist position #${waitlistPosition}.`,
      };
    }

    if (finalStatus === 'yes') {
      return {
        success: true,
        status: 'yes' as const,
        message: requestedGuests > 0
          ? `You're confirmed for you and ${requestedGuests} guest(s)!`
          : "You're confirmed!",
      };
    }

    return {
      success: true,
      status: finalStatus,
      message: finalStatus === 'maybe' ? 'Thanks! We marked you as tentative.' : 'Thanks for letting us know.',
    };
  });

  // Fire-and-forget: send promotion notifications outside the transaction
  // so they run under the caller's auth context (skipped if unauthenticated).
  sendPromotionNotifications(capturedPromoted, capturedQueuedSnaps, capturedEventTitle, eventId)
    .catch(() => {}); // non-critical; do not block the RSVP response

  return result;
}

/**
 * After a successful client-side RSVP transaction, send waitlist-promotion
 * notifications. This runs outside the transaction so it only executes when
 * the caller is authenticated (the rule requires isAuthed() for notification
 * creation). Unauthenticated token flows silently skip this step — the Cloud
 * Function path handles notifications atomically in that case.
 */
async function sendPromotionNotifications(
  promoted: Array<{ inviteId: string; guests: number }>,
  queuedInviteSnaps: Record<string, Invitee>,
  eventTitle: string,
  eventId: string
): Promise<void> {
  if (promoted.length === 0) return;
  if (!auth.currentUser) return; // unauthenticated token flow — skip silently

  const now = new Date().toISOString();
  for (const p of promoted) {
    const promotedEmail = queuedInviteSnaps[p.inviteId]?.email || '';
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: promotedEmail || p.inviteId,
        email: promotedEmail,
        eventId,
        type: 'WAITLIST_PROMOTED',
        title: "You're off the waitlist!",
        message: `A seat opened up for ${eventTitle}. Your RSVP is now confirmed.`,
        read: false,
        createdAt: now,
      });
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };
      console.warn(
        '[Firestore ERROR] rsvpService sendPromotionNotifications',
        '\n  operation: addDoc (notification)',
        '\n  path: notifications',
        '\n  error code:', fbErr.code ?? 'unknown',
        '\n  error message:', fbErr.message ?? String(err)
      );
    }
  }
}

export const rsvpService = {
  /**
   * Prefer the Cloud Function (admin transaction + query) when deployed,
   * then fall back to a client transaction that updates event occupancy counters.
   */
  async submitRSVP(params: SubmitRSVPParams): Promise<SubmitRSVPResult> {
    try {
      const callable = httpsCallable<SubmitRSVPParams, SubmitRSVPResult>(functions, 'submitRSVP');
      const result = await callable(params);
      if (result.data?.success) return result.data;
    } catch {
      // Function may be undeployed or unreachable — use the client transaction.
    }

    try {
      return await submitRSVPClient(params);
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };
      console.error(
        '[Firestore ERROR] rsvpService.submitRSVP (client path)',
        '\n  operation: runTransaction (RSVP)',
        `\n  path: events_rsvps/${params.eventId}/rsvps`,
        '\n  user uid:', auth.currentUser?.uid ?? 'unauthenticated',
        '\n  user email:', auth.currentUser?.email ?? 'unauthenticated',
        '\n  error code:', fbErr.code ?? 'unknown',
        '\n  error message:', fbErr.message ?? String(err)
      );
      return {
        success: false,
        status: 'no',
        message: err instanceof Error ? err.message : 'An error occurred while saving your RSVP.',
      };
    }
  },

  subscribeLiveRSVPs(eventId: string, callback: (rsvps: RSVPRecord[]) => void) {
    const rsvpsRef = collection(db, `events_rsvps/${eventId}/rsvps`);
    return onSnapshot(
      rsvpsRef,
      (snapshot) => {
        const list: RSVPRecord[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as RSVPRecord) });
        });
        callback(list);
      },
      (error) => {
        const fbErr = error as { code?: string; message?: string };
        console.error(
          '[Firestore ERROR] rsvpService.subscribeLiveRSVPs',
          '\n  operation: onSnapshot (collection)',
          `\n  path: events_rsvps/${eventId}/rsvps`,
          '\n  user uid:', auth.currentUser?.uid ?? 'unauthenticated',
          '\n  user email:', auth.currentUser?.email ?? 'unauthenticated',
          '\n  error code:', fbErr.code ?? 'unknown',
          '\n  error message:', fbErr.message ?? String(error)
        );
        callback([]);
      }
    );
  },

  subscribeMyRSVPs(
    inviteIds: string[],
    eventIds: string[],
    callback: (rsvps: RSVPRecord[]) => void
  ): () => void {
    if (inviteIds.length === 0 || eventIds.length === 0) {
      callback([]);
      return () => {};
    }
    const unsubscribers: (() => void)[] = [];
    const results: Map<string, RSVPRecord> = new Map();

    eventIds.forEach((eventId) => {
      const rsvpsRef = collection(db, `events_rsvps/${eventId}/rsvps`);
      const unsub = onSnapshot(
        rsvpsRef,
        (snapshot) => {
          snapshot.forEach((d) => {
            const rsvp = { id: d.id, ...(d.data() as RSVPRecord) };
            if (inviteIds.includes(rsvp.inviteId) || inviteIds.includes(d.id)) {
              results.set(d.id, rsvp);
            }
          });
          callback(Array.from(results.values()));
        },
        (err) => { console.warn('[rsvpService] subscribeMyRSVPs error:', err); }
      );
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((u) => u());
  },
};
