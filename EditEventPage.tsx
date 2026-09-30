import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { eventService } from '../../services/eventService';
import { useToast } from '../../components/common/Toast';
import { ArrowLeft, Save } from 'lucide-react';
import { type EventItem } from '../../types';

export const EditEventPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventItem['eventType']>('Workshop');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('13:00');
  const [venue, setVenue] = useState('');
  const [onlineLink, setOnlineLink] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [rsvpDeadlineDate, setRsvpDeadlineDate] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [status, setStatus] = useState<EventItem['status']>('published');

  useEffect(() => {
    if (!eventId) return;
    eventService.getEvent(eventId).then((ev) => {
      if (!ev) {
        error('Event not found.');
        navigate('/organizer/events');
        return;
      }
      setTitle(ev.title);
      setDescription(ev.description || '');
      setEventType(ev.eventType);
      setVenue(ev.venue);
      setOnlineLink(ev.onlineLink || '');
      setCapacity(ev.capacity.toString());
      setBannerUrl(ev.bannerUrl || '');
      setStatus(ev.status);

      if (ev.startAt) {
        const s = new Date(ev.startAt);
        setDate(s.toISOString().split('T')[0]);
        setStartTime(s.toTimeString().slice(0, 5));
      }
      if (ev.endAt) {
        const e = new Date(ev.endAt);
        setEndTime(e.toTimeString().slice(0, 5));
      }
      if (ev.rsvpDeadline) {
        setRsvpDeadlineDate(new Date(ev.rsvpDeadline).toISOString().split('T')[0]);
      }
      setLoading(false);
    });
  }, [eventId, navigate, error]);

  const handleUpdate = async () => {
    if (!title.trim() || !venue.trim() || !date) {
      error('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    try {
      const startAt = new Date(`${date}T${startTime}`).toISOString();
      const endAt   = new Date(`${date}T${endTime}`).toISOString();

      const rsvpDeadline = rsvpDeadlineDate
        ? new Date(`${rsvpDeadlineDate}T23:59:59`).toISOString()
        : new Date(new Date(startAt).getTime() - 24 * 3600 * 1000).toISOString();

      // ── Build update payload — never send undefined to Firestore ──────────
      const updates: Partial<EventItem> = {
        title:       title.trim(),
        description: description.trim(),
        eventType,
        startAt,
        endAt,
        venue:       venue.trim(),
        capacity:    parseInt(capacity, 10) || 100,
        rsvpDeadline,
        status,
      };

      // Optional fields: include only when non-empty; omit entirely otherwise
      const trimmedLink   = onlineLink.trim();
      const trimmedBanner = bannerUrl.trim();
      if (trimmedLink)   updates.onlineLink = trimmedLink;
      if (trimmedBanner) updates.bannerUrl  = trimmedBanner;

      await eventService.updateEvent(eventId!, updates);

      success('Event updated successfully!');
      navigate(`/organizer/events/${eventId}`);
    } catch (err: unknown) {
      console.error('[EditEvent]', err);
      error((err as Error).message || 'Failed to update event.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Edit Event">
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <LoadingSkeleton height={380} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Edit Event">
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <button
          onClick={() => navigate(`/organizer/events/${eventId}`)}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 16 }}
        >
          <ArrowLeft size={16} /> Back to Event Details
        </button>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Edit Event</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Update event parameters, dates, and capacities
          </p>
        </div>

        <Card style={{ padding: 32 }}>
          <div className="form-group">
            <Input
              label="Event Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Select
              label="Event Type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventItem['eventType'])}
              options={[
                { value: 'Workshop', label: 'Workshop' },
                { value: 'Conference', label: 'Conference' },
                { value: 'College Event', label: 'College Event' },
                { value: 'Seminar', label: 'Seminar' },
                { value: 'Webinar', label: 'Webinar' },
                { value: 'Meetup', label: 'Meetup' },
                { value: 'Other', label: 'Other' },
              ]}
            />

            <Select
              label="Publication Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventItem['status'])}
              options={[
                { value: 'published', label: 'Published (Active RSVPs)' },
                { value: 'draft', label: 'Draft (Hidden from public)' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>

          <div className="form-group">
            <Input
              label="Venue / Campus Hall *"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <Input
              label="Date *"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <Input
              label="Start Time *"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />

            <Input
              label="End Time *"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Maximum Capacity (Seats) *"
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />

            <Input
              label="RSVP Deadline Date"
              type="date"
              value={rsvpDeadlineDate}
              onChange={(e) => setRsvpDeadlineDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Online Meeting Link"
              type="url"
              value={onlineLink}
              onChange={(e) => setOnlineLink(e.target.value)}
            />

            <Input
              label="Banner Image URL"
              type="url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
            />
          </div>

          <div
            style={{
              marginTop: 32,
              paddingTop: 20,
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/organizer/events/${eventId}`)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleUpdate}
              loading={saving}
              icon={<Save size={15} />}
            >
              Save Changes
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};
