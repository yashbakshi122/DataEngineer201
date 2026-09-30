import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useToast } from '../../components/common/Toast';
import { Sparkles, ArrowRight } from 'lucide-react';
import { type UserRole } from '../../types';

// ─── Friendly messages for every Firebase Auth error code ────────────────────
function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Please try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return ''; // user dismissed — show nothing
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups for this site.';
    default:
      return '';
  }
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const { error: showError, success } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ─── Helper: write or merge the Firestore user profile ───────────────────
  // Separated so it can fail without aborting the login redirect.
  const ensureUserProfile = async (
    uid: string,
    displayName: string | null,
    userEmail: string | null,
    defaultRole: UserRole
  ): Promise<UserRole> => {
    const ref = doc(db, 'users', uid);
    console.log('[AUTH] Reading Firestore profile for uid:', uid);

    const snap = await getDoc(ref);

    if (snap.exists()) {
      console.log('[AUTH] Profile exists, role:', snap.data().role);
      return (snap.data().role as UserRole) ?? defaultRole;
    }

    // Profile missing — create it
    console.log('[AUTH] Profile not found, creating with role:', defaultRole);
    await setDoc(ref, {
      uid,
      name: displayName ?? '',
      email: userEmail ?? '',
      role: defaultRole,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('[AUTH] Profile created successfully');
    return defaultRole;
  };

  // ─── Google Sign-In ────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    console.log('[AUTH] Google login started');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log('[AUTH] Google auth success, uid:', user.uid);

      let role: UserRole = 'attendee';
      try {
        // Default Google logins to 'attendee' unless they already have a profile
        role = await ensureUserProfile(user.uid, user.displayName, user.email, 'attendee');
      } catch (firestoreErr: unknown) {
        // Firestore write failed (likely rules not deployed yet) — log but
        // do NOT block the user from reaching their dashboard.
        const fc = (firestoreErr as { code?: string }).code;
        console.error('[AUTH] Firestore profile error:', fc, firestoreErr);
        if (fc === 'permission-denied') {
          showError(
            'Sign-in succeeded but your Firestore rules need to be published. ' +
            'Run: firebase login  then  npm run deploy:rules'
          );
        }
        // Still redirect — Auth is valid even if profile write failed
      }

      console.log('[AUTH] Redirecting to dashboard, role:', role);
      success(`Welcome, ${user.displayName ?? 'back'}!`);
      navigate(role === 'organizer' ? '/organizer' : '/attendee');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      console.error('[AUTH] Google auth error:', code, err);
      const msg = authErrorMessage(code);
      if (msg) showError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── Email / Password Sign-In ──────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    console.log('[AUTH] Email login started');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      console.log('[AUTH] Email auth success, uid:', user.uid);

      let role: UserRole = 'attendee';
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          role = (snap.data().role as UserRole) ?? 'attendee';
          console.log('[AUTH] Profile found, role:', role);
        } else {
          console.warn('[AUTH] No Firestore profile found for uid:', user.uid);
        }
      } catch (firestoreErr: unknown) {
        const fc = (firestoreErr as { code?: string }).code;
        console.error('[AUTH] Firestore read error:', fc, firestoreErr);
        if (fc === 'permission-denied') {
          showError(
            'Sign-in succeeded but Firestore rules need to be published. ' +
            'Run: firebase login  then  npm run deploy:rules'
          );
        }
      }

      console.log('[AUTH] Redirecting, role:', role);
      success('Welcome back!');
      navigate(role === 'organizer' ? '/organizer' : '/attendee');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      console.error('[AUTH] Email auth error:', code, err);
      const msg = authErrorMessage(code);
      showError(msg || 'Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-primary)', color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)',
            }}>
              <Sparkles size={22} />
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>EventFlow</span>
          </Link>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4 }}>Sign in to your account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
            Access real-time event dashboards and RSVP tracking
          </p>
        </div>

        <Card style={{ padding: 32, boxShadow: 'var(--shadow-md)' }}>

          {/* ── Google button ── */}
          <Button
            type="button"
            variant="ghost"
            loading={googleLoading}
            onClick={handleGoogleLogin}
            style={{ width: '100%', marginBottom: 16, border: '1.5px solid var(--border-light)', gap: 10 }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </Button>

          {/* ── Divider ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-light)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>or sign in with email</span>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-light)' }} />
          </div>

          {/* ── Email / Password ── */}
          <form onSubmit={handleLogin}>
            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ width: '100%', marginTop: 8 }}
            >
              Sign In <ArrowRight size={16} />
            </Button>
          </form>
        </Card>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
};
