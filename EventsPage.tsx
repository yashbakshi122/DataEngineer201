import { useState, useEffect } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { EventCard } from '../../components/common/EventCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { eventService } from '../../services/eventService';
import { type EventItem } from '../../types';
import { Search, Calendar, Filter } from 'lucide-react';

export const EventsPage = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  useEffect(() => {
    const unsub = eventService.subscribeAllPublishedEvents((data) => {
      setEvents(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const eventTypes = ['All', 'Workshop', 'Conference', 'College Event', 'Seminar', 'Webinar', 'Meetup'];

  const filteredEvents = events.filter((ev) => {
    const matchesSearch = ev.title.toLowerCase().includes(search.toLowerCase()) ||
      ev.description.toLowerCase().includes(search.toLowerCase()) ||
      ev.venue.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'All' || ev.eventType === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '40px 24px', flex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Explore Upcoming Events
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: '1rem' }}>
            Discover workshops, technical conferences, and seminars with live RSVP tracking
          </p>
        </div>

        {/* Search & Filters Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 32,
            flexWrap: 'wrap',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search by event title, venue, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 42, backgroundColor: '#FFFFFF' }}
            />
          </div>

          {/* Event Type Filter Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            <Filter size={16} color="var(--text-muted)" style={{ marginRight: 4 }} />
            {eventTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`btn btn-sm ${selectedType === type ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Event Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            <LoadingSkeleton height={320} count={3} />
          </div>
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon={<Calendar size={48} />}
            title="No events found"
            description={
              search
                ? `No events matching "${search}". Try clearing your search filters.`
                : "There are currently no published events available. Check back soon!"
            }
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
