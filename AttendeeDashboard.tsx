import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { KpiCard } from '../../components/common/KpiCard';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { QRCodeCard } from '../../components/common/QRCodeCard';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import { inviteService } from '../../services/inviteService';
import { eventService } from '../../services/eventService';
import { announcementService } from '../../services/announcementService';
import { type EventItem, type Invitee, type Announcement } from '../../types';
import { type BadgeVariant } from '../../components/common/Badge';
import {
  Calendar,
  Ticket,
  Bell,
  CheckCircle,
  QrCode,
  ArrowRight,
  Megaphone,
  Clock,
  HelpCircle,
  XCircle,
  MapPin,
} from 'lucide-react';

// ── Helper: badge variant from invite/RSVP status ─────────────────────────────
function statusVariant(status: string): BadgeVariant {
  if (status === 'yes')        return 'going';
  if (status === 'maybe')      return 'maybe';
  if (status === 'no')         return 'not-going';
  if (status === 'waitlist')   return 'waitlist';
  if (status === 'checked-in') return 'checked-in';
  return 'draft';
}

function statusLabel(status: string): string {
  if (status === 'yes')      return 'Going';
  if (status === 'maybe')    return 'Maybe';
  if (status === 'no')       return 'Not Going';
  if (status === 'waitlist') return 'Waitlist';
  if (status === 'checked-in') return 'Checked In';
  return 'Pending';
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'yes' || status === 'checked-in') return <CheckCircle size={14} color="var(--success-solid)" />;
  if (status === 'maybe')   return <HelpCircle size={14} color="var(--warning-solid)" />;
  if (status === 'no')      return <XCircle    size={14} color="var(--danger-solid)"  />;
  if (status === 'waitlist') return <Clock     size={14} color="#7C3AED" />;
  return null;
}

export const AttendeeDashboard = () => {
  const { user } = useAuth();

  // ── Real Firestore state ───────────────────────────────────────────────────
  const [invites, setInvites]           = useState<Invitee[]>([]);
  const [eventMap, setEventMap]         = useState<Record<string, EventItem>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [activeQRPass, setActiveQRPass] = useState<{ event: EventItem; token: string } | null>(null);

  // Subscribe to all invites for this attendee (by email)
  useEffect(() => {
    if (!user?.email) return;
    const unsub = inviteService.subscribeMyInvites(user.email, (data) => {
      setInvites(data);
      setLoadingInvites(false);
    });
    return () => unsub();
  }, [user?.email]);

  // When invites arrive, fetch each event document once (and subscribe)
  useEffect(() => {
    if (invites.length === 0) return;
    const eventIds = [...new Set(invites.map((i) => i.eventId))];
    const unsubscribers: (() => void)[] = [];

    eventIds.forEach((eid) => {
      const unsub = eventService.subscribeEvent(eid, (ev) => {
        if (ev) {
          setEventMap((prev) => ({ ...prev, [eid]: ev }));
        }
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((u) => u());
  }, [invites.length]); // re-run only when the number of invites changes

  // Recent announcements across all invited events
  useEffect(() => {
    announcementService.getRecentAnnouncements(5).then(setAnnouncements);
  }, []);

  // ── Derived KPI counts from real data ─────────────────────────────────────
  const goingCount     = invites.filter((i) => i.status === 'yes' || i.status === 'checked-in').length;
  const maybeCount     = invites.filter((i) => i.status === 'maybe').length;
  const upcomingEvents = invites.filter((i) => {
    const ev = eventMap[i.eventId];
    return ev && new Date(ev.startAt).getTime() > Date.now() && ev.status === 'published';
  }).length;

  return (
    <MainLayout title="Attendee Portal">
      {/* Welcome banner */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
          Welcome back, {user?.displayName || 'Attendee'} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          Your personal event dashboard — invitations, RSVPs, and live announcements all in one place.
        </p>
      </div>

      {/* KPI Stats — all from real Firestore data */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <KpiCard
          title="My Invitations"
          value={invites.length}
          subtitle="Total events invited to"
          icon={<Ticket size={20} />}
          accentColor="var(--accent-primary)"
        />
        <KpiCard
          title="Going"
          value={goingCount}
          subtitle="Confirmed attendance"
          icon={<CheckCircle size={20} />}
          accentColor="var(--success-solid)"
        />
        <KpiCard
          title="Maybe"
          value={maybeCount}
          subtitle="Awaiting decision"
          icon={<HelpCircle size={20} />}
          accentColor="var(--warning-solid)"
        />
        <KpiCard
          title="Upcoming Events"
          value={upcomingEvents}
          subtitle="Yet to take place"
          icon={<Calendar size={20} />}
          accentColor="#0284C7"
        />
        <KpiCard
          title="Announcements"
          value={announcements.length}
          subtitle="Latest organizer updates"
          icon={<Bell size={20} />}
          accentColor="#8B5CF6"
        />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginBottom: 32 }}>

        {/* ── Left: My Invited Events ────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>My Invitations &amp; RSVPs</h3>
            <Link to="/attendee/rsvps" style={{ fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {loadingInvites ? (
            <LoadingSkeleton height={120} count={3} />
          ) : invites.length === 0 ? (
            <Card style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Ticket size={32} style={{ opacity: 0.4, margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontWeight: 600, marginBottom: 8 }}>No invitations yet</p>
              <p style={{ fontSize: '0.875rem', marginBottom: 20 }}>
                Event organizers will send you invitation links via email. Click the link to RSVP and receive your digital pass.
              </p>
              <Link to="/events" className="btn btn-primary btn-sm">
                Explore Available Events <ArrowRight size={14} />
              </Link>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {invites.slice(0, 5).map((inv) => {
                const ev = eventMap[inv.eventId];
                const dateStr = ev
                  ? new Date(ev.startAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  : '—';
                const timeStr = ev
                  ? new Date(ev.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  : '';

                return (
                  <Card key={inv.id} style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{
                          fontSize: '0.975rem', fontWeight: 700, color: 'var(--text-primary)',
                          margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {ev?.title ?? inv.eventId}
                        </h4>
                      </div>
                      <Badge variant={statusVariant(inv.status)}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <StatusIcon status={inv.status} /> {statusLabel(inv.status)}
                        </span>
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', gap: 16, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 14, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Calendar size={13} color="var(--text-muted)" />
                        {dateStr}{timeStr ? ` · ${timeStr}` : ''}
                      </span>
                      {ev?.venue && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <MapPin size={13} color="var(--text-muted)" /> {ev.venue}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {/* Go to RSVP page */}
                      <Link
                        to={`/rsvp?e=${inv.eventId}&t=${inv.token}`}
                        className="btn btn-secondary btn-sm"
                      >
                        {inv.status === 'pending' ? 'Respond to Invite' : 'Update RSVP'}
                      </Link>

                      {/* View event details */}
                      <Link to={`/events/${inv.eventId}`} className="btn btn-ghost btn-sm">
                        Event Details
                      </Link>

                      {/* QR pass when confirmed */}
                      {(inv.status === 'yes' || inv.status === 'checked-in') && ev && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<QrCode size={13} />}
                          onClick={() => setActiveQRPass({ event: ev, token: inv.token })}
                        >
                          QR Pass
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}

              {invites.length > 5 && (
                <Link
                  to="/attendee/rsvps"
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'center' }}
                >
                  View all {invites.length} invitations <ArrowRight size={13} />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Announcements ───────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Megaphone size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Live Announcements</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {announcements.length === 0 ? (
              <Card style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                You're all caught up. No announcements right now.
              </Card>
            ) : (
              announcements.map((ann) => (
                <Card key={ann.id} style={{ padding: 18, borderLeft: '4px solid var(--accent-primary)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', display: 'block', marginBottom: 2 }}>
                    {ann.eventTitle || 'Event Update'}
                  </span>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>{ann.title}</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {ann.message}
                  </p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: 8 }}>
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </span>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* QR Pass Modal */}
      {activeQRPass && (
        <Modal
          isOpen={true}
          onClose={() => setActiveQRPass(null)}
          title="Digital Admission Pass"
        >
          <div style={{ textAlign: 'center' }}>
            <QRCodeCard
              url={`${window.location.origin}/rsvp?e=${activeQRPass.event.id}&t=${activeQRPass.token}`}
              title={activeQRPass.event.title}
              subtitle="Present this QR code at event check-in"
              downloadFileName="event-entry-pass.png"
            />
          </div>
        </Modal>
      )}
    </MainLayout>
  );
};
