import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Card } from '../components/common/Card';
import { Sparkles, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ maxWidth: 500, margin: '100px auto', padding: '0 24px', textAlign: 'center', width: '100%' }}>
        <Card style={{ padding: 48, boxShadow: 'var(--shadow-md)' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-primary-light)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
            }}
          >
            <Sparkles size={28} />
          </div>

          <h1 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
            404
          </h1>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '12px 0 8px 0' }}>
            Page Not Found
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginBottom: 28, lineHeight: 1.5 }}>
            The page or event link you are trying to reach does not exist or may have been relocated.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button onClick={() => window.history.back()} className="btn btn-secondary">
              <ArrowLeft size={16} /> Go Back
            </button>
            <Link to="/" className="btn btn-primary">
              <Home size={16} /> Home
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
};
