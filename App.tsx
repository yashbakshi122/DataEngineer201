import { type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { EventsPage } from './pages/events/EventsPage';
import { EventDetailsPage } from './pages/events/EventDetailsPage';
import { RSVPPage } from './pages/rsvp/RSVPPage';
import { StaffCheckInPage } from './pages/checkin/StaffCheckInPage';

// Organizer Pages
import { OrganizerDashboard } from './pages/organizer/OrganizerDashboard';
import { OrganizerEventsPage } from './pages/organizer/OrganizerEventsPage';
import { CreateEventPage } from './pages/organizer/CreateEventPage';
import { EditEventPage } from './pages/organizer/EditEventPage';
import { InviteManagementPage } from './pages/organizer/InviteManagementPage';
import { AnalyticsPage } from './pages/organizer/AnalyticsPage';
import { OrganizerCheckInPage } from './pages/organizer/OrganizerCheckInPage';

// Attendee Pages
import { AttendeeDashboard } from './pages/attendee/AttendeeDashboard';
import { MyRSVPsPage } from './pages/attendee/MyRSVPsPage';
import { AttendeeNotificationsPage } from './pages/attendee/AttendeeNotificationsPage';

import { NotFoundPage } from './pages/NotFoundPage';

// Protected Route Component
const ProtectedRoute = ({
  children,
  allowedRole,
}: {
  children: ReactNode;
  allowedRole?: 'organizer' | 'attendee';
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Loading EventFlow...</span>
      </div>
    );
  }

  // For demonstration convenience, allow access even if role is being assigned
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role && user.role !== allowedRole) {
    // If attendee tries to access organizer route, redirect gracefully
    if (allowedRole === 'organizer' && user.role === 'attendee') {
      return <Navigate to="/attendee" replace />;
    }
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:eventId" element={<EventDetailsPage />} />
            <Route path="/rsvp" element={<RSVPPage />} />
            <Route path="/checkin" element={<StaffCheckInPage />} />

            {/* Organizer Routes */}
            <Route
              path="/organizer"
              element={
                <ProtectedRoute allowedRole="organizer">
                  <OrganizerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/events"
              element={
                <ProtectedRoute allowedRole="organizer">
                  <OrganizerEventsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/create"
              element={
                <ProtectedRoute allowedRole="organizer">
                  <CreateEventPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/:eventId"
              element={
                <ProtectedRoute allowedRole="organizer">
                  <EventDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/:eventId/edit"
              element={
                <ProtectedRoute allowedRole="organizer">
                  <EditEventPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/:eventId/invites"
              element={
                <ProtectedRoute allowedRole="organizer">
                  <InviteManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/:eventId/analytics"
              element={
                <ProtectedRoute allowedRole="organizer">
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/:eventId/checkin"
              element={
                <ProtectedRoute allowedRole="organizer">
                  <OrganizerCheckInPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/analytics"
              element={
                <ProtectedRoute allowedRole="organizer">
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />

            {/* Attendee Routes */}
            <Route
              path="/attendee"
              element={
                <ProtectedRoute allowedRole="attendee">
                  <AttendeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendee/events"
              element={
                <ProtectedRoute allowedRole="attendee">
                  <EventsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendee/rsvps"
              element={
                <ProtectedRoute allowedRole="attendee">
                  <MyRSVPsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendee/notifications"
              element={
                <ProtectedRoute allowedRole="attendee">
                  <AttendeeNotificationsPage />
                </ProtectedRoute>
              }
            />

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}
