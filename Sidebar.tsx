import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  PlusCircle,
  BarChart3,
  CheckSquare,
  Bell,
  Ticket,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ isOpen = true }: SidebarProps) => {
  const { user } = useAuth();
  const isOrganizer = user?.role === 'organizer';

  const organizerLinks = [
    { to: '/organizer', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
    { to: '/organizer/events', label: 'Events', icon: <Calendar size={18} /> },
    { to: '/organizer/events/create', label: 'Create Event', icon: <PlusCircle size={18} /> },
    { to: '/organizer/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { to: '/checkin', label: 'Check-In Station', icon: <CheckSquare size={18} /> },
    { to: '/attendee/notifications', label: 'Notifications', icon: <Bell size={18} /> },
  ];

  const attendeeLinks = [
    { to: '/attendee', label: 'My Dashboard', icon: <LayoutDashboard size={18} />, end: true },
    { to: '/events', label: 'Explore Events', icon: <Calendar size={18} /> },
    { to: '/attendee/rsvps', label: 'My RSVPs', icon: <Ticket size={18} /> },
    { to: '/attendee/notifications', label: 'Notifications', icon: <Bell size={18} /> },
  ];

  const links = isOrganizer ? organizerLinks : attendeeLinks;

  return (
    <aside
      style={{
        width: 260,
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        transition: 'transform 0.2s ease',
      }}
      className={!isOpen ? 'sidebar-closed' : ''}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--accent-primary)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
          }}
        >
          <Sparkles size={20} />
        </div>
        <div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'block' }}>
            EventFlow
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginTop: -2 }}>
            Real-Time Cloud Events
          </span>
        </div>
      </div>

      {/* Role Indicator Banner */}
      <div style={{ padding: '12px 24px', backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            PORTAL ROLE
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              backgroundColor: isOrganizer ? 'var(--accent-primary-light)' : 'var(--success-bg)',
              color: isOrganizer ? 'var(--accent-primary)' : 'var(--success-text)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {user?.role || 'Attendee'}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'var(--transition)',
              backgroundColor: isActive ? 'var(--accent-primary-light)' : 'transparent',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
            })}
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer / Quick Info */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-light)',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Connected to <strong>Cloud Firestore</strong> &amp; <strong>Functions</strong>
        </div>
      </div>
    </aside>
  );
};
