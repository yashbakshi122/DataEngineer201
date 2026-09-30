import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { type RSVPRecord, type LiveRSVPStats, type EventItem } from '../types';

export const useLiveRSVP = (eventId?: string): LiveRSVPStats => {
  const [stats, setStats] = useState<LiveRSVPStats>({
    yes: 0,
    maybe: 0,
    no: 0,
    waitlist: 0,
    guestCount: 0,
    totalAttendees: 0,
    totalResponses: 0,
    capacity: 0,
    availableSeats: 0,
    loading: true,
  });

  useEffect(() => {
    if (!eventId) {
      setStats((prev) => ({ ...prev, loading: false }));
      return;
    }

    let currentCapacity = 0;
    let usedEventCounters = false;

    const applyFromEvent = (ev: EventItem) => {
      currentCapacity = ev.capacity || 0;
      const rs = ev.rsvpStats;
      if (!rs) {
        setStats((prev) => ({
          ...prev,
          capacity: currentCapacity,
          availableSeats: Math.max(0, currentCapacity - prev.totalAttendees),
        }));
        return;
      }
      usedEventCounters = true;
      const totalAttendees = rs.occupiedSeats || (rs.yes + rs.guestCount);
      const totalResponses = rs.yes + rs.maybe + rs.no + rs.waitlist;
      setStats({
        yes: rs.yes,
        maybe: rs.maybe,
        no: rs.no,
        waitlist: rs.waitlist,
        guestCount: rs.guestCount,
        totalAttendees,
        totalResponses,
        capacity: currentCapacity,
        availableSeats: Math.max(0, currentCapacity - totalAttendees),
        loading: false,
        lastUpdated: new Date(),
      });
    };

    const eventRef = doc(db, 'events', eventId);
    const unsubEvent = onSnapshot(
      eventRef,
      (eventSnap) => {
        if (eventSnap.exists()) {
          applyFromEvent(eventSnap.data() as EventItem);
        }
      },
      (err) => console.warn('Live Event capacity listener fallback:', err)
    );

    const rsvpsRef = collection(db, `events_rsvps/${eventId}/rsvps`);
    const unsubRsvps = onSnapshot(
      rsvpsRef,
      (snapshot) => {
        if (usedEventCounters) return;
        let yes = 0;
        let maybe = 0;
        let no = 0;
        let waitlist = 0;
        let guestCount = 0;

        snapshot.forEach((d) => {
          const rsvp = d.data() as RSVPRecord;
          if (rsvp.answer === 'yes') {
            yes += 1;
            guestCount += rsvp.guests || 0;
          } else if (rsvp.answer === 'maybe') {
            maybe += 1;
          } else if (rsvp.answer === 'no') {
            no += 1;
          } else if (rsvp.answer === 'waitlist') {
            waitlist += 1;
          }
        });

        const totalAttendees = yes + guestCount;
        setStats({
          yes,
          maybe,
          no,
          waitlist,
          guestCount,
          totalAttendees,
          totalResponses: snapshot.size,
          capacity: currentCapacity,
          availableSeats: Math.max(0, currentCapacity - totalAttendees),
          loading: false,
          lastUpdated: new Date(),
        });
      },
      (err) => {
        console.warn('Live RSVP listener fallback:', err);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    );

    return () => {
      unsubEvent();
      unsubRsvps();
    };
  }, [eventId]);

  return stats;
};
