import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';

import { Badge } from '../../components/common/Badge';
import { LiveIndicator } from '../../components/common/LiveIndicator';
import { checkinService } from '../../services/checkinService';
import { eventService } from '../../services/eventService';
import { useAuth } from '../../context/AuthContext';
import { type EventItem, type Invitee, type CheckInRecord } from '../../types';
import {
  CheckCircle,
  AlertTriangle,
  QrCode,
  Search,
  Lock,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export const StaffCheckInPage = () => {
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId') || '';
  const navigate = useNavigate();

  const { user, loading: authLoading } = useAuth();
  const { success, error } = useToast();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(urlEventId);
  const [tokenInput, setTokenInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  // Search Results
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

  // Recent check-in feed
  const [recentCheckins, setRecentCheckins] = useState<CheckInRecord[]>([]);

  // ── Auth guard: only authenticated organisers may use this page ──────────
  useEffect(() => {
    if (authLoading) return; // wait for Firebase Auth to initialise
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.role !== 'organizer') {
      // Not an organiser — redirect to a safe landing page
      navigate('/', { replace: true });
      return;
    }
    console.log('[AUTH] Check-In Desk uid:', user.uid, 'email:', user.email, 'role:', user.role);
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'organizer') return; // never fetch until authorised
    eventService.getPublishedEvents().then((evs) => {
      setEvents(evs);
      if (!selectedEventId && evs.length > 0) {
        setSelectedEventId(evs[0].id!);
      }
    });
  }, [selectedEventId, user]);

  useEffect(() => {
    if (!selectedEventId || !user || user.role !== 'organizer') return; // guard: organiser only
    const unsub = checkinService.subscribeEventCheckins(selectedEventId, (checks) => {
      setRecentCheckins(checks);
    });
    return () => unsub();
  }, [selectedEventId, user]);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedEventId) {
      error('Please select an event first.');
      return;
    }
    if (!tokenInput.trim()) {
      error('Please enter an invitation token, email, or scan a QR code.');
      return;
    }

    setSearching(true);
    setCheckInResult(null);

    const res = await checkinService.findAttendee(selectedEventId, tokenInput);
    setFoundAttendee(res);
    setSearching(false);

    if (res.error) {
      error(res.error);
    } else if (res.invite) {
      success(`Found invitation for ${res.invite.name}`);
    }
  };

  const handleExecuteCheckIn = async (method: 'qr' | 'manual' = 'manual') => {
    if (!foundAttendee?.invite || !selectedEventId) return;

    setCheckingIn(true);
    const result = await checkinService.recordCheckIn(selectedEventId, foundAttendee.invite, method);
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
      // Update local state to reflect checked-in status
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

  // Quick helper to simulate a camera QR scan
  const handleSimulateQRScan = (sampleToken: string) => {
    setTokenInput(sampleToken);
    setTimeout(() => {
      checkinService.findAttendee(selectedEventId, sampleToken).then((res) => {
        setFoundAttendee(res);
        if (res.invite) {
          success(`QR Scanned: Found ${res.invite.name}`);
        }
      });
    }, 200);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ── Auth / loading guards ────────────────────────────────── */}
      {(authLoading || !user) && (
        <main style={{ maxWidth: 480, margin: '80px auto', width: '100%', padding: '0 24px', textAlign: 'center' }}>
          <Card style={{ padding: 40 }}>
            <Lock size={36} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-muted)' }}>Verifying identity…</p>
          </Card>
        </main>
      )}

      {!authLoading && user && user.role !== 'organizer' && (
        <main style={{ maxWidth: 480, margin: '80px auto', width: '100%', padding: '0 24px', textAlign: 'center' }}>
          <Card style={{ padding: 40 }}>
            <Lock size={36} style={{ margin: '0 auto 16px', display: 'block', color: 'var(--danger-solid)' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Access Restricted</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              The Check-In Desk is only accessible to event organisers.
            </p>
          </Card>
        </main>
      )}

      {/* ── Main content — only renders for authenticated organisers ── */}
      {!authLoading && user && user.role === 'organizer' && (
      <main style={{ maxWidth: 1000, margin: '40px auto', width: '100%', padding: '0 24px', flex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--success-solid)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle size={18} />
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>On-Site Check-In Desk</h1>
              <LiveIndicator />
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
              Fast validation for attendee QR tokens with duplicate entry prevention
            </p>
          </div>

          {/* Event Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Event:</span>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setFoundAttendee(null);
                setCheckInResult(null);
              }}
              className="form-select"
              style={{ minWidth: 260, fontWeight: 500, backgroundColor: '#FFFFFF' }}
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'flex-start' }}>
          {/* Left Column: Search & Verification Card */}
          <div>
            <Card style={{ padding: 28, boxShadow: 'var(--shadow-md)', marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 16 }}>Validate Attendee Pass</h3>

              <form onSubmit={handleLookup} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search
                    size={18}
                    style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="Enter Token, Email, or paste QR URL..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: 42 }}
                  />
                </div>
                <Button type="submit" variant="primary" loading={searching} icon={<Search size={15} />}>
                  Lookup
                </Button>
              </form>

              {/* Sample Quick-Scan buttons for testing convenience */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
                <QrCode size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Quick QR Simulator:
                </span>
                <button
                  type="button"
                  onClick={() => handleSimulateQRScan('token-aarav-sharma-1234')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                >
                  Scan Aarav
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateQRScan('token-priya-patel-5678')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                >
                  Scan Priya
                </button>
              </div>

              {/* Found Attendee Inspection Box */}
              {foundAttendee?.invite && (
                <div
                  style={{
                    padding: 24,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                        ATTENDEE FOUND
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Event</span>
                      <strong style={{ fontSize: '0.875rem' }}>{foundAttendee.event?.title.slice(0, 30)}...</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Plus-Ones Included</span>
                      <strong style={{ fontSize: '0.875rem' }}>+{foundAttendee.invite.plusOnesCount || 0} guest(s)</strong>
                    </div>
                  </div>

                  {/* Duplicate Check-In Warning */}
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
                        <strong>Already Checked In:</strong> Duplicate check-in prevented. Attendee pass was already redeemed.
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

              {/* Feedback Result Message */}
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
                    fontSize: '0.9rem',
                  }}
                >
                  {checkInResult.status === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  <div>
                    <strong>{checkInResult.message}</strong>
                    {checkInResult.timestamp && (
                      <span style={{ display: 'block', fontSize: '0.75rem', marginTop: 2 }}>
                        Timestamp: {new Date(checkInResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Live Check-in Log */}
          <div>
            <Card style={{ padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Live Check-In Log ({recentCheckins.length})
                </h3>
                <span className="live-badge" style={{ fontSize: '0.7rem' }}>
                  <span className="live-dot" /> Live
                </span>
              </div>

              {recentCheckins.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No attendees checked in yet today. Scan passes to begin.
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
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {chk.attendeeName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Method: {chk.method.toUpperCase()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--success-solid)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12} /> Checked In
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
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
      </main>
      )} {/* end organizer-only block */}
    </div>
  );
};
