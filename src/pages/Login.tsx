import { useEffect } from "react";
import { useNavigate, useLocation, type Path } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Login() {
  const { signInWithGoogle, loading, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Ждём роль (loading), иначе не отличить админа от студента.
    if (!user || loading) return;
    // `from` целиком, с query: /disorder-table?course=… без него теряет курс.
    const from = (location.state as { from?: Partial<Path> } | null)?.from;
    // Без `from` (вход с главной) не-админа /admin встретил бы «Access denied».
    navigate(from ?? (isAdmin ? "/admin" : "/home"), { replace: true });
  }, [user, loading, isAdmin, navigate, location.state]);

  return (
    <div className="min-h-[60vh] grid place-items-center p-8">
      <div className="max-w-md w-full space-y-6 rounded-2xl border border-border/60 bg-card shadow-brand p-6">
        <h1 className="text-3xl font-semibold">Войти</h1>
        <p className="text-muted text-sm leading-6">
          Используйте Google-аккаунт, чтобы войти в DOM Academy.
        </p>
        <button
          onClick={signInWithGoogle}
          disabled={loading || !!user}
          className="w-full px-4 py-2 rounded-xl border border-border shadow-sm font-medium hover:bg-card2 disabled:opacity-60"
        >
          {user ? "Вы уже вошли" : "Войти через Google"}
        </button>
        {user && (
          <p className="text-sm text-muted">
            Авторизованы как {user.email}. Сейчас произойдёт переход…
          </p>
        )}
      </div>
    </div>
  );
}
