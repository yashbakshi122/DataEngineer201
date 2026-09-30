export type UserRole = 'organizer' | 'attendee';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export type EventStatus = 'draft' | 'published' | 'completed' | 'cancelled';

export interface EventRsvpStats {
  yes: number;
  maybe: number;
  no: number;
  waitlist: number;
  guestCount: number;
  occupiedSeats: number;
}

export interface WaitlistEntry {
  inviteId: string;
  timestamp: string;
  guests: number;
}

export interface EventItem {
  id?: string;
  title: string;
  description: string;
  eventType: 'Workshop' | 'Conference' | 'College Event' | 'Seminar' | 'Webinar' | 'Meetup' | 'Other';
  startAt: string; // ISO date-time string
  endAt: string;   // ISO date-time string
  venue: string;
  onlineLink?: string;
  capacity: number;
  rsvpDeadline: string; // ISO date-time string
  bannerUrl?: string;
  status: EventStatus;
  organizerId: string;
  organizerName?: string;
  createdAt: string;
  updatedAt: string;
  /** Atomic occupancy counters maintained inside RSVP transactions */
  rsvpStats?: EventRsvpStats;
  waitlistQueue?: WaitlistEntry[];
}

export type InviteStatus = 'pending' | 'yes' | 'maybe' | 'no' | 'waitlist' | 'checked-in';

export interface Invitee {
  id?: string;
  eventId: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  company?: string;
  token: string;
  status: InviteStatus;
  plusOnesAllowed: number;
  plusOnesCount: number;
  qrCodeDataUrl?: string;
  createdAt: string;
  waitlistPosition?: number;
}

export type RSVPAnswer = 'yes' | 'maybe' | 'no' | 'waitlist';

export interface RSVPRecord {
  id?: string;
  eventId: string;
  inviteId: string;
  token: string;
  name: string;
  email: string;
  answer: RSVPAnswer;
  guests: number;
  timestamp: string;
  updatedAt: string;
}

export interface Announcement {
  id?: string;
  eventId: string;
  eventTitle?: string;
  title: string;
  message: string;
  createdAt: string;
  authorName?: string;
}

export type NotificationType = 
  | 'RSVP_CONFIRMED'
  | 'RSVP_UPDATED'
  | 'EVENT_REMINDER'
  | 'VENUE_CHANGED'
  | 'TIME_CHANGED'
  | 'EVENT_CANCELLED'
  | 'WAITLIST_PROMOTED'
  | 'ANNOUNCEMENT';

export interface NotificationItem {
  id?: string;
  userId: string;
  email?: string;
  eventId?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface CheckInRecord {
  id?: string;
  eventId: string;
  inviteId: string;
  attendeeName: string;
  attendeeEmail: string;
  method: 'qr' | 'manual';
  timestamp: string;
}

export interface LiveRSVPStats {
  yes: number;
  maybe: number;
  no: number;
  waitlist: number;
  guestCount: number;
  totalAttendees: number; // yes + guestCount
  totalResponses: number;
  capacity: number;
  availableSeats: number;
  loading: boolean;
  lastUpdated?: Date;
}
