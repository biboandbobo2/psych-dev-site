import { useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * Компонент для инициализации Firebase Auth listener
 * Заменяет AuthProvider, но без Context API
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return unsubscribe;
  }, [initializeAuth]);

  return <>{children}</>;
}
