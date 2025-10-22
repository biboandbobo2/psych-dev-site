import { SUPER_ADMIN_EMAIL } from "../constants/superAdmin";
import { useAuth } from "../auth/AuthProvider";

export function SuperAdminBadge() {
  const { user } = useAuth();

  if (user?.email !== SUPER_ADMIN_EMAIL) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
      <span aria-hidden className="text-sm">⭐</span>
      <span>Super Admin</span>
    </div>
  );
}
