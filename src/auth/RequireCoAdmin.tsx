import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * Гейт для страниц со-админа. Пропускает super-admin (он включает co-admin)
 * и обычных co-admin'ов. Все остальные — редирект на /home.
 */
export default function RequireCoAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const isCoAdmin = useAuthStore((state) => state.isCoAdmin);
  const location = useLocation();

  if (loading) {
    return <div className="p-6">Загрузка…</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isCoAdmin) {
    return (
      <div className="p-6 text-center space-y-2">
        <h1 className="text-2xl font-semibold text-red-600">Access denied</h1>
        <p className="text-muted text-base">
          У вас нет прав со-админа. Обратитесь к супер-админу.
        </p>
      </div>
    );
  }

  return children;
}
