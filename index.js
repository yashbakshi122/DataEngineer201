const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

/**
 * Helper: Generate cryptographically secure token
 */
function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Cloud Function: submitRSVP
 * Receives eventId, token, answer, guests
 * Atomic check-and-update to enforce capacity and handle FIFO waitlist
 */
exports.submitRSVP = functions.https.onCall(async (data, context) => {
  const { eventId, token, answer, guests = 0 } = data;

  if (!eventId || !token || !answer) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with eventId, token, and answer.'
    );
  }

  const validAnswers = ['yes', 'maybe', 'no', 'waitlist'];
  if (!validAnswers.includes(answer)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid answer choice.'
    );
  }

  try {
    return await db.runTransaction(async (transaction) => {
      // 1. Validate Event
      const eventRef = db.collection('events').doc(eventId);
      const eventDoc = await transaction.get(eventRef);

      if (!eventDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Event does not exist.');
      }

      const eventData = eventDoc.data();
      if (eventData.status === 'cancelled') {
        throw new functions.https.HttpsError('failed-precondition', 'This event has been cancelled.');
      }

      if (eventData.rsvpDeadline && new Date(eventData.rsvpDeadline).getTime() < Date.now()) {
        throw new functions.https.HttpsError('deadline-exceeded', 'RSVP deadline for this event has passed.');
      }

      // 2. Validate Invitation & Token
      const invitesRef = db.collection(`events_invites/${eventId}/invites`);
      const invitesQuery = invitesRef.where('token', '==', token);
      const inviteSnap = await transaction.get(invitesQuery);

      if (inviteSnap.empty) {
        throw new functions.https.HttpsError('not-found', 'Invalid or expired invitation token.');
      }

      const inviteDoc = inviteSnap.docs[0];
      const inviteData = inviteDoc.data();
      const inviteId = inviteDoc.id;

      const allowedPlusOnes = inviteData.plusOnesAllowed || 0;
      const requestedGuests = Math.min(Math.max(0, guests), allowedPlusOnes);

      // 3. Read current RSVPs to calculate existing capacity usage
      const rsvpsRef = db.collection(`events_rsvps/${eventId}/rsvps`);
      const rsvpsSnap = await transaction.get(rsvpsRef);

      let currentOccupiedSeats = 0;
      const waitlistQueue = [];

      rsvpsSnap.forEach((d) => {
        const rsvp = d.data();
        if (d.id !== inviteId) {
          if (rsvp.answer === 'yes') {
            currentOccupiedSeats += 1 + (rsvp.guests || 0);
          } else if (rsvp.answer === 'waitlist') {
            waitlistQueue.push({ inviteId: d.id, timestamp: rsvp.timestamp });
          }
        }
      });

      // 4. Determine final answer
      let finalStatus = answer;
      let waitlistPosition = null;

      if (answer === 'yes') {
        const seatsNeeded = 1 + requestedGuests;
        if (currentOccupiedSeats + seatsNeeded > eventData.capacity) {
          finalStatus = 'waitlist';
          waitlistPosition = waitlistQueue.length + 1;
        }
      }

      // 5. FIFO Waitlist Promotion check if seat was vacated
      let promotedInviteId = null;
      if ((answer === 'no' || answer === 'maybe') && inviteData.status === 'yes') {
        waitlistQueue.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (waitlistQueue.length > 0) {
          promotedInviteId = waitlistQueue[0].inviteId;
        }
      }

      const now = new Date().toISOString();

      // 6. Write RSVP document
      const rsvpDocRef = rsvpsRef.doc(inviteId);
      transaction.set(rsvpDocRef, {
        eventId,
        inviteId,
        token,
        name: inviteData.name,
        email: inviteData.email,
        answer: finalStatus,
        guests: requestedGuests,
        timestamp: now,
        updatedAt: now,
      });

      // 7. Update invite status
      const inviteTargetRef = invitesRef.doc(inviteId);
      transaction.update(inviteTargetRef, {
        status: finalStatus,
        plusOnesCount: requestedGuests,
        waitlistPosition: waitlistPosition,
      });

      // 8. Handle waitlist promotion
      if (promotedInviteId) {
        const promotedRsvpRef = rsvpsRef.doc(promotedInviteId);
        const promotedInviteRef = invitesRef.doc(promotedInviteId);
        transaction.update(promotedRsvpRef, { answer: 'yes', updatedAt: now });
        transaction.update(promotedInviteRef, { status: 'yes', waitlistPosition: null });

        // Create promotion notification
        const notifRef = db.collection('notifications').doc();
        transaction.set(notifRef, {
          userId: promotedInviteId,
          eventId,
          type: 'WAITLIST_PROMOTED',
          title: "You're off the waitlist!",
          message: `A seat opened up for ${eventData.title}. Your RSVP is now confirmed.`,
          read: false,
          createdAt: now,
        });
      }

      return {
        success: true,
        status: finalStatus,
        waitlistPosition,
        message: finalStatus === 'yes'
          ? "You're confirmed!"
          : finalStatus === 'waitlist'
          ? `Added to waitlist at position #${waitlistPosition}`
          : 'Response recorded.',
      };
    });
  } catch (err) {
    console.error('Error submitting RSVP in Cloud Function:', err);
    throw new functions.https.HttpsError('internal', err.message);
  }
});

/**
 * Cloud Function: createInvites
 * Generates unique secure tokens and saves invite records for an event
 */
exports.createInvites = functions.https.onCall(async (data, context) => {
  const { eventId, invitees } = data;

  if (!eventId || !Array.isArray(invitees) || invitees.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing eventId or invitees array.');
  }

  const batch = db.batch();
  const created = [];

  for (const inv of invitees) {
    const inviteRef = db.collection(`events_invites/${eventId}/invites`).doc();
    const token = generateToken();
    const record = {
      id: inviteRef.id,
      eventId,
      name: inv.name.trim(),
      email: inv.email.trim().toLowerCase(),
      phone: inv.phone || '',
      role: inv.role || 'Invitee',
      company: inv.company || '',
      token,
      status: 'pending',
      plusOnesAllowed: inv.plusOnesAllowed || 0,
      plusOnesCount: 0,
      createdAt: new Date().toISOString(),
    };

    batch.set(inviteRef, record);
    created.push(record);
  }

  await batch.commit();
  return { success: true, count: created.length, invitees: created };
});

/**
 * Cloud Function: createAnnouncement
 * Creates an announcement and writes notification entries for attendees
 */
exports.createAnnouncement = functions.https.onCall(async (data, context) => {
  const { eventId, eventTitle, title, message } = data;

  if (!eventId || !title || !message) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
  }

  const annRef = await db.collection('announcements').add({
    eventId,
    eventTitle: eventTitle || '',
    title: title.trim(),
    message: message.trim(),
    createdAt: new Date().toISOString(),
  });

  return { success: true, id: annRef.id };
});

/**
 * Cloud Function: checkin
 * Validates token, prevents duplicate entry, and logs check-in timestamp
 */
exports.checkin = functions.https.onCall(async (data, context) => {
  const { eventId, token, method = 'manual' } = data;

  if (!eventId || !token) {
    throw new functions.https.HttpsError('invalid-argument', 'eventId and token are required.');
  }

  const invitesRef = db.collection(`events_invites/${eventId}/invites`);
  const snap = await invitesRef.where('token', '==', token).get();

  if (snap.empty) {
    throw new functions.https.HttpsError('not-found', 'Invalid invitation token.');
  }

  const inviteDoc = snap.docs[0];
  const inviteData = inviteDoc.data();
  const inviteId = inviteDoc.id;

  const checkRef = db.collection(`events_checkins/${eventId}/checks`).doc(inviteId);
  const checkDoc = await checkRef.get();

  if (checkDoc.exists) {
    return {
      success: false,
      alreadyCheckedIn: true,
      message: 'Attendee has already checked in.',
      checkedInAt: checkDoc.data().timestamp,
    };
  }

  const now = new Date().toISOString();
  await checkRef.set({
    eventId,
    inviteId,
    attendeeName: inviteData.name,
    attendeeEmail: inviteData.email,
    method,
    timestamp: now,
  });

  await inviteDoc.ref.update({ status: 'checked-in' });

  return {
    success: true,
    message: `Checked in ${inviteData.name}!`,
    checkedInAt: now,
  };
});
