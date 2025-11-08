/**
 * DEPRECATED: This file is kept for backwards compatibility only.
 * New code should use useAuthStore from '../stores/useAuthStore' directly.
 *
 * This provides a compatibility layer for existing code using useAuth() hook.
 */
import { useAuthStore } from '../stores/useAuthStore';
import { shallow } from 'zustand/shallow';

/**
 * @deprecated Use useAuthStore from '../stores/useAuthStore' instead
 * This hook is provided for backwards compatibility only.
 */
export function useAuth() {
  return useAuthStore(
    (state) => ({
      user: state.user,
      loading: state.loading,
      userRole: state.userRole,
      isStudent: state.isStudent,
      isAdmin: state.isAdmin,
      isSuperAdmin: state.isSuperAdmin,
      signInWithGoogle: state.signInWithGoogle,
      logout: state.logout,
    }),
    shallow
  );
}
