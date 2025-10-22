import { httpsCallable, getFunctions } from "firebase/functions";
import { doc } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { auth, db } from "../lib/firebase";
import UploadAsset, { diagnoseToken } from "./UploadAsset";
import { useDataSource } from "../hooks/useDataSource";

export default function Admin() {
  const { user, isAdmin, logout } = useAuth();
  const dataSource = useDataSource();
  const location = useLocation();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold">Админ-панель</h1>
        <div className="space-y-2 text-sm sm:text-right">
          <div className="opacity-70">{user?.email}</div>
          <AdminHeaderStatus user={user} isAdmin={isAdmin} />
          {isAdmin && <DataSourceToggle current={dataSource} />}
          <button
            onClick={async () => {
              try {
                const res = await diagnoseToken();
                if (res?.claims.role === "admin") {
                  alert("✅ Token OK! Role: admin found");
                } else {
                  alert("❌ No admin role in token. Sign out and sign in again.");
                }
              } catch (error: any) {
                console.error(error);
                alert(`Error: ${error?.message ?? error}`);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            🔍 Check Token
          </button>
          <button
            onClick={async () => {
              const code = prompt("Enter admin seed code:");
              if (!code) return;

              try {
                console.log("🔄 Calling seedAdmin function...");
                const fn = httpsCallable(getFunctions(), "seedAdmin");
                const result = await fn({ seedCode: code });
                console.log("✅ seedAdmin response:", result);
                console.log("✅ Response data:", result.data);

                if ((result.data as any)?.ok) {
                  alert("✅ Admin role set successfully!\n\nYou MUST sign out and sign in again for changes to take effect.");
                  await auth.signOut();
                  window.location.href = "/";
                } else {
                  alert("❌ Unexpected response from seedAdmin");
                }
              } catch (error: any) {
                console.error("❌ seedAdmin error:", error);
                console.error("❌ Error code:", error?.code);
                console.error("❌ Error message:", error?.message);
                console.error("❌ Full error:", JSON.stringify(error, null, 2));
                alert(`❌ Error calling seedAdmin:\n${error?.message ?? error}`);
              }
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            🔄 Set Admin Role
          </button>
          <button
            onClick={logout}
            className="px-3 py-1 rounded-xl border border-border shadow-sm hover:bg-card2"
          >
            Выйти
          </button>
        </div>
      </div>

      {isAdmin && (
        <nav className="flex gap-3 mb-6 flex-wrap">
          <Link
            to="/admin"
            className={`px-4 py-2 rounded font-medium transition-colors ${
              location.pathname === '/admin'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📊 Dashboard
          </Link>

          <Link
            to="/admin/users"
            className={`px-4 py-2 rounded font-medium transition-colors ${
              location.pathname === '/admin/users'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            👥 Users
          </Link>

          <Link
            to="/admin/content"
            className={`px-4 py-2 rounded font-medium transition-colors ${
              location.pathname.startsWith('/admin/content')
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📝 Content
          </Link>

          <Link
            to="/admin/import"
            className={`px-4 py-2 rounded font-medium transition-colors ${
              location.pathname === '/admin/import'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📥 Import CSV
          </Link>
        </nav>
      )}

      {!isAdmin ? <MakeMeAdmin /> : <UploadAsset />}
    </div>
  );
}

function MakeMeAdmin() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const seedCode = import.meta.env.VITE_ADMIN_SEED_CODE as string | undefined;

  const requestAdmin = async () => {
    if (!seedCode || seedCode === "SET_YOUR_ONE_TIME_CODE") {
      setStatus("error");
      setMessage("Код администратора не задан. Установите VITE_ADMIN_SEED_CODE.");
      return;
    }

    try {
      setStatus("loading");
      setMessage(null);
      const fn = httpsCallable(getFunctions(), "seedAdmin");
      const result = await fn({ seedCode });
      setStatus("success");
      setMessage("Права администратора выданы. Пожалуйста, войдите снова.");
      window.alert("Admin role applied! Please sign in again.");
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось назначить администратора");
    }
  };

  return (
    <div className="rounded-2xl border border-yellow-300/80 bg-yellow-100/60 p-5 space-y-3 text-yellow-900">
      <h2 className="text-lg font-semibold">Нужны права администратора?</h2>
      <p className="text-sm leading-6">
        Нажмите кнопку ниже, чтобы одноразово создать запись в Firestore. Убедитесь, что в .env.local задан
        корректный код и Cloud Function `seedAdmin` задеплоена.
      </p>
      <button
        onClick={requestAdmin}
        disabled={status === "loading"}
        className="px-3 py-1 rounded-xl border border-yellow-600/60 bg-white/80 hover:bg-white disabled:opacity-60"
      >
        {status === "loading" ? "Отправка…" : "Сделать меня админом"}
      </button>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-red-700" : ""}`}>{message}</p>
      )}
    </div>
  );
}

function AdminHeaderStatus({ user, isAdmin }: { user: User | null; isAdmin: boolean }) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadClaims() {
      if (!user) {
        if (!cancelled) setRole(null);
        return;
      }
      const res = await auth.currentUser?.getIdTokenResult(true);
      if (!cancelled) {
        const tokenRole = (res?.claims as any)?.role ?? null;
        setRole(typeof tokenRole === "string" ? tokenRole : null);
      }
    }

    loadClaims();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="text-sm opacity-70">
      UID: {user?.uid ?? "—"} • Admin: {isAdmin || role === "admin" ? "yes" : "no"}
    </div>
  );
}

function DataSourceToggle({ current }: { current: string }) {
  const isFirestore = current === "firestore";

  return (
    <button
      type="button"
      disabled
      className="px-3 py-2 rounded-xl border border-indigo-200 text-indigo-400 bg-indigo-50/40 cursor-not-allowed"
      title="Источник данных зафиксирован. Для временного доступа к CSV используйте параметр ?source=csv."
    >
      Data Source: {isFirestore ? "FIRESTORE" : current.toUpperCase()} (locked)
    </button>
  );
}
