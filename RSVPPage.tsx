import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { QRCodeCard } from '../../components/common/QRCodeCard';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { eventService } from '../../services/eventService';
import { inviteService } from '../../services/inviteService';
import { rsvpService } from '../../services/rsvpService';
import { type EventItem, type Invitee, type RSVPAnswer } from '../../types';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  XCircle,
  Sparkles,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export const RSVPPage = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('e') || '';
  const token = searchParams.get('t') || '';

  const { success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [invite, setInvite] = useState<Invitee | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form State
  const [selectedAnswer, setSelectedAnswer] = useState<RSVPAnswer | null>(null);
  const [guestsCount, setGuestsCount] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [waitlistPosition, setWaitlistPosition] = useState<number | undefined>(undefined);

  useEffect(() => {
    async function loadAndValidate() {
      if (!eventId || !token) {
        setValidationError('Invalid invitation link. An event ID and secure token are required.');
        setLoading(false);
        return;
      }

      try {
        const ev = await eventService.getEvent(eventId);
        if (!ev) {
          setValidationError('Sorry, this event does not exist or has been removed.');
          setLoading(false);
          return;
        }

        if (ev.status === 'cancelled') {
          setValidationError('This event has been cancelled by the organizer.');
          setEvent(ev);
          setLoading(false);
          return;
        }

        if (ev.rsvpDeadline && new Date(ev.rsvpDeadline).getTime() < Date.now()) {
          setValidationError('Registration and RSVP for this event has closed.');
          setEvent(ev);
          setLoading(false);
          return;
        }

        setEvent(ev);

        // Fetch invite by token
        const inv = await inviteService.getInviteByToken(eventId, token);
        if (!inv) {
          setValidationError('Sorry, this invitation link is invalid or has expired.');
          setLoading(false);
          return;
        }

        setInvite(inv);
        if (inv.status !== 'pending') {
          setSelectedAnswer(inv.status as RSVPAnswer);
          setGuestsCount(inv.plusOnesCount || 0);
          if (inv.waitlistPosition) {
            setWaitlistPosition(inv.waitlistPosition);
          }
        }
      } catch (err: any) {
        setValidationError(err.message || 'We could not connect to verify your invitation.');
      } finally {
        setLoading(false);
      }
    }

    loadAndValidate();
  }, [eventId, token]);

  const handleSubmitResponse = async (answer: RSVPAnswer) => {
    if (!eventId || !token || !invite) return;

    setSubmitting(true);
    setFeedbackMessage(null);

    const result = await rsvpService.submitRSVP({
      eventId,
      token,
      answer,
      guests: answer === 'yes' ? guestsCount : 0,
    });

    setSubmitting(false);

    if (result.success) {
      setSelectedAnswer(result.status);
      setWaitlistPosition(result.waitlistPosition);
      setFeedbackMessage(result.message);
      success(result.message);
      // Update local invite state
      setInvite((prev) => (prev ? { ...prev, status: result.status, waitlistPosition: result.waitlistPosition } : null));
    } else {
      error(result.message);
      setFeedbackMessage(result.message);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <Navbar />
        <div style={{ maxWidth: 640, margin: '60px auto', padding: '0 24px' }}>
          <LoadingSkeleton height={320} />
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ maxWidth: 560, margin: '80px auto', width: '100%', padding: '0 24px', textAlign: 'center' }}>
          <Card style={{ padding: 40, boxShadow: 'var(--shadow-md)' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger-solid)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <AlertCircle size={28} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>Invitation Notice</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 24, lineHeight: 1.5 }}>
              {validationError}
            </p>
            <Link to="/events" className="btn btn-secondary">
              Browse Other Events
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  const startDate = event ? new Date(event.startAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) : '';

  const startTime = event ? new Date(event.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
  const endTime = event ? new Date(event.endAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ maxWidth: 640, margin: '40px auto', width: '100%', padding: '0 24px', flex: 1 }}>
        {/* Invitation Welcome Card */}
        <Card style={{ padding: 36, boxShadow: 'var(--shadow-lg)', borderTop: '4px solid var(--accent-primary)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                backgroundColor: 'var(--accent-primary-light)',
                color: 'var(--accent-primary)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              <Sparkles size={14} />
              <span>Official Invitation</span>
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              You are invited, {invite?.name}!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {invite?.role ? `${invite.role} ${invite.company ? `at ${invite.company}` : ''}` : 'Special Guest'}
            </p>
          </div>

          {/* Event Preview Info Box */}
          <div
            style={{
              padding: 20,
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              marginBottom: 28,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Badge variant="published">{event?.eventType}</Badge>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hosted on Cloud Architecture</span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              {event?.title}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} color="var(--accent-primary)" />
                <span>{startDate}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="var(--accent-primary)" />
                <span>{startTime} – {endTime}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color="var(--accent-primary)" />
                <span>{event?.venue}</span>
              </div>
            </div>
          </div>

          {/* Feedback banner if response is recorded */}
          {feedbackMessage && (
            <div
              style={{
                padding: 16,
                borderRadius: 'var(--radius-sm)',
                marginBottom: 24,
                backgroundColor:
                  selectedAnswer === 'yes'
                    ? 'var(--success-bg)'
                    : selectedAnswer === 'waitlist'
                    ? '#F5F3FF'
                    : selectedAnswer === 'maybe'
                    ? 'var(--warning-bg)'
                    : 'var(--danger-bg)',
                border: `1px solid ${
                  selectedAnswer === 'yes'
                    ? 'var(--success-border)'
                    : selectedAnswer === 'waitlist'
                    ? '#DDD6FE'
                    : selectedAnswer === 'maybe'
                    ? 'var(--warning-border)'
                    : 'var(--danger-border)'
                }`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {selectedAnswer === 'yes' && <CheckCircle size={20} color="var(--success-solid)" />}
              {selectedAnswer === 'waitlist' && <Clock size={20} color="#6D28D9" />}
              {selectedAnswer === 'maybe' && <HelpCircle size={20} color="var(--warning-solid)" />}
              {selectedAnswer === 'no' && <XCircle size={20} color="var(--danger-solid)" />}
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {selectedAnswer === 'yes'
                    ? "You're confirmed!"
                    : selectedAnswer === 'waitlist'
                    ? `Added to Waitlist (Position #${waitlistPosition || 1})`
                    : selectedAnswer === 'maybe'
                    ? 'RSVP Marked as Maybe'
                    : 'Response: Not Attending'}
                </strong>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {feedbackMessage}
                </span>
              </div>
            </div>
          )}

          {/* Question: Will you attend? */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              Will you attend?
            </label>

            {/* Answer Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <button
                type="button"
                onClick={() => handleSubmitResponse('yes')}
                disabled={submitting}
                className="btn"
                style={{
                  height: 56,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  backgroundColor: selectedAnswer === 'yes' ? 'var(--success-solid)' : '#FFFFFF',
                  color: selectedAnswer === 'yes' ? '#FFFFFF' : 'var(--text-primary)',
                  borderColor: selectedAnswer === 'yes' ? 'var(--success-solid)' : 'var(--border-light)',
                  boxShadow: selectedAnswer === 'yes' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  <CheckCircle size={16} /> Yes, Going
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSubmitResponse('maybe')}
                disabled={submitting}
                className="btn"
                style={{
                  height: 56,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  backgroundColor: selectedAnswer === 'maybe' ? 'var(--warning-solid)' : '#FFFFFF',
                  color: selectedAnswer === 'maybe' ? '#FFFFFF' : 'var(--text-primary)',
                  borderColor: selectedAnswer === 'maybe' ? 'var(--warning-solid)' : 'var(--border-light)',
                  boxShadow: selectedAnswer === 'maybe' ? '0 4px 12px rgba(245, 158, 11, 0.25)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  <HelpCircle size={16} /> Maybe
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSubmitResponse('no')}
                disabled={submitting}
                className="btn"
                style={{
                  height: 56,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  backgroundColor: selectedAnswer === 'no' ? 'var(--danger-solid)' : '#FFFFFF',
                  color: selectedAnswer === 'no' ? '#FFFFFF' : 'var(--text-primary)',
                  borderColor: selectedAnswer === 'no' ? 'var(--danger-solid)' : 'var(--border-light)',
                  boxShadow: selectedAnswer === 'no' ? '0 4px 12px rgba(239, 68, 68, 0.25)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  <XCircle size={16} /> Not Going
                </div>
              </button>
            </div>
          </div>

          {/* Plus-One Guest Selector (If allowed and Going) */}
          {(invite?.plusOnesAllowed || 0) > 0 && selectedAnswer === 'yes' && (
            <div
              style={{
                padding: 16,
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                    Bringing additional guests?
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Allowed: up to {invite?.plusOnesAllowed} additional attendee(s)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={16} color="var(--accent-primary)" />
                  <select
                    value={guestsCount}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      setGuestsCount(count);
                    }}
                    className="form-select"
                    style={{ width: 80, padding: '6px 10px' }}
                  >
                    {Array.from({ length: (invite?.plusOnesAllowed || 0) + 1 }).map((_, i) => (
                      <option key={i} value={i}>
                        {i === 0 ? 'None (0)' : `+${i}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSubmitResponse('yes')}
                  loading={submitting}
                  style={{ width: '100%' }}
                >
                  Update Guest Count ({guestsCount} extra)
                </Button>
              </div>
            </div>
          )}

          {/* Confirmed Entry Pass & QR Code */}
          {selectedAnswer === 'yes' && (
            <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--border-light)' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--success-solid)', fontWeight: 600, fontSize: '0.85rem' }}>
                  <ShieldCheck size={16} /> Your entry badge is ready
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: 4 }}>
                  Fast-Track Check-In QR Pass
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Present this QR code at the registration desk for instant check-in.
                </p>
              </div>

              <QRCodeCard
                url={`${window.location.origin}/rsvp?e=${eventId}&t=${token}`}
                title={`${invite?.name} - Entry Pass`}
                subtitle={`Event: ${event?.title.slice(0, 32)}...`}
                downloadFileName={`${invite?.name.toLowerCase().replace(/\s+/g, '-')}-pass.png`}
              />
            </div>
          )}

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Responses update in real-time on the event organizer's live dashboard.
            </span>
          </div>
        </Card>
      </main>
    </div>
  );
};
