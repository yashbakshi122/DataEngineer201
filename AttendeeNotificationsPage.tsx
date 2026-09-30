import { useState, useEffect } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { type NotificationItem } from '../../types';
import {
  Bell,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  Megaphone,
  Check,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export const AttendeeNotificationsPage = () => {
  const { user } = useAuth();
  const { success } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = notificationService.subscribeUserNotifications(user.uid, (data) => {
      // If user has no notifications yet, supply initial demo notification items
      if (data.length === 0) {
        setNotifications([
          {
            id: 'notif-1',
            userId: user.uid,
            type: 'RSVP_CONFIRMED',
            title: 'RSVP Confirmed!',
            message: 'Your registration for Cloud Computing Workshop has been confirmed (+1 guest included).',
            read: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'notif-2',
            userId: user.uid,
            type: 'ANNOUNCEMENT',
            title: 'Workshop Prerequisites Released',
            message: 'Please ensure you have Git and Node.js installed before attending next Saturday.',
            read: false,
            createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
          },
          {
            id: 'notif-3',
            userId: user.uid,
            type: 'EVENT_REMINDER',
            title: 'Upcoming Event in 3 Days',
            message: 'Reminder: Cloud Computing & Microservices starts at 10:00 AM in the Auditorium.',
            read: true,
            createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          },
        ]);
      } else {
        setNotifications(data);
      }
    });

    return () => unsub();
  }, [user]);

  const handleMarkAll = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    success('All notifications marked as read.');
  };

  const handleMarkSingle = async (id?: string) => {
    if (!id) return;
    await notificationService.markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'RSVP_CONFIRMED': return <CheckCircle2 size={18} color="var(--success-solid)" />;
      case 'VENUE_CHANGED': return <MapPin size={18} color="var(--accent-primary)" />;
      case 'TIME_CHANGED': return <Clock size={18} color="var(--warning-solid)" />;
      case 'ANNOUNCEMENT': return <Megaphone size={18} color="var(--accent-primary)" />;
      default: return <Calendar size={18} color="var(--accent-primary)" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <MainLayout title="Notification Center">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Notification Center</h1>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--accent-primary-light)',
                  color: 'var(--accent-primary)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {unreadCount} unread
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Real-time confirmations, schedule alerts, and organizer announcements
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={handleMarkAll} icon={<Check size={14} />}>
            Mark All as Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={48} />}
          title="You're all caught up!"
          description="No notifications right now. Any RSVP confirmations or event updates will appear here in real-time."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.map((item) => (
            <Card
              key={item.id}
              onClick={() => handleMarkSingle(item.id)}
              style={{
                padding: 18,
                backgroundColor: item.read ? '#FFFFFF' : '#F8FAFC',
                borderLeft: item.read ? '1px solid var(--border-light)' : '4px solid var(--accent-primary)',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: item.read ? 'var(--bg-subtle)' : 'var(--accent-primary-light)',
                  flexShrink: 0,
                }}
              >
                {getIcon(item.type)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <h4 style={{ fontSize: '0.975rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.title}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  {item.message}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </MainLayout>
  );
};
