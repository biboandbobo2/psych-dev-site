import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { collection, doc, getDoc, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { SUPER_ADMIN_EMAIL } from '../constants/superAdmin';
import { reportAppError } from '../lib/errorHandler';
import { debugLog } from '../lib/debug';
import { sanitizeGeminiApiKey } from '../lib/geminiKey';
import type { CourseType } from '../types/tests';
import type { CourseAccessMap, UserRole } from '../types/user';
import { hasCourseAccess as checkCourseAccess, normalizeUserRole } from '../types/user';
import {
  cleanupCourseProgressSync,
  initCourseProgressSync,
} from '../lib/courseProgress/cloudSync';
import { migrateLocalProgressIfNeeded } from '../lib/courseProgress/migration';

interface AuthState {
  user: User | null;
  loading: boolean;
  userRole: UserRole | null;
  /** Список courseId, которые admin может редактировать. Только для role='admin'. */
  adminEditableCourses: string[];
  /** Индивидуальный гранулярный доступ к курсам (без учёта групп) */
  courseAccess: CourseAccessMap | null;
  /**
   * Курсы, открытые пользователю через группы (union grantedCourses всех его групп).
   * Обновляется реалтайм через подписку на collection('groups') where memberIds array-contains uid.
   */
  groupGrantedCourses: Record<string, boolean>;
  /** API ключ Gemini пользователя (BYOK) */
  geminiApiKey: string | null;
  /**
   * Личный список «актуальных» курсов пользователя для continue-cards
   * на /home. Максимум 3 элемента, имеет приоритет над group.featuredCourseIds.
   */
  featuredCourseIds: string[];

  // Computed properties
  isAdmin: boolean;
  isSuperAdmin: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setUserRole: (role: UserRole | null) => void;
  setAdminEditableCourses: (courses: string[]) => void;
  setCourseAccess: (access: CourseAccessMap | null) => void;
  setGroupGrantedCourses: (granted: Record<string, boolean>) => void;
  setGeminiApiKey: (key: string | null) => void;
  setFeaturedCourseIds: (ids: string[]) => void;
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
      adminEditableCourses: [],
      courseAccess: null,
      groupGrantedCourses: {},
      geminiApiKey: null,
      featuredCourseIds: [],
      isAdmin: false,
      isSuperAdmin: false,

      setUser: (user) => set({ user }),

      setLoading: (loading) => set({ loading }),

      setUserRole: (userRole) => {
        const isSuperAdmin = userRole === 'super-admin';
        const isAdmin = userRole === 'admin' || isSuperAdmin;

        set({
          userRole,
          isSuperAdmin,
          isAdmin,
        });
      },

      setAdminEditableCourses: (adminEditableCourses) => set({ adminEditableCourses }),

      setCourseAccess: (courseAccess) => set({ courseAccess }),

      setGroupGrantedCourses: (groupGrantedCourses) => set({ groupGrantedCourses }),

      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey: sanitizeGeminiApiKey(geminiApiKey) ?? null }),

      setFeaturedCourseIds: (featuredCourseIds) => set({ featuredCourseIds }),

      hasCourseAccess: (courseType: CourseType) => {
        const { userRole, courseAccess, groupGrantedCourses } = get();
        if (checkCourseAccess(userRole, courseAccess, courseType)) return true;
        return groupGrantedCourses[courseType] === true;
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
        let myGroupsUnsubscribe: Unsubscribe | null = null;

        const unsubscribe = onAuthStateChanged(auth, async (next) => {
          if (cancelled) return;

          // Отписываемся от предыдущего пользователя
          if (userDocUnsubscribe) {
            userDocUnsubscribe();
            userDocUnsubscribe = null;
          }
          if (myGroupsUnsubscribe) {
            myGroupsUnsubscribe();
            myGroupsUnsubscribe = null;
          }
          cleanupCourseProgressSync();

          get().setUser(next);

          if (!next) {
            get().setUserRole(null);
            get().setAdminEditableCourses([]);
            get().setCourseAccess(null);
            get().setGroupGrantedCourses({});
            get().setGeminiApiKey(null);
            get().setFeaturedCourseIds([]);
            get().setLoading(false);
            return;
          }

          initCourseProgressSync(next.uid);
          void migrateLocalProgressIfNeeded(next.uid);

          get().setLoading(true);

          try {
            let resolvedRole: UserRole | null = null;

            if (next.email === SUPER_ADMIN_EMAIL) {
              resolvedRole = 'super-admin';
            } else {
              // Фаза 1: пробуем кешированный токен (без сетевого запроса).
              const cachedToken = await next.getIdTokenResult(false);
              resolvedRole = normalizeUserRole(cachedToken.claims.role);

              if (!resolvedRole) {
                // Нет admin-роли в claims — проверяем Firestore для legacy/freshly-granted
                const snap = await getDoc(doc(db, 'users', next.uid));
                resolvedRole = normalizeUserRole(snap.data()?.role);
              }
            }

            get().setUserRole(resolvedRole);

            // Фаза 2: обновляем токен в фоне (подхватит изменения claims).
            if (next.email !== SUPER_ADMIN_EMAIL) {
              next.getIdTokenResult(true).then((freshToken) => {
                if (cancelled) return;
                const freshRole = normalizeUserRole(freshToken.claims.role);
                if (freshRole !== get().userRole) {
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

            // Подписка на свои группы: собираем union grantedCourses
            myGroupsUnsubscribe = onSnapshot(
              query(collection(db, 'groups'), where('memberIds', 'array-contains', next.uid)),
              (snap) => {
                if (cancelled) return;
                const granted: Record<string, boolean> = {};
                snap.docs.forEach((d) => {
                  const rawCourses = d.data()?.grantedCourses;
                  if (Array.isArray(rawCourses)) {
                    for (const c of rawCourses) {
                      if (typeof c === 'string' && c) granted[c] = true;
                    }
                  }
                });
                get().setGroupGrantedCourses(granted);
              },
              (err) => {
                reportAppError({
                  message: 'Ошибка подписки на группы',
                  error: err,
                  context: 'useAuthStore.initializeAuth.myGroups',
                });
                get().setGroupGrantedCourses({});
              }
            );

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

                // Личные «актуальные курсы» пользователя (continue-cards)
                const featuredRaw = data?.featuredCourseIds;
                const featured = Array.isArray(featuredRaw)
                  ? featuredRaw.filter((c): c is string => typeof c === 'string')
                  : [];
                get().setFeaturedCourseIds(featured);

                // Обновляем роль если изменилась
                const newRole = normalizeUserRole(data?.role);
                if (newRole !== get().userRole) {
                  get().setUserRole(newRole);
                }

                // adminEditableCourses синхронно с Firestore
                const editableRaw = data?.adminEditableCourses;
                const editable = Array.isArray(editableRaw)
                  ? editableRaw.filter((c): c is string => typeof c === 'string')
                  : [];
                get().setAdminEditableCourses(editable);
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
            get().setUserRole(null);
            get().setAdminEditableCourses([]);
            get().setCourseAccess(null);
            get().setGroupGrantedCourses({});
            get().setGeminiApiKey(null);
            get().setFeaturedCourseIds([]);
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
          if (myGroupsUnsubscribe) {
            myGroupsUnsubscribe();
          }
          cleanupCourseProgressSync();
        };
      },
    }),
    { name: 'AuthStore' }
  )
);
