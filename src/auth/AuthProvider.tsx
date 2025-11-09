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
  const isStudent = useAuthStore((state) => state.isStudent);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const logout = useAuthStore((state) => state.logout);

  return useMemo(
    () => ({
      user,
      loading,
      userRole,
      isStudent,
      isAdmin,
      isSuperAdmin,
      signInWithGoogle,
      logout,
    }),
    [user, loading, userRole, isStudent, isAdmin, isSuperAdmin, signInWithGoogle, logout]
  );
}
