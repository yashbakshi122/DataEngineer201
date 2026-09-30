import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar = () => {
  const { user } = useAuth();

  return (
    <header
      style={{
        height: 70,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-light)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
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
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'block' }}>
              EventFlow
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <Link
            to="/events"
            style={{ fontSize: '0.925rem', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }}
          >
            Explore Events
          </Link>
          <Link
            to="/checkin"
            style={{ fontSize: '0.925rem', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }}
          >
            Check-In Desk
          </Link>
          <a
            href="#features"
            style={{ fontSize: '0.925rem', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }}
          >
            Cloud Architecture
          </a>
        </nav>

        {/* Auth CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <Link
              to={user.role === 'organizer' ? '/organizer' : '/attendee'}
              className="btn btn-primary"
            >
              <User size={16} />
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary">
                Get Started <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
