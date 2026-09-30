import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LiveIndicator } from '../../components/common/LiveIndicator';
import { checkinService } from '../../services/checkinService';
import { eventService } from '../../services/eventService';
import { type EventItem, type Invitee, type CheckInRecord } from '../../types';
import {
  CheckCircle,
  AlertTriangle,
  QrCode,
  Search,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export const OrganizerCheckInPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { success, error } = useToast();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const [foundAttendee, setFoundAttendee] = useState<{
    invite: Invitee | null;
    event: EventItem | null;
    error?: string;
  } | null>(null);

  const [checkInResult, setCheckInResult] = useState<{
    status: 'success' | 'already' | 'error';
    message: string;
    timestamp?: string;
  } | null>(null);

  const [recentCheckins, setRecentCheckins] = useState<CheckInRecord[]>([]);

  useEffect(() => {
    if (!eventId) return;
    eventService.getEvent(eventId).then((ev) => setEvent(ev));

    const unsub = checkinService.subscribeEventCheckins(eventId, (checks) => {
      setRecentCheckins(checks);
    });
    return () => unsub();
  }, [eventId]);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!eventId || !tokenInput.trim()) {
      error('Please enter a valid token or email.');
      return;
    }

    setSearching(true);
    setCheckInResult(null);

    const res = await checkinService.findAttendee(eventId, tokenInput);
    setFoundAttendee(res);
    setSearching(false);

    if (res.error) {
      error(res.error);
    } else if (res.invite) {
      success(`Found invitation for ${res.invite.name}`);
    }
  };

  const handleExecuteCheckIn = async (method: 'qr' | 'manual' = 'manual') => {
    if (!foundAttendee?.invite || !eventId) return;

    setCheckingIn(true);
    const result = await checkinService.recordCheckIn(eventId, foundAttendee.invite, method);
    setCheckingIn(false);

    if (result.alreadyCheckedIn) {
      setCheckInResult({
        status: 'already',
        message: result.message,
        timestamp: result.checkedInAt,
      });
      error(result.message);
    } else if (result.success) {
      setCheckInResult({
        status: 'success',
        message: result.message,
        timestamp: result.checkedInAt,
      });
      success(result.message);
      setFoundAttendee((prev) =>
        prev && prev.invite ? { ...prev, invite: { ...prev.invite, status: 'checked-in' } } : null
      );
    } else {
      setCheckInResult({
        status: 'error',
        message: result.message,
      });
      error(result.message);
    }
  };

  return (
    <MainLayout title="Organizer Check-In">
      <div style={{ marginBottom: 20 }}>
        <Link to={`/organizer/events/${eventId}`} className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back to Event
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
            Live Check-In Desk
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 2 }}>
            {event?.title || 'Attendee Check-In'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Scan QR passes or look up tokens to validate venue entry and prevent duplicates
          </p>
        </div>
        <LiveIndicator />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'flex-start' }}>
        <div>
          <Card style={{ padding: 28, boxShadow: 'var(--shadow-md)', marginBottom: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 16 }}>Scan or Enter Pass</h3>

            <form onSubmit={handleLookup} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={18}
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="Enter Token, Email, or scan attendee QR..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: 42 }}
                />
              </div>
              <Button type="submit" variant="primary" loading={searching} icon={<Search size={15} />}>
                Verify
              </Button>
            </form>

            {foundAttendee?.invite && (
              <div
                style={{
                  padding: 24,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                      INVITATION VERIFIED
                    </span>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 2 }}>
                      {foundAttendee.invite.name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {foundAttendee.invite.email} • {foundAttendee.invite.role || 'Invitee'}
                    </p>
                  </div>
                  <Badge variant={foundAttendee.invite.status === 'checked-in' ? 'checked-in' : foundAttendee.invite.status === 'yes' ? 'going' : 'maybe'}>
                    {foundAttendee.invite.status}
                  </Badge>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
                  <Users size={16} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.85rem' }}>
                    Guests included with this invitation: <strong>+{foundAttendee.invite.plusOnesCount || 0}</strong>
                  </span>
                </div>

                {foundAttendee.invite.status === 'checked-in' ? (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--warning-bg)',
                      border: '1px solid var(--warning-border)',
                      color: 'var(--warning-text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: '0.875rem',
                    }}
                  >
                    <AlertTriangle size={18} color="var(--warning-solid)" />
                    <span>
                      <strong>Duplicate Entry Blocked:</strong> Attendee was already checked in.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleExecuteCheckIn('manual')}
                      loading={checkingIn}
                      style={{ flex: 1 }}
                      icon={<CheckCircle size={16} />}
                    >
                      Confirm Check-In
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleExecuteCheckIn('qr')}
                      loading={checkingIn}
                      icon={<QrCode size={16} />}
                    >
                      Check In (QR)
                    </Button>
                  </div>
                )}
              </div>
            )}

            {checkInResult && (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: checkInResult.status === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                  border: `1px solid ${checkInResult.status === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
                  color: checkInResult.status === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {checkInResult.status === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                <div>
                  <strong>{checkInResult.message}</strong>
                  {checkInResult.timestamp && (
                    <span style={{ display: 'block', fontSize: '0.75rem', marginTop: 2 }}>
                      Time: {new Date(checkInResult.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Live checked in list */}
        <div>
          <Card style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                Recent Check-Ins ({recentCheckins.length})
              </h3>
              <span className="live-badge" style={{ fontSize: '0.7rem' }}>
                <span className="live-dot" /> Live
              </span>
            </div>

            {recentCheckins.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No attendees have checked in yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
                {recentCheckins.map((chk) => (
                  <div
                    key={chk.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{chk.attendeeName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {chk.method.toUpperCase()} Check-In
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--success-solid)', fontWeight: 600 }}>
                        ✓ Checked In
                      </span>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(chk.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};
