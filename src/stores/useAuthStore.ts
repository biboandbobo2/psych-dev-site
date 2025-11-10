import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SUPER_ADMIN_EMAIL } from '../constants/superAdmin';
import { reportAppError } from '../lib/errorHandler';

type UserRole = 'student' | 'admin' | 'super-admin' | null;

interface AuthState {
  user: User | null;
  loading: boolean;
  userRole: UserRole;

  // Computed properties
  isStudent: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setUserRole: (role: UserRole) => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      loading: true,
      userRole: null,
      isStudent: false,
      isAdmin: false,
      isSuperAdmin: false,

      setUser: (user) => set({ user }),

      setLoading: (loading) => set({ loading }),

      setUserRole: (userRole) => {
        const isSuperAdmin = userRole === 'super-admin';
        const isAdmin = userRole === 'admin' || isSuperAdmin;
        const isStudent = userRole === 'student';

        set({
          userRole,
          isSuperAdmin,
          isAdmin,
          isStudent,
        });
      },

      signInWithGoogle: async () => {
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (error) {
          reportAppError({ message: 'Ошибка входа через Google', error, context: 'useAuthStore.signInWithGoogle' });
          throw error;
        }
      },

      logout: async () => {
        try {
          await signOut(auth);
        } catch (error) {
          reportAppError({ message: 'Ошибка выхода', error, context: 'useAuthStore.logout' });
          throw error;
        }
      },

      initializeAuth: () => {
        let cancelled = false;

        const unsubscribe = onAuthStateChanged(auth, async (next) => {
          if (cancelled) return;

          get().setUser(next);

          if (!next) {
            get().setUserRole(null);
            get().setLoading(false);
            return;
          }

          get().setLoading(true);

          try {
            let resolvedRole: Exclude<UserRole, null> = 'student';

            if (next.email === SUPER_ADMIN_EMAIL) {
              resolvedRole = 'super-admin';
            } else {
              const tokenResult = await next.getIdTokenResult(true);
              const claimRole = tokenResult.claims.role;

              if (claimRole === 'admin' || claimRole === 'super-admin') {
                resolvedRole = claimRole as Exclude<UserRole, null>;
              } else {
                const snap = await getDoc(doc(db, 'users', next.uid));
                const firestoreRole = snap.data()?.role;
                if (firestoreRole === 'admin' || firestoreRole === 'super-admin') {
                  resolvedRole = firestoreRole;
                }
              }
            }

            get().setUserRole(resolvedRole);
          } catch (error) {
            reportAppError({ message: 'Не удалось определить роль пользователя', error, context: 'useAuthStore.initializeAuth' });
            get().setUserRole('student');
          } finally {
            if (!cancelled) {
              get().setLoading(false);
            }
          }
        });

        return () => {
          cancelled = true;
          unsubscribe();
        };
      },
    }),
    { name: 'AuthStore' }
  )
);
