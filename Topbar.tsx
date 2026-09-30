import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { LogOut, User, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  onToggleSidebar?: () => void;
  title?: string;
}

export const Topbar = ({ onToggleSidebar, title }: TopbarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      style={{
        height: 64,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="btn-icon"
            style={{ display: 'flex', border: 'none' }}
            aria-label="Toggle navigation"
          >
            <Menu size={20} />
          </button>
        )}
        {title && (
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {title}
          </h2>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <NotificationDropdown />

        <div style={{ height: 24, width: 1, backgroundColor: 'var(--border-light)' }} />

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'var(--accent-primary-light)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User size={18} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {user.displayName || user.email?.split('@')[0] || 'User'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {user.role || 'Member'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="btn-icon"
              title="Sign Out"
              aria-label="Sign Out"
              style={{ marginLeft: 6 }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button onClick={() => navigate('/login')} className="btn btn-secondary btn-sm">
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
