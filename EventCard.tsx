import { Link } from 'react-router-dom';
import { type EventItem } from '../../types';
import { Card } from './Card';
import { Badge } from './Badge';
import { Calendar, MapPin, Users } from 'lucide-react';

interface EventCardProps {
  event: EventItem;
  goingCount?: number;
  viewUrl?: string;
  actionText?: string;
}

export const EventCard = ({
  event,
  goingCount = 0,
  viewUrl,
  actionText = 'View Event',
}: EventCardProps) => {
  const targetUrl = viewUrl || `/events/${event.id}`;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const e = new Date(endStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${s} – ${e}`;
    } catch {
      return '';
    }
  };

  const getStatusBadgeVariant = (status: EventItem['status']) => {
    switch (status) {
      case 'published': return 'published';
      case 'completed': return 'completed';
      case 'cancelled': return 'cancelled';
      case 'draft': default: return 'draft';
    }
  };

  const capacityPct = Math.min(100, Math.round((goingCount / (event.capacity || 1)) * 100));

  return (
    <Card hoverable style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {event.bannerUrl && (
        <div style={{ margin: '-20px -20px 16px -20px', height: 140, overflow: 'hidden', borderTopLeftRadius: 'var(--radius-md)', borderTopRightRadius: 'var(--radius-md)' }}>
          <img
            src={event.bannerUrl}
            alt={event.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
          {event.eventType}
        </span>
        <Badge variant={getStatusBadgeVariant(event.status)}>
          {event.status}
        </Badge>
      </div>

      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
        <Link to={targetUrl} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
          {event.title}
        </Link>
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
          <span>{formatDate(event.startAt)} • {formatTime(event.startAt, event.endAt)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <MapPin size={15} style={{ color: 'var(--text-muted)' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.venue}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <Users size={15} style={{ color: 'var(--text-muted)' }} />
          <span>Going: <strong>{goingCount}</strong> / {event.capacity} seats</span>
        </div>
      </div>

      {/* Capacity Progress Bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 6, backgroundColor: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${capacityPct}%`,
              backgroundColor: capacityPct >= 90 ? 'var(--warning-solid)' : 'var(--accent-primary)',
              borderRadius: 3,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
        <Link to={targetUrl} className="btn btn-secondary w-full" style={{ width: '100%', textAlign: 'center' }}>
          {actionText}
        </Link>
      </div>
    </Card>
  );
};
