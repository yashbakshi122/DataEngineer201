import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { eventService } from '../../services/eventService';
import { type EventItem } from '../../types';
import {
  Calendar,
  Search,
  PlusCircle,
  Users,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export const OrganizerEventsPage = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Cancel dialog
  const [cancelEventId, setCancelEventId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = eventService.subscribeOrganizerEvents(user.uid, (data) => {
      if (data.length === 0) {
        eventService.getPublishedEvents().then((allEvents) => {
          setEvents(allEvents);
          setLoading(false);
        });
      } else {
        setEvents(data);
        setLoading(false);
      }
    });

    return () => unsub();
  }, [user]);

  const handleConfirmCancel = async () => {
    if (!cancelEventId) return;
    setCancelling(true);
    try {
      await eventService.cancelEvent(cancelEventId);
      success('Event cancelled successfully.');
      setEvents((prev) =>
        prev.map((e) => (e.id === cancelEventId ? { ...e, status: 'cancelled' } : e))
      );
    } catch {
      error('Failed to cancel event.');
    } finally {
      setCancelling(false);
      setCancelEventId(null);
    }
  };

  const filtered = events.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <MainLayout title="Event Management">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Events Directory</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Manage schedules, invitations, attendee capacities, and event publications
          </p>
        </div>
        <Link to="/organizer/events/create" className="btn btn-primary">
          <PlusCircle size={16} /> Create New Event
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          marginBottom: 24,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by title or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 42, backgroundColor: '#FFFFFF' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'published', 'draft', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Events Table */}
      {loading ? (
        <LoadingSkeleton height={60} count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar size={48} />}
          title="No events found"
          description={search ? `No events match "${search}".` : "You haven't created any events yet."}
          actionText={search ? undefined : "+ Create Your First Event"}
          onAction={() => (window.location.href = '/organizer/events/create')}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Type</th>
                <th>Date &amp; Time</th>
                <th>Venue</th>
                <th>Capacity</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      <Link to={`/organizer/events/${item.id}`} style={{ color: 'inherit' }}>
                        {item.title}
                      </Link>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {item.eventType}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem' }}>
                      {new Date(item.startAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{item.venue}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.capacity}</span>
                  </td>
                  <td>
                    <Badge variant={item.status === 'published' ? 'published' : item.status === 'cancelled' ? 'cancelled' : 'draft'}>
                      {item.status}
                    </Badge>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <Link
                        to={`/organizer/events/${item.id}/invites`}
                        className="btn-icon"
                        title="Manage Invites & Tokens"
                      >
                        <Users size={15} />
                      </Link>
                      <Link
                        to={`/organizer/events/${item.id}`}
                        className="btn-icon"
                        title="View Event Details"
                      >
                        <Eye size={15} />
                      </Link>
                      <Link
                        to={`/organizer/events/${item.id}/edit`}
                        className="btn-icon"
                        title="Edit Event"
                      >
                        <Edit size={15} />
                      </Link>
                      {item.status !== 'cancelled' && (
                        <button
                          onClick={() => setCancelEventId(item.id || null)}
                          className="btn-icon"
                          title="Cancel Event"
                          style={{ color: 'var(--danger-solid)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialog for Event Cancellation */}
      <ConfirmDialog
        isOpen={!!cancelEventId}
        onClose={() => setCancelEventId(null)}
        onConfirm={handleConfirmCancel}
        loading={cancelling}
        title="Cancel This Event?"
        message="Are you sure you want to cancel this event? Existing confirmed attendees will be alerted and public RSVP submissions will be blocked."
        confirmText="Yes, Cancel Event"
        variant="danger"
      />
    </MainLayout>
  );
};
