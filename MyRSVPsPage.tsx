import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { QRCodeCard } from '../../components/common/QRCodeCard';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import { inviteService } from '../../services/inviteService';
import { eventService } from '../../services/eventService';
import { type EventItem, type Invitee } from '../../types';
import { type BadgeVariant } from '../../components/common/Badge';
import {
  Calendar,
  MapPin,
  QrCode,
  ArrowRight,
  Ticket,
  CheckCircle,
  HelpCircle,
  XCircle,
  Clock,
  Users,
} from 'lucide-react';

function statusVariant(status: string): BadgeVariant {
  if (status === 'yes')        return 'going';
  if (status === 'maybe')      return 'maybe';
  if (status === 'no')         return 'not-going';
  if (status === 'waitlist')   return 'waitlist';
  if (status === 'checked-in') return 'checked-in';
  return 'draft';
}

function statusLabel(status: string) {
  if (status === 'yes')        return 'Going';
  if (status === 'maybe')      return 'Maybe';
  if (status === 'no')         return 'Not Going';
  if (status === 'waitlist')   return 'Waitlist';
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

const ALL_STATUSES = ['all', 'yes', 'maybe', 'no', 'waitlist', 'pending', 'checked-in'];

export const MyRSVPsPage = () => {
  const { user } = useAuth();

  const [invites, setInvites]     = useState<Invitee[]>([]);
  const [eventMap, setEventMap]   = useState<Record<string, EventItem>>({});
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [activeQR, setActiveQR]   = useState<{ title: string; token: string; eventId: string } | null>(null);

  // ── Subscribe to my invites by email ──────────────────────────────────────
  useEffect(() => {
    if (!user?.email) return;
    const unsub = inviteService.subscribeMyInvites(user.email, (data) => {
      setInvites(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.email]);

  // ── Subscribe to each event for live details ──────────────────────────────
  useEffect(() => {
    if (invites.length === 0) return;
    const ids = [...new Set(invites.map((i) => i.eventId))];
    const unsubscribers: (() => void)[] = [];
    ids.forEach((eid) => {
      unsubscribers.push(
        eventService.subscribeEvent(eid, (ev) => {
          if (ev) setEventMap((prev) => ({ ...prev, [eid]: ev }));
        })
      );
    });
    return () => unsubscribers.forEach((u) => u());
  }, [invites.length]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = filter === 'all'
    ? invites
    : invites.filter((i) => i.status === filter);

  return (
    <MainLayout title="My Event RSVPs">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>My Event RSVPs &amp; Passes</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            All your invitations, RSVP status, and digital entry passes in one place.
          </p>
        </div>
        <Link to="/events" className="btn btn-primary">
          Explore More Events <ArrowRight size={15} />
        </Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textTransform: 'capitalize', borderRadius: 'var(--radius-full)' }}
          >
            {s === 'all' ? `All (${invites.length})` : `${statusLabel(s)} (${invites.filter((i) => i.status === s).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <LoadingSkeleton height={140} count={3} />
      ) : filtered.length === 0 ? (
        <Card style={{ padding: 48, textAlign: 'center' }}>
          <Ticket size={40} style={{ opacity: 0.35, margin: '0 auto 16px', display: 'block' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>
            {invites.length === 0 ? 'No invitations yet' : `No ${statusLabel(filter).toLowerCase()} RSVPs`}
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: '0.875rem' }}>
            {invites.length === 0
              ? 'Event organizers will send invitation links to your email address. Click the link to RSVP and receive your entry pass.'
              : 'Switch the filter above to see other RSVP statuses.'}
          </p>
          <Link to="/events" className="btn btn-primary btn-sm">
            Explore Available Events <ArrowRight size={14} />
          </Link>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map((inv) => {
            const ev = eventMap[inv.eventId];
            const startDate = ev
              ? new Date(ev.startAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
              : '—';
            const startTime = ev
              ? new Date(ev.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              : '';
            const endTime = ev
              ? new Date(ev.endAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              : '';
            const isPast = ev ? new Date(ev.startAt).getTime() < Date.now() : false;
            const deadlinePast = ev?.rsvpDeadline
              ? new Date(ev.rsvpDeadline).getTime() < Date.now()
              : false;

            return (
              <Card key={inv.id} style={{ padding: 24, boxShadow: 'var(--shadow-sm)', opacity: isPast ? 0.75 : 1 }}>
                {/* Top row: title + badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                      {ev?.eventType ?? 'Event'}
                      {isPast && <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>· Past</span>}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                      {ev?.title ?? inv.eventId}
                    </h3>
                  </div>
                  <Badge variant={statusVariant(inv.status)}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <StatusIcon status={inv.status} /> {statusLabel(inv.status)}
                    </span>
                  </Badge>
                </div>

                {/* Event meta */}
                <div style={{ display: 'flex', gap: 20, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 16, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={13} color="var(--accent-primary)" />
                    {startDate}{startTime ? ` · ${startTime}` : ''}{endTime ? ` – ${endTime}` : ''}
                  </span>
                  {ev?.venue && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MapPin size={13} color="var(--accent-primary)" /> {ev.venue}
                    </span>
                  )}
                  {ev?.capacity && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Users size={13} color="var(--accent-primary)" /> Capacity: {ev.capacity}
                    </span>
                  )}
                  {inv.plusOnesCount > 0 && (
                    <span style={{ fontWeight: 600 }}>+{inv.plusOnesCount} guest{inv.plusOnesCount > 1 ? 's' : ''}</span>
                  )}
                  {inv.waitlistPosition && (
                    <span style={{ color: '#7C3AED', fontWeight: 600 }}>
                      Waitlist position #{inv.waitlistPosition}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
                  {/* QR pass for confirmed */}
                  {(inv.status === 'yes' || inv.status === 'checked-in') && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<QrCode size={13} />}
                      onClick={() => setActiveQR({ title: ev?.title ?? inv.eventId, token: inv.token, eventId: inv.eventId })}
                    >
                      View QR Pass
                    </Button>
                  )}

                  {/* Update RSVP via token page */}
                  {!deadlinePast && !isPast && (
                    <Link to={`/rsvp?e=${inv.eventId}&t=${inv.token}`} className="btn btn-secondary btn-sm">
                      {inv.status === 'pending' ? 'Respond to Invite' : 'Update RSVP'}
                    </Link>
                  )}

                  {/* Event page (RSVP buttons inline) */}
                  <Link to={`/events/${inv.eventId}`} className="btn btn-ghost btn-sm">
                    Event Page
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* QR Code Modal */}
      {activeQR && (
        <Modal isOpen={true} onClose={() => setActiveQR(null)} title="Digital Admission Pass">
          <div style={{ textAlign: 'center' }}>
            <QRCodeCard
              url={`${window.location.origin}/rsvp?e=${activeQR.eventId}&t=${activeQR.token}`}
              title={activeQR.title}
              subtitle="Show this code to check-in staff at the venue entrance"
              downloadFileName="event-entry-pass.png"
            />
          </div>
        </Modal>
      )}
    </MainLayout>
  );
};
