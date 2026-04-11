import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { SUPER_ADMIN_EMAIL } from '../constants/superAdmin';
import { reportAppError } from '../lib/errorHandler';
import { debugLog } from '../lib/debug';
import type { CourseType } from '../types/tests';
import type { CourseAccessMap, StudentStream, UserRole } from '../types/user';
import { hasCourseAccess as checkCourseAccess } from '../types/user';

interface AuthState {
  user: User | null;
  loading: boolean;
  userRole: UserRole | null;
  /** Гранулярный доступ к курсам (для guest) */
  courseAccess: CourseAccessMap | null;
  /** API ключ Gemini пользователя (BYOK) */
  geminiApiKey: string | null;
  /** Поток студента */
  studentStream: StudentStream;

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
  setStudentStream: (stream: StudentStream) => void;
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
      studentStream: 'none',
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

      setStudentStream: (studentStream) => set({ studentStream }),

      hasCourseAccess: (courseType: CourseType) => {
        const { userRole, courseAccess } = get();
        return checkCourseAccess(userRole, courseAccess, courseType);
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
        let userDocUnsubscribe: Unsubscribe | null = null;

        const unsubscribe = onAuthStateChanged(auth, async (next) => {
          if (cancelled) return;

          // Отписываемся от предыдущего пользователя
          if (userDocUnsubscribe) {
            userDocUnsubscribe();
            userDocUnsubscribe = null;
          }

          get().setUser(next);
          get().setStudentStream('none');

          if (!next) {
            get().setUserRole(null);
            get().setCourseAccess(null);
            get().setGeminiApiKey(null);
            get().setStudentStream('none');
            get().setLoading(false);
            return;
          }

          get().setLoading(true);

          try {
            let resolvedRole: UserRole = 'guest';

            if (next.email === SUPER_ADMIN_EMAIL) {
              resolvedRole = 'super-admin';
            } else {
              // Фаза 1: пробуем кешированный токен (без сетевого запроса).
              // Это позволяет мгновенно определить роль на мобильных.
              const cachedToken = await next.getIdTokenResult(false);
              const cachedRole = cachedToken.claims.role;

              if (cachedRole === 'admin' || cachedRole === 'super-admin') {
                resolvedRole = cachedRole as UserRole;
              } else if (cachedRole === 'student') {
                resolvedRole = 'student';
              } else if (cachedRole === 'guest') {
                resolvedRole = 'guest';
              } else {
                // Нет role в claims — проверяем Firestore для legacy пользователей
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

            // Фаза 2: обновляем токен в фоне (подхватит изменения claims).
            // Не блокирует UI — роль уже установлена из кеша.
            if (next.email !== SUPER_ADMIN_EMAIL) {
              next.getIdTokenResult(true).then((freshToken) => {
                if (cancelled) return;
                const freshRole = freshToken.claims.role as UserRole | undefined;
                if (freshRole && freshRole !== get().userRole) {
                  debugLog('🔄 Auth: role updated from fresh token:', freshRole);
                  get().setUserRole(freshRole);
                }
              }).catch((err) => {
                reportAppError({
                  message: 'Фоновое обновление токена не удалось',
                  error: err,
                  context: 'useAuthStore.initializeAuth.backgroundRefresh',
                });
              });
            }

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

                const studentStream = data?.studentStream;
                if (studentStream === 'first' || studentStream === 'second') {
                  get().setStudentStream(studentStream);
                } else {
                  get().setStudentStream('none');
                }

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
            get().setStudentStream('none');
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
