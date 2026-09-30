import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User, signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: "organizer" | "attendee" | null;
}

interface AuthContextProps {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Build the base user object from Firebase Auth (always available)
      const baseUser: AuthUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        role: null,
      };

      // Attempt to enrich with Firestore role — but never block login if it fails
      try {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          const data = snap.data() as { role?: "organizer" | "attendee" };
          baseUser.role = data.role ?? null;
        }
      } catch (err: unknown) {
        // Firestore rules may not be deployed yet — log and continue
        const code = (err as { code?: string }).code;
        console.warn("[AuthContext] Could not read Firestore profile:", code);
        if (code === "permission-denied") {
          console.warn(
            "[AuthContext] Firestore rules are not deployed. " +
            "Run: firebase login  then  npm run deploy:rules"
          );
        }
        // role stays null — the app will still load
      }

      setUser(baseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
