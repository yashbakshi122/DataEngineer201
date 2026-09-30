import { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { type NotificationItem } from '../../types';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export const NotificationDropdown = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = notificationService.subscribeUserNotifications(user.uid, (data) => {
      setNotifications(data);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.uid);
  };

  const handleMarkRead = async (id?: string) => {
    if (!id) return;
    await notificationService.markAsRead(id);
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-icon"
        style={{ position: 'relative' }}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              backgroundColor: 'var(--danger-solid)',
              borderRadius: '50%',
            }}
          />
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 340,
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    backgroundColor: 'var(--accent-primary-light)',
                    color: 'var(--accent-primary)',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 600,
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                You're all caught up!
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkRead(item.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: item.read ? '#FFFFFF' : '#F8FAFC',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {item.message}
                  </p>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-light)', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
            <Link
              to={user?.role === 'organizer' ? '/organizer/events' : '/attendee/notifications'}
              onClick={() => setIsOpen(false)}
              style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              View all notifications <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
