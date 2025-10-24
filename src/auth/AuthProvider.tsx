import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, googleProvider, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { SUPER_ADMIN_EMAIL } from "../constants/superAdmin";

type UserRole = "student" | "admin" | "super-admin" | null;

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  userRole: UserRole;
  isStudent: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  userRole: null,
  isStudent: false,
  isAdmin: false,
  isSuperAdmin: false,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(null);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (next) => {
      if (cancelled) return;

      setUser(next);

      if (!next) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        let resolvedRole: Exclude<UserRole, null> = "student";

        if (next.email === SUPER_ADMIN_EMAIL) {
          resolvedRole = "super-admin";
        } else {
          const tokenResult = await next.getIdTokenResult(true);
          const claimRole = tokenResult.claims.role;

          if (claimRole === "admin" || claimRole === "super-admin") {
            resolvedRole = claimRole as Exclude<UserRole, null>;
          } else {
            const snap = await getDoc(doc(db, "users", next.uid));
            const firestoreRole = snap.data()?.role;
            if (firestoreRole === "admin" || firestoreRole === "super-admin") {
              resolvedRole = firestoreRole;
            }
          }
        }

        setUserRole(resolvedRole);
      } catch (error) {
        console.warn("Failed to determine user role", error);
        setUserRole("student");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const isSuperAdmin = userRole === "super-admin";
    const isAdmin = userRole === "admin" || isSuperAdmin;
    const isStudent = userRole === "student";

    return {
      user,
      loading,
      userRole,
      isStudent,
      isAdmin,
      isSuperAdmin,
      signInWithGoogle,
      logout,
    };
  }, [user, loading, userRole, signInWithGoogle, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
