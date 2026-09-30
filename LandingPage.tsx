import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  QrCode,
  BarChart2,
  Users,
  ArrowRight,
  Calendar,
  CheckCircle,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage = () => {
  const { user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Hero Section */}
      <section
        style={{
          padding: '80px 24px 60px 24px',
          background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              backgroundColor: 'var(--accent-primary-light)',
              color: 'var(--accent-primary)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            <Sparkles size={14} />
            <span>Built on Google Cloud &amp; Firebase Real-Time Architecture</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              maxWidth: 860,
              margin: '0 auto 20px auto',
            }}
          >
            Plan events. Track RSVPs. <br />
            <span style={{ color: 'var(--accent-primary)' }}>Stay in control.</span>
          </h1>

          <p
            style={{
              fontSize: '1.15rem',
              color: 'var(--text-secondary)',
              maxWidth: 680,
              margin: '0 auto 36px auto',
              lineHeight: 1.6,
            }}
          >
            Create events, manage invitations, track live responses, control capacity,
            and check in attendees — all from one cloud-powered platform.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 48 }}>
            <Link
              to={user ? (user.role === 'organizer' ? '/organizer/events/create' : '/events') : '/register'}
              className="btn btn-primary btn-lg"
              style={{ boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)' }}
            >
              Create an Event <ArrowRight size={18} />
            </Link>
            <Link to="/events" className="btn btn-secondary btn-lg">
              Explore Events
            </Link>
          </div>

          {/* Hero Visual Card */}
          <div
            style={{
              maxWidth: 900,
              margin: '0 auto',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-lg)',
              padding: '28px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                  Live Event Monitor
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                  Cloud Computing Workshop: Serverless &amp; Microservices
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="live-badge">
                  <span className="live-dot" />
                  Live RSVP updates
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updated just now</span>
              </div>
            </div>

            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Platform</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>Production</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Real-time database</div>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Backend</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>Firebase</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Cloud Functions</div>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Authentication</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>Secure</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Email & password</div>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sync</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>Real-Time</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Sub-second updates</div>
              </div>
            </div>

            {/* Capacity Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                <span>Live Event Status</span>
                <span>Powered by Firestore</span>
              </div>
              <div style={{ height: 8, backgroundColor: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `100%`,
                    backgroundColor: 'var(--accent-primary)',
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section id="features" style={{ padding: '80px 24px', backgroundColor: '#FFFFFF' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>
              Architected for Real-Time Event Management
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto' }}>
              Built specifically to demonstrate cloud database synchronization, serverless transactions,
              and seamless invitation workflows.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28 }}>
            {/* Feature 1 */}
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Zap size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>1. Real-Time RSVP Tracking</h3>
              <p style={{ lineHeight: 1.6 }}>
                Subscribes directly to Firestore snapshot streams via <code>onSnapshot</code>. When an attendee RSVPs on mobile, the organizer's dashboard updates in under 200ms with zero page reloads.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--success-bg)', color: 'var(--success-solid)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <ShieldCheck size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>2. Smart Capacity &amp; Atomic Transactions</h3>
              <p style={{ lineHeight: 1.6 }}>
                Server-side transaction logic prevents overbooking race conditions when multiple users RSVP simultaneously for the final seat. Full events automatically cascade to a FIFO waitlist.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--accent-secondary-light)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <QrCode size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>3. QR-Based Unique Invitations</h3>
              <p style={{ lineHeight: 1.6 }}>
                Every invitee receives a cryptographically secure random token and downloadable QR code. Attendees can RSVP in 1-click without creating a forced user account.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', backgroundColor: '#F3E8FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <BarChart2 size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>4. Organizer Analytics</h3>
              <p style={{ lineHeight: 1.6 }}>
                Visualizes RSVP distributions, response rates, capacity thresholds, and attendance timeline charts powered by Recharts, offering deep insights into audience engagement.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--warning-bg)', color: 'var(--warning-solid)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Users size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>5. On-Site Check-In Station</h3>
              <p style={{ lineHeight: 1.6 }}>
                Staff can look up attendee tokens, scan QR codes, prevent duplicate entries, and log real-time check-in timestamps with instant visual feedback.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', backgroundColor: '#E0E7FF', color: '#4338CA', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Layers size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>6. Cloud-Powered Serverless Pipeline</h3>
              <p style={{ lineHeight: 1.6 }}>
                Built on Firebase Auth (RBAC), Firestore collections, Cloud Storage for event banners, Cloud Functions for atomic validation, and Firebase Hosting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Demonstration Walkthrough Banner */}
      <section style={{ padding: '60px 24px', backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 12 }}>
            Ready for Faculty Evaluation &amp; Technical Interviews
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 28, maxWidth: 680, margin: '0 auto 28px auto' }}>
            Open the Organizer Dashboard in one browser window and the unique RSVP link in an incognito window to witness live synchronized state updates across devices.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link to="/events" className="btn btn-primary btn-lg">
              Explore Events <Calendar size={18} />
            </Link>
            <Link to="/checkin" className="btn btn-secondary btn-lg">
              Check-In Desk <CheckCircle size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '36px 24px', backgroundColor: '#FFFFFF', marginTop: 'auto', borderTop: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="var(--accent-primary)" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>EventFlow</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>— Real-Time Cloud Event Planning &amp; RSVP Tracker</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Google Cloud &amp; Firebase Architecture Portfolio Project
          </div>
        </div>
      </footer>
    </div>
  );
};
