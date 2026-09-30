import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LiveIndicator } from '../../components/common/LiveIndicator';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { QRCodeCard } from '../../components/common/QRCodeCard';
import { eventService } from '../../services/eventService';
import { inviteService } from '../../services/inviteService';
import { rsvpService } from '../../services/rsvpService';
import { announcementService } from '../../services/announcementService';
import { useLiveRSVP } from '../../hooks/useLiveRSVP';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { type EventItem, type Announcement, type Invitee, type RSVPAnswer } from '../../types';
import {
  Calendar,
  Clock,
  MapPin,
  Globe,
  Users,
  AlertCircle,
  Edit,
  UserCheck,
  BarChart,
  Megaphone,
  Share2,
  CheckCircle,
  HelpCircle,
  XCircle,
  Clock3,
  ShieldCheck,
  Lock,
} from 'lucide-react';

// ─── RSVP button visual config ────────────────────────────────────────────────
const RSVP_OPTIONS: {
  answer: RSVPAnswer;
  label: string;
  icon: React.ReactNode;
  activeStyle: React.CSSProperties;
}[] = [
  {
    answer: 'yes',
    label: 'Going',
    icon: <CheckCircle size={16} />,
    activeStyle: {
      backgroundColor: 'var(--success-solid)',
      color: '#FFFFFF',
      borderColor: 'var(--success-solid)',
      boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
    },
  },
  {
    answer: 'maybe',
    label: 'Maybe',
    icon: <HelpCircle size={16} />,
    activeStyle: {
      backgroundColor: 'var(--warning-solid)',
      color: '#FFFFFF',
      borderColor: 'var(--warning-solid)',
      boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
    },
  },
  {
    answer: 'no',
    label: 'Not Going',
    icon: <XCircle size={16} />,
    activeStyle: {
      backgroundColor: 'var(--danger-solid)',
      color: '#FFFFFF',
      borderColor: 'var(--danger-solid)',
      boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
    },
  },
  {
    answer: 'waitlist',
    label: 'Waitlist',
    icon: <Clock3 size={16} />,
    activeStyle: {
      backgroundColor: '#7C3AED',
      color: '#FFFFFF',
      borderColor: '#7C3AED',
      boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
    },
  },
];

export const EventDetailsPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [event, setEvent]             = useState<EventItem | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading]         = useState(true);

  // ── Attendee invite + RSVP state ─────────────────────────────────────────
  const [invite, setInvite]           = useState<Invitee | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<RSVPAnswer | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [rsvpMessage, setRsvpMessage] = useState<string | null>(null);

  // Live real-time RSVP statistics
  const liveStats = useLiveRSVP(eventId);

  // ── Subscribe to event document ───────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    const unsubEvent = eventService.subscribeEvent(eventId, (data) => {
      setEvent(data);
      setLoading(false);
    });
    const unsubAnnounce = announcementService.subscribeEventAnnouncements(eventId, (data) => {
      setAnnouncements(data);
    });
    return () => { unsubEvent(); unsubAnnounce(); };
  }, [eventId]);

  // ── Look up invite by the logged-in user's email ──────────────────────────
  useEffect(() => {
    if (!eventId || !user?.email) return;
    setInviteLoading(true);
    inviteService.getInviteByEmail(eventId, user.email).then((inv) => {
      setInvite(inv);
      if (inv && inv.status !== 'pending') {
        setCurrentAnswer(inv.status as RSVPAnswer);
      }
      setInviteLoading(false);
    });
  }, [eventId, user?.email]);

  // ── Submit RSVP using the existing rsvpService transaction ────────────────
  const handleRSVP = async (answer: RSVPAnswer) => {
    if (!invite || !eventId) return;

    // Guard: deadline check (client-side fast-fail; server also validates)
    if (event?.rsvpDeadline && new Date(event.rsvpDeadline).getTime() < Date.now()) {
      showError('RSVP deadline for this event has passed.');
      return;
    }

    // Step 3 diagnostic logging (no passwords or sensitive credentials)
    console.log('[RSVP] Firebase UID:', user?.uid);
    console.log('[RSVP] User email:', user?.email);
    console.log('[RSVP] Event ID:', eventId);
    console.log('[RSVP] RSVP path:', `events_rsvps/${eventId}/rsvps/${invite.id}`);
    console.log('[RSVP] Requested status:', answer);

    setSubmitting(true);
    setRsvpMessage(null);

    const result = await rsvpService.submitRSVP({
      eventId,
      token:   invite.token,
      answer,
      guests:  answer === 'yes' ? (invite.plusOnesCount ?? 0) : 0,
    });

    setSubmitting(false);

    if (result.success) {
      setCurrentAnswer(result.status);
      setRsvpMessage(result.message);
      setInvite((prev) => prev
        ? { ...prev, status: result.status, waitlistPosition: result.waitlistPosition }
        : prev
      );
      success(result.message);
    } else {
      showError(result.message);
      setRsvpMessage(result.message);
    }
  };

  const isOrganizer  = !!user && !!event && user.uid === event.organizerId;
  const isAttendee   = !!user && user.role === 'attendee';
  const deadlinePast = !!event?.rsvpDeadline
    && new Date(event.rsvpDeadline).getTime() < Date.now();
  const isFull       = liveStats.capacity > 0
    && liveStats.availableSeats <= 0;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    success('Event link copied to clipboard!');
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <Navbar />
        <div style={{ maxWidth: 1000, margin: '40px auto', padding: '0 24px' }}>
          <LoadingSkeleton height={280} />
          <div style={{ marginTop: 24 }}><LoadingSkeleton height={40} count={3} /></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <Navbar />
        <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
          <h2>Event Not Found</h2>
          <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>
            This event does not exist or has been removed.
          </p>
          <Link to="/events" className="btn btn-primary" style={{ marginTop: 20 }}>
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const startDate = new Date(event.startAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const startTime = new Date(event.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const endTime   = new Date(event.endAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const deadlineStr = event.rsvpDeadline
    ? new Date(event.rsvpDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ maxWidth: 1100, margin: '40px auto', width: '100%', padding: '0 24px', flex: 1 }}>

        {/* Banner */}
        {event.bannerUrl && (
          <div style={{
            width: '100%', height: 280, borderRadius: 'var(--radius-lg)',
            overflow: 'hidden', marginBottom: 32, boxShadow: 'var(--shadow-md)',
          }}>
            <img src={event.bannerUrl} alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32, alignItems: 'flex-start' }}>

          {/* ── Left Column ─────────────────────────────────────────────── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                {event.eventType}
              </span>
              <Badge variant={event.status === 'published' ? 'published' : event.status === 'cancelled' ? 'cancelled' : 'draft'}>
                {event.status}
              </Badge>
              <LiveIndicator label="Real-Time Sync" />
            </div>

            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.25, marginBottom: 16 }}>
              {event.title}
            </h1>

            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 32, whiteSpace: 'pre-line' }}>
              {event.description}
            </p>

            {/* Schedule & Location */}
            <Card style={{ padding: 24, marginBottom: 32 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Event Schedule &amp; Location</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Calendar size={20} color="var(--accent-primary)" style={{ marginTop: 2 }} />
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Date</span>
                    <strong style={{ fontSize: '0.95rem' }}>{startDate}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Clock size={20} color="var(--accent-primary)" style={{ marginTop: 2 }} />
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Time</span>
                    <strong style={{ fontSize: '0.95rem' }}>{startTime} – {endTime}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <MapPin size={20} color="var(--accent-primary)" style={{ marginTop: 2 }} />
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Venue</span>
                    <strong style={{ fontSize: '0.95rem' }}>{event.venue}</strong>
                  </div>
                </div>
                {event.onlineLink && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <Globe size={20} color="var(--accent-primary)" style={{ marginTop: 2 }} />
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Online Meeting</span>
                      <a href={event.onlineLink} target="_blank" rel="noreferrer" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                        Join Video Link
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* ── RSVP Section (attendees only, not organizer) ─────────────── */}
            {isAttendee && !isOrganizer && (
              <Card style={{ padding: 28, marginBottom: 32, border: '1.5px solid var(--accent-primary-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Your Response</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      {deadlinePast
                        ? 'RSVP deadline has passed'
                        : deadlineStr
                        ? `RSVP by ${deadlineStr}`
                        : 'Let the organizer know if you can attend'}
                    </p>
                  </div>
                </div>

                {inviteLoading ? (
                  <LoadingSkeleton height={56} count={1} />
                ) : !invite ? (
                  /* ── Not invited ────────────────────────────────────── */
                  <div style={{
                    padding: 20, borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <Lock size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    <div>
                      <p style={{ fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>
                        Invitation required
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '4px 0 0' }}>
                        This event requires a personal invitation from the organizer.
                        If you received an invitation email, use the link in that email to RSVP.
                      </p>
                    </div>
                  </div>
                ) : deadlinePast ? (
                  /* ── Deadline passed ────────────────────────────────── */
                  <div style={{
                    padding: 16, borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <AlertCircle size={18} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      The RSVP deadline has passed. Your current status:{' '}
                      <strong style={{ textTransform: 'capitalize' }}>
                        {currentAnswer ?? invite.status ?? 'Pending'}
                      </strong>
                    </span>
                  </div>
                ) : (
                  /* ── Active RSVP buttons ────────────────────────────── */
                  <>
                    {/* Status feedback banner */}
                    {rsvpMessage && (
                      <div style={{
                        padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                        marginBottom: 16,
                        backgroundColor: currentAnswer === 'yes'
                          ? 'var(--success-bg)' : currentAnswer === 'waitlist'
                          ? '#F5F3FF' : currentAnswer === 'maybe'
                          ? 'var(--warning-bg)' : 'var(--danger-bg)',
                        border: `1px solid ${currentAnswer === 'yes'
                          ? 'var(--success-border)' : currentAnswer === 'waitlist'
                          ? '#DDD6FE' : currentAnswer === 'maybe'
                          ? 'var(--warning-border)' : 'var(--danger-border)'}`,
                        display: 'flex', alignItems: 'center', gap: 10,
                        fontSize: '0.875rem',
                      }}>
                        {currentAnswer === 'yes'    && <CheckCircle size={16} color="var(--success-solid)" />}
                        {currentAnswer === 'maybe'  && <HelpCircle  size={16} color="var(--warning-solid)" />}
                        {currentAnswer === 'no'     && <XCircle     size={16} color="var(--danger-solid)"  />}
                        {currentAnswer === 'waitlist' && <Clock3    size={16} color="#7C3AED" />}
                        <span style={{ color: 'var(--text-primary)' }}>{rsvpMessage}</span>
                      </div>
                    )}

                    {/* Event-full notice */}
                    {isFull && currentAnswer !== 'yes' && (
                      <div style={{
                        padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 12,
                        backgroundColor: '#FFF7ED', border: '1px solid #FED7AA',
                        fontSize: '0.8125rem', color: '#92400E',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <AlertCircle size={14} />
                        Event is at full capacity. Selecting Going will place you on the waitlist.
                      </div>
                    )}

                    {/* RSVP buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      {RSVP_OPTIONS.map(({ answer, label, icon, activeStyle }) => {
                        const isActive = currentAnswer === answer;
                        return (
                          <button
                            key={answer}
                            type="button"
                            disabled={submitting}
                            onClick={() => handleRSVP(answer)}
                            style={{
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center',
                              gap: 6, padding: '14px 8px',
                              borderRadius: 'var(--radius-md)',
                              border: '1.5px solid var(--border-light)',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--text-primary)',
                              cursor: submitting ? 'not-allowed' : 'pointer',
                              fontFamily: 'var(--font-family)',
                              fontSize: '0.8125rem', fontWeight: 600,
                              transition: 'all 0.15s ease',
                              opacity: submitting ? 0.6 : 1,
                              ...(isActive ? activeStyle : {}),
                            }}
                          >
                            {icon}
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* QR Pass after confirming Going */}
                    {currentAnswer === 'yes' && (
                      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--success-solid)', fontWeight: 600, fontSize: '0.8125rem' }}>
                            <ShieldCheck size={15} /> Your entry pass is ready
                          </div>
                        </div>
                        <QRCodeCard
                          url={`${window.location.origin}/rsvp?e=${eventId}&t=${invite.token}`}
                          title={`${invite.name} – Entry Pass`}
                          subtitle={event.title.slice(0, 40)}
                          downloadFileName={`${invite.name.toLowerCase().replace(/\s+/g, '-')}-pass.png`}
                        />
                      </div>
                    )}
                  </>
                )}
              </Card>
            )}

            {/* Announcements */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Megaphone size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Event Announcements ({announcements.length})
                </h3>
              </div>
              {announcements.length === 0 ? (
                <div style={{
                  padding: 20, backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.9rem',
                }}>
                  No announcements yet. Check back closer to event time!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {announcements.map((a) => (
                    <Card key={a.id} style={{ padding: 18, borderLeft: '4px solid var(--accent-primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{a.title}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(a.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{a.message}</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Sidebar ────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Live RSVP Stats */}
            <Card style={{ padding: 24, boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Live RSVP Status</h3>
                <LiveIndicator />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'GOING',     value: liveStats.yes,      bg: 'var(--success-bg)',  color: 'var(--success-text)' },
                  { label: 'MAYBE',     value: liveStats.maybe,    bg: 'var(--warning-bg)',  color: 'var(--warning-text)' },
                  { label: 'NOT GOING', value: liveStats.no,       bg: 'var(--danger-bg)',   color: 'var(--danger-text)'  },
                  { label: 'WAITLIST',  value: liveStats.waitlist, bg: '#F5F3FF',            color: '#6D28D9'              },
                ].map(({ label, value, bg, color }) => (
                  <div key={label} style={{ padding: 12, borderRadius: 'var(--radius-sm)', backgroundColor: bg, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color, letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Capacity bar */}
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {isFull ? '🔴 Event Full' : 'Capacity Available'}
                  </span>
                  <strong>{liveStats.availableSeats} / {event.capacity} seats</strong>
                </div>
                <div style={{ height: 6, backgroundColor: '#CBD5E1', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round((liveStats.totalAttendees / (event.capacity || 1)) * 100))}%`,
                    backgroundColor: isFull ? 'var(--danger-solid)' : 'var(--accent-primary)',
                    borderRadius: 3, transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>

              {liveStats.guestCount > 0 && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  + {liveStats.guestCount} additional guests included
                </div>
              )}

              {/* RSVP notice for non-invited / unauthenticated */}
              {!invite && !isOrganizer && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <AlertCircle size={15} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>RSVP requires a personal invitation from the organizer.</span>
                  </div>
                </div>
              )}

              <Button variant="secondary" onClick={handleShare} icon={<Share2 size={16} />} style={{ width: '100%' }}>
                Share Event Page
              </Button>
            </Card>

            {/* Organizer quick actions */}
            {isOrganizer && (
              <Card style={{ padding: 20, backgroundColor: 'var(--accent-primary-light)', borderColor: 'var(--accent-primary-border)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 12 }}>
                  Organizer Management
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Link to={`/organizer/events/${event.id}/invites`} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                    <Users size={14} /> Manage Invites &amp; Tokens
                  </Link>
                  <Link to={`/organizer/events/${event.id}/analytics`} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                    <BarChart size={14} /> View Analytics
                  </Link>
                  <Link to={`/organizer/events/${event.id}/checkin`} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                    <UserCheck size={14} /> Open Check-In
                  </Link>
                  <Link to={`/organizer/events/${event.id}/edit`} className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
                    <Edit size={14} /> Edit Event
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
