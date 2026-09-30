import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { KpiCard } from '../../components/common/KpiCard';
import { Card } from '../../components/common/Card';
import { LiveIndicator } from '../../components/common/LiveIndicator';
import { EventCard } from '../../components/common/EventCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import { eventService } from '../../services/eventService';
import { rsvpService } from '../../services/rsvpService';
import { inviteService } from '../../services/inviteService';
import { type EventItem, type RSVPRecord, type Invitee } from '../../types';
import {
  Calendar,
  Users,
  CheckCircle2,
  HelpCircle,
  XCircle,
  PlusCircle,
  BarChart3,
  CheckSquare,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export const OrganizerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  useToast(); // keep Toast context active for child components

  const [events, setEvents] = useState<EventItem[]>([]);
  const [allRsvps, setAllRsvps] = useState<RSVPRecord[]>([]);
  const [allInvites, setAllInvites] = useState<Invitee[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to organizer's events
  useEffect(() => {
    if (!user) return;
    const unsub = eventService.subscribeOrganizerEvents(user.uid, (data) => {
      setEvents(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Subscribe to all RSVPs for all organizer's events
  useEffect(() => {
    if (!user || events.length === 0) return;

    const unsubscribers: (() => void)[] = [];

    events.forEach((event) => {
      const unsub = rsvpService.subscribeLiveRSVPs(event.id!, (data) => {
        setAllRsvps((prev) => {
          const filtered = prev.filter((r) => r.eventId !== event.id);
          return [...filtered, ...data];
        });
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [events]);

  // Subscribe to all invites for all organizer's events (needed for totalInvited KPI)
  useEffect(() => {
    if (!user || events.length === 0) return;

    const unsubscribers: (() => void)[] = [];

    events.forEach((event) => {
      const unsub = inviteService.subscribeEventInvites(event.id!, (data) => {
        setAllInvites((prev) => {
          const filtered = prev.filter((inv) => inv.eventId !== event.id);
          return [...filtered, ...data];
        });
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [events]);

  // KPIs - calculated from real Firestore data
  const totalEvents = events.length;
  const upcomingEvents = events.filter((e) => new Date(e.startAt).getTime() > Date.now()).length;
  const totalCapacity = events.reduce((sum, e) => sum + (e.capacity || 0), 0);

  const totalInvited = allInvites.length;                                      // ← declared here
  const totalGoing = allRsvps.filter((r) => r.answer === 'yes').length;
  const totalMaybe = allRsvps.filter((r) => r.answer === 'maybe').length;
  const totalNotGoing = allRsvps.filter((r) => r.answer === 'no').length;
  const totalWaitlist = allRsvps.filter((r) => r.answer === 'waitlist').length;
  const totalResponses = totalGoing + totalMaybe + totalNotGoing + totalWaitlist;
  const availableSeats = Math.max(0, totalCapacity - totalGoing);

  // Recent activities - from actual RSVP records
  const recentActivities = allRsvps
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)
    .map((rsvp, idx) => ({
      id: String(idx),
      text: `${rsvp.name} responded: ${rsvp.answer === 'yes' ? 'Going' : rsvp.answer === 'maybe' ? 'Maybe' : rsvp.answer === 'waitlist' ? 'Waitlist' : 'Not Going'}`,
      time: `${Math.floor((Date.now() - new Date(rsvp.timestamp).getTime()) / 60000)}m ago`,
      type: rsvp.answer as 'yes' | 'maybe' | 'no' | 'waitlist',
    }));

  return (
    <MainLayout title="Organizer Dashboard">
      {/* Greeting Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              Good morning, {user?.displayName || 'Organizer'} 👋
            </h1>
            <LiveIndicator subtext="Updated just now" />
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Here is what is happening across your events and real-time RSVPs today.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/organizer/events/create" className="btn btn-primary">
            <PlusCircle size={16} /> Create Event
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <KpiCard
          title="Total Events"
          value={totalEvents}
          subtitle={`${upcomingEvents} active`}
          icon={<Calendar size={20} />}
          accentColor="var(--accent-primary)"
        />
        <KpiCard
          title="Total Responses"
          value={totalResponses}
          subtitle={totalInvited > 0 ? `${Math.round((totalResponses / totalInvited) * 100)}% response rate` : 'No invites yet'}
          icon={<Users size={20} />}
          accentColor="#0284C7"
        />
        <KpiCard
          title="Confirmed Going"
          value={totalGoing}
          subtitle="Seats reserved"
          icon={<CheckCircle2 size={20} />}
          accentColor="var(--success-solid)"
        />
        <KpiCard
          title="Maybe"
          value={totalMaybe}
          subtitle="Follow-up needed"
          icon={<HelpCircle size={20} />}
          accentColor="var(--warning-solid)"
        />
        <KpiCard
          title="Not Going"
          value={totalNotGoing}
          subtitle="Seats freed"
          icon={<XCircle size={20} />}
          accentColor="var(--danger-solid)"
        />
        <KpiCard
          title="Available Seats"
          value={availableSeats}
          subtitle="Across active venues"
          icon={<Activity size={20} />}
          accentColor="#8B5CF6"
        />
      </div>

      {/* Main Grid: Upcoming Events & Live Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Left Column: Upcoming Events */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Upcoming Events</h3>
            <Link to="/organizer/events" style={{ fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              View all ({events.length}) <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <LoadingSkeleton height={180} count={2} />
          ) : events.length === 0 ? (
            <EmptyState
              icon={<Calendar size={42} />}
              title="You haven't created any events yet"
              description="Create your first event to start inviting guests and receiving real-time RSVPs."
              actionText="+ Create Your First Event"
              onAction={() => navigate('/organizer/events/create')}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {events.slice(0, 4).map((ev) => {
                const eventRsvps = allRsvps.filter((r) => r.eventId === ev.id);
                const eventGoing = eventRsvps.filter((r) => r.answer === 'yes').length;
                return (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    goingCount={eventGoing}
                    viewUrl={`/organizer/events/${ev.id}`}
                    actionText="Manage Event"
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Live Activity & Quick Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Live Activity Feed */}
          <Card style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} color="var(--accent-primary)" />
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Real-Time Activity</h4>
              </div>
              <LiveIndicator />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {recentActivities.length > 0 ? (
                recentActivities.map((act) => (
                  <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.85rem' }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        marginTop: 6,
                        backgroundColor:
                          act.type === 'yes'
                            ? 'var(--success-solid)'
                            : act.type === 'waitlist'
                            ? '#8B5CF6'
                            : act.type === 'maybe'
                            ? 'var(--warning-solid)'
                            : 'var(--danger-solid)',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.4 }}>{act.text}</p>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{act.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>No recent activity</p>
              )}
            </div>
          </Card>

          {/* Quick Actions Shortcuts */}
          <Card style={{ padding: 20, backgroundColor: 'var(--bg-subtle)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>Organizer Toolset</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/organizer/events/create" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                <PlusCircle size={15} color="var(--accent-primary)" /> Create New Event
              </Link>
              <Link to="/organizer/analytics" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                <BarChart3 size={15} color="var(--accent-primary)" /> Event Analytics &amp; Reports
              </Link>
              <Link to="/checkin" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                <CheckSquare size={15} color="var(--success-solid)" /> Launch Check-In Desk
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};
