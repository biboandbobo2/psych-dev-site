import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { SUPER_ADMIN_EMAIL } from '../constants/superAdmin';
import { reportAppError } from '../lib/errorHandler';
import { isEmbeddedMobileBrowser } from '../lib/embeddedBrowser';
import type { CourseType } from '../types/tests';
import type { CourseAccessMap, UserRole } from '../types/user';
import { hasCourseAccess as checkCourseAccess } from '../types/user';

interface AuthState {
  user: User | null;
  loading: boolean;
  userRole: UserRole | null;
  /** Гранулярный доступ к курсам (для guest) */
  courseAccess: CourseAccessMap | null;
  /** API ключ Gemini пользователя (BYOK) */
  geminiApiKey: string | null;

  // Computed properties
  isGuest: boolean;
  isStudent: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setUserRole: (role: UserRole | null) => void;
  setCourseAccess: (access: CourseAccessMap | null) => void;
  setGeminiApiKey: (key: string | null) => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => () => void;

  /**
   * Проверяет, есть ли у пользователя доступ к видео-контенту курса
   * @param courseType - тип курса
   * @returns true если доступ разрешён
   */
  hasCourseAccess: (courseType: CourseType) => boolean;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      loading: true,
      userRole: null,
      courseAccess: null,
      geminiApiKey: null,
      isGuest: false,
      isStudent: false,
      isAdmin: false,
      isSuperAdmin: false,

      setUser: (user) => set({ user }),

      setLoading: (loading) => set({ loading }),

      setUserRole: (userRole) => {
        const isSuperAdmin = userRole === 'super-admin';
        const isAdmin = userRole === 'admin' || isSuperAdmin;
        const isStudent = userRole === 'student';
        const isGuest = userRole === 'guest';

        set({
          userRole,
          isSuperAdmin,
          isAdmin,
          isStudent,
          isGuest,
        });
      },

      setCourseAccess: (courseAccess) => set({ courseAccess }),

      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),

      hasCourseAccess: (courseType: CourseType) => {
        const { userRole, courseAccess } = get();
        return checkCourseAccess(userRole, courseAccess, courseType);
      },

      signInWithGoogle: async () => {
        try {
          if (isEmbeddedMobileBrowser()) {
            await signInWithRedirect(auth, googleProvider);
            return;
          }
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
        let userDocUnsubscribe: Unsubscribe | null = null;

        const unsubscribe = onAuthStateChanged(auth, async (next) => {
          if (cancelled) return;

          // Отписываемся от предыдущего пользователя
          if (userDocUnsubscribe) {
            userDocUnsubscribe();
            userDocUnsubscribe = null;
          }

          get().setUser(next);

          if (!next) {
            get().setUserRole(null);
            get().setCourseAccess(null);
            get().setGeminiApiKey(null);
            get().setLoading(false);
            return;
          }

          get().setLoading(true);

          try {
            let resolvedRole: UserRole = 'guest';

            if (next.email === SUPER_ADMIN_EMAIL) {
              resolvedRole = 'super-admin';
            } else {
              const tokenResult = await next.getIdTokenResult(true);
              const claimRole = tokenResult.claims.role;

              if (claimRole === 'admin' || claimRole === 'super-admin') {
                resolvedRole = claimRole as UserRole;
              } else if (claimRole === 'student') {
                resolvedRole = 'student';
              } else if (claimRole === 'guest') {
                resolvedRole = 'guest';
              } else {
                // Проверяем Firestore для legacy пользователей
                const snap = await getDoc(doc(db, 'users', next.uid));
                const firestoreRole = snap.data()?.role;
                if (firestoreRole === 'admin' || firestoreRole === 'super-admin') {
                  resolvedRole = firestoreRole;
                } else if (firestoreRole === 'student') {
                  resolvedRole = 'student';
                } else if (firestoreRole === 'guest') {
                  resolvedRole = 'guest';
                } else {
                  // Legacy пользователи без явной роли считаются student
                  resolvedRole = 'student';
                }
              }
            }

            get().setUserRole(resolvedRole);

            // Подписываемся на изменения courseAccess в реальном времени
            userDocUnsubscribe = onSnapshot(
              doc(db, 'users', next.uid),
              (docSnap) => {
                if (cancelled) return;
                const data = docSnap.data();
                const courseAccess = data?.courseAccess as CourseAccessMap | undefined;
                get().setCourseAccess(courseAccess ?? null);

                // Синхронизируем Gemini API ключ (BYOK)
                const geminiApiKey = data?.geminiApiKey as string | undefined;
                get().setGeminiApiKey(geminiApiKey ?? null);

                // Обновляем роль если изменилась
                const newRole = data?.role as UserRole | undefined;
                if (newRole && newRole !== get().userRole) {
                  get().setUserRole(newRole);
                }
              },
              (error) => {
                reportAppError({
                  message: 'Ошибка подписки на данные пользователя',
                  error,
                  context: 'useAuthStore.initializeAuth.onSnapshot',
                });
              }
            );
          } catch (error) {
            reportAppError({ message: 'Не удалось определить роль пользователя', error, context: 'useAuthStore.initializeAuth' });
            get().setUserRole('guest');
            get().setCourseAccess(null);
            get().setGeminiApiKey(null);
          } finally {
            if (!cancelled) {
              get().setLoading(false);
            }
          }
        });

        return () => {
          cancelled = true;
          unsubscribe();
          if (userDocUnsubscribe) {
            userDocUnsubscribe();
          }
        };
      },
    }),
    { name: 'AuthStore' }
  )
);
