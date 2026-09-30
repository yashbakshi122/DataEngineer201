import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { eventService } from '../../services/eventService';
import { useToast } from '../../components/common/Toast';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { type EventItem } from '../../types';

export const CreateEventPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [loading, setLoading] = useState(false);

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

  const validate = () => {
    if (!title.trim()) {
      error('Event Name is required.');
      return false;
    }
    if (!date) {
      error('Event Date is required.');
      return false;
    }
    if (!startTime || !endTime) {
      error('Start and End times are required.');
      return false;
    }
    if (startTime >= endTime) {
      error('End time must be after start time.');
      return false;
    }
    if (!venue.trim()) {
      error('Venue or location is required.');
      return false;
    }
    const capNum = parseInt(capacity, 10);
    if (isNaN(capNum) || capNum <= 0) {
      error('Capacity must be a positive integer.');
      return false;
    }
    return true;
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (!validate()) return;
    if (!user) {
      error('You must be signed in to create an event.');
      return;
    }

    setLoading(true);
    try {
      const startAt = new Date(`${date}T${startTime}`).toISOString();
      const endAt   = new Date(`${date}T${endTime}`).toISOString();

      // rsvpDeadline: use supplied date or default to 24 h before event start
      const rsvpDeadline = rsvpDeadlineDate
        ? new Date(`${rsvpDeadlineDate}T23:59:59`).toISOString()
        : new Date(new Date(startAt).getTime() - 24 * 3600 * 1000).toISOString();

      // ── Build payload — never send undefined to Firestore ─────────────────
      // Required fields are always present.
      // Optional fields (onlineLink, bannerUrl) are only included when non-empty.
      const payload: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt'> = {
        title:         title.trim(),
        description:   description.trim(),
        eventType,
        startAt,
        endAt,
        venue:         venue.trim(),
        capacity:      parseInt(capacity, 10),
        rsvpDeadline,
        status,
        organizerId:   user.uid,
        organizerName: user.displayName || user.email?.split('@')[0] || 'Organizer',
        // onlineLink and bannerUrl intentionally omitted here — added below if set
      };

      // Conditionally add optional string fields only when the user typed a value
      const trimmedLink   = onlineLink.trim();
      const trimmedBanner = bannerUrl.trim();
      if (trimmedLink)   payload.onlineLink = trimmedLink;
      if (trimmedBanner) payload.bannerUrl  = trimmedBanner;

      const newId = await eventService.createEvent(payload);

      success(status === 'published' ? 'Event published successfully!' : 'Event draft saved!');
      navigate(`/organizer/events/${newId}`);
    } catch (err: unknown) {
      console.error('[CreateEvent]', err);
      error((err as Error).message || 'Failed to save event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="Create Event">
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <button
          onClick={() => navigate('/organizer/events')}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 16 }}
        >
          <ArrowLeft size={16} /> Back to Events
        </button>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Create New Event</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Configure event parameters, venue capacity, and RSVP limits
          </p>
        </div>

        <Card style={{ padding: 32 }}>
          <div className="form-group">
            <Input
              label="Event Title *"
              placeholder="e.g. Cloud Computing & Microservices Workshop"
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
              placeholder="Outline event agenda, speaker details, and attendee prerequisites..."
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

            <Input
              label="Venue / Campus Hall *"
              placeholder="e.g. Main Auditorium, Block 4"
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
              helperText="Enforced atomically by transaction logic"
              required
            />

            <Input
              label="RSVP Deadline Date"
              type="date"
              value={rsvpDeadlineDate}
              onChange={(e) => setRsvpDeadlineDate(e.target.value)}
              helperText="Registration automatically closes after deadline"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Online Meeting Link (Optional)"
              type="url"
              placeholder="https://meet.google.com/..."
              value={onlineLink}
              onChange={(e) => setOnlineLink(e.target.value)}
            />

            <Input
              label="Banner Image URL (Optional)"
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              helperText="Leave empty to use default event banner"
            />
          </div>

          {/* Action Buttons */}
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
              onClick={() => navigate('/organizer/events')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSave('draft')}
              loading={loading}
              icon={<Save size={15} />}
            >
              Save Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleSave('published')}
              loading={loading}
              icon={<Send size={15} />}
            >
              Publish Event
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};
