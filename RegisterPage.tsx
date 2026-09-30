import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useToast } from '../../components/common/Toast';
import { Sparkles, ArrowRight } from 'lucide-react';
import { type UserRole } from '../../types';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { error: showError, success } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('organizer');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ─── Helper: write or merge the Firestore user profile ───────────────────
  const writeUserProfile = async (
    uid: string,
    displayName: string,
    userEmail: string,
    userRole: UserRole
  ): Promise<void> => {
    console.log('[AUTH] Writing Firestore profile, uid:', uid, 'role:', userRole);
    await setDoc(
      doc(db, 'users', uid),
      {
        uid,
        name: displayName,
        email: userEmail,
        role: userRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }   // safe for both new and existing docs
    );
    console.log('[AUTH] Firestore profile write success');
  };

  // ─── Google Sign-Up ────────────────────────────────────────────────────────
  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    console.log('[AUTH] Google register started, selected role:', role);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log('[AUTH] Google auth success, uid:', user.uid);

      try {
        // Check if profile already exists (returning user)
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          // Already has a profile — just redirect
          const existingRole = (snap.data().role as UserRole) ?? role;
          console.log('[AUTH] Existing profile found, role:', existingRole);
          success(`Welcome back, ${user.displayName}!`);
          navigate(existingRole === 'organizer' ? '/organizer' : '/attendee');
          return;
        }

        // New user — write profile with the role they selected on this page
        await writeUserProfile(
          user.uid,
          user.displayName ?? '',
          user.email ?? '',
          role
        );
        success(`Account created! Welcome, ${user.displayName}.`);
        navigate(role === 'organizer' ? '/organizer' : '/attendee');
      } catch (firestoreErr: unknown) {
        const fc = (firestoreErr as { code?: string }).code;
        console.error('[AUTH] Firestore profile error:', fc, firestoreErr);
        if (fc === 'permission-denied') {
          // Auth worked — still let them in, but warn about rules
          showError(
            'Account created in Firebase Auth, but Firestore rules need to be published. ' +
            'Run: firebase login  then  npm run deploy:rules'
          );
          navigate(role === 'organizer' ? '/organizer' : '/attendee');
        } else {
          showError('Account created but profile save failed. Please try signing in.');
        }
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      console.error('[AUTH] Google auth error:', code, err);
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // user dismissed — silent
      } else if (code === 'auth/popup-blocked') {
        showError('Popup was blocked by your browser. Please allow popups for this site.');
      } else {
        showError('Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── Email / Password Registration ────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      showError('Please complete all required fields.');
      return;
    }
    if (password.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    console.log('[AUTH] Email register started');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      console.log('[AUTH] Email auth success, uid:', user.uid);

      await updateProfile(user, { displayName: name.trim() });

      try {
        await writeUserProfile(user.uid, name.trim(), email.trim(), role);
      } catch (firestoreErr: unknown) {
        const fc = (firestoreErr as { code?: string }).code;
        console.error('[AUTH] Firestore profile error:', fc, firestoreErr);
        if (fc === 'permission-denied') {
          showError(
            'Account created but Firestore rules need to be published. ' +
            'Run: firebase login  then  npm run deploy:rules'
          );
          navigate(role === 'organizer' ? '/organizer' : '/attendee');
          return;
        }
      }

      success(`Account created! Welcome, ${name.trim()}.`);
      navigate(role === 'organizer' ? '/organizer' : '/attendee');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      console.error('[AUTH] Email register error:', code, err);

      if (code === 'auth/email-already-in-use') {
        // Check what provider the existing account uses
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email.trim());
          if (methods.includes('google.com')) {
            showError('This email is already registered with Google. Please use "Continue with Google" to sign in.');
          } else {
            showError('This email is already registered. Please sign in instead.');
          }
        } catch {
          showError('This email is already registered. Please sign in instead.');
        }
      } else if (code === 'auth/invalid-email') {
        showError('Please enter a valid email address.');
      } else if (code === 'auth/weak-password') {
        showError('Password is too weak. Use at least 6 characters.');
      } else if (code === 'auth/network-request-failed') {
        showError('Network error. Please check your internet connection.');
      } else {
        showError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* ── Brand header ── */}
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4 }}>Create your account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
            Get started with real-time cloud event planning
          </p>
        </div>

        <Card style={{ padding: 32, boxShadow: 'var(--shadow-md)' }}>

          {/* ── Role selector (shown above Google so it applies to Google signup too) ── */}
          <Select
            label="I want to register as:"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={[
              { value: 'organizer', label: 'Event Organizer (Create & Manage Events)' },
              { value: 'attendee', label: 'Attendee / Participant (RSVP & View Passes)' },
            ]}
          />

          {/* ── Google button ── */}
          <Button
            type="button"
            variant="ghost"
            loading={googleLoading}
            onClick={handleGoogleRegister}
            style={{ width: '100%', marginBottom: 16, marginTop: 4, border: '1.5px solid var(--border-light)', gap: 10 }}
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
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>or register with email</span>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-light)' }} />
          </div>

          {/* ── Email form ── */}
          <form onSubmit={handleRegister}>
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="priya@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ width: '100%', marginTop: 12 }}
            >
              Register & Continue <ArrowRight size={16} />
            </Button>
          </form>
        </Card>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};
