import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Login() {
  const { signInWithGoogle, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const redirectTo = (location.state as any)?.from?.pathname ?? "/admin";
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, location.state]);

  return (
    <div className="min-h-[60vh] grid place-items-center p-8">
      <div className="max-w-md w-full space-y-6 rounded-2xl border border-border/60 bg-card shadow-brand p-6">
        <h1 className="text-3xl font-semibold">Войти</h1>
        <p className="text-muted text-sm leading-6">
          Используйте Google-аккаунт, чтобы получить доступ к разделу администратора.
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
