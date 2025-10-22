import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-6">Загрузка…</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="p-6 text-center space-y-2">
        <h1 className="text-2xl font-semibold text-red-600">Access denied</h1>
        <p className="text-muted text-base">
          У вас нет прав администратора. Обратитесь к владельцу проекта.
        </p>
      </div>
    );
  }

  return children;
}
