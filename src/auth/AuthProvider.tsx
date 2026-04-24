/**
 * DEPRECATED: This file is kept for backwards compatibility only.
 * New code should use useAuthStore from '../stores/useAuthStore' directly.
 *
 * This provides a compatibility layer for existing code using useAuth() hook.
 */
import { useMemo } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * @deprecated Use useAuthStore from '../stores/useAuthStore' instead
 * This hook is provided for backwards compatibility only.
 *
 * Uses individual selectors to avoid unnecessary re-renders.
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const userRole = useAuthStore((state) => state.userRole);
  const courseAccess = useAuthStore((state) => state.courseAccess);
  const studentStream = useAuthStore((state) => state.studentStream);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const logout = useAuthStore((state) => state.logout);
  const hasCourseAccess = useAuthStore((state) => state.hasCourseAccess);

  return useMemo(
    () => ({
      user,
      loading,
      userRole,
      courseAccess,
      studentStream,
      isAdmin,
      isSuperAdmin,
      signInWithGoogle,
      logout,
      hasCourseAccess,
    }),
    [user, loading, userRole, courseAccess, studentStream, isAdmin, isSuperAdmin, signInWithGoogle, logout, hasCourseAccess]
  );
}
