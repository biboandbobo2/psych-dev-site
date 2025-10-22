import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { setRole } from "../lib/cloudFunctions";

interface UserRow {
  uid: string;
  email: string;
  role: string;
  lastSignIn?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUid, setProcessingUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const adminsSnapshot = await getDocs(collection(db, "admins"));
      const list: UserRow[] = adminsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          email: data.email ?? "Unknown",
          role: data.role ?? "admin",
          lastSignIn: data.updatedAt?.toDate?.().toLocaleString?.() ?? "N/A",
        };
      });

      list.sort((a, b) => a.email.localeCompare(b.email));
      setUsers(list);
    } catch (err: any) {
      console.error("❌ Error loading users:", err);
      setError("Failed to load users: " + (err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSetRole = async (targetUid: string, newRole: "admin" | "student") => {
    if (!confirm(`Are you sure you want to set role to "${newRole}" for this user?`)) {
      return;
    }

    try {
      setProcessingUid(targetUid);
      setError(null);
      console.log(`🔄 Setting role to "${newRole}" for UID: ${targetUid}`);

      const result = await setRole({
        targetUid,
        role: newRole === "student" ? null : newRole,
      });

      console.log("✅ Role changed:", result.data);
      alert(
        `✅ Success!\n\n${result.data?.message ?? "Role updated."}\n\nUser: ${result.data?.targetEmail ?? "unknown"}`
      );

      await loadUsers();
    } catch (err: any) {
      console.error("❌ Error setting role:", err);
      setError(`Failed to change role: ${err?.message ?? err}`);
      alert(`❌ Error: ${err?.message ?? err}`);
    } finally {
      setProcessingUid(null);
    }
  };

  const handleAddAdmin = () => {
    const email = prompt("Enter user email to make admin:");
    if (!email) return;

    alert(
      "⚠️ Currently, you can only manage existing users.\n\n" +
        "To add a new admin:\n" +
        "1. Ask them to sign in first (Google Sign-In).\n" +
        "2. Their UID will appear in Authentication.\n" +
        "3. Promote them here using Make Admin."
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">👥 Users Management</h1>
        <p className="text-gray-600">Manage admin roles. Current user: {auth.currentUser?.email}</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
          <h2 className="font-semibold">Admin Users ({users.length})</h2>
          <button
            onClick={handleAddAdmin}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            + Add Admin
          </button>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No admin users found.</p>
            <p className="text-sm mt-2">Use the "Add Admin" button to promote users.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => {
                const isCurrentUser = user.uid === auth.currentUser?.uid;
                const isProcessing = processingUid === user.uid;

                return (
                  <tr key={user.uid} className={isCurrentUser ? "bg-blue-50" : ""}>
                    <td className="px-4 py-3 text-sm">
                      {user.email}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-blue-600 font-semibold">(You)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">
                      {user.uid.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.lastSignIn}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {user.role === "admin" ? (
                        <button
                          onClick={() => handleSetRole(user.uid, "student")}
                          disabled={isCurrentUser || isProcessing}
                          className={`px-3 py-1 rounded text-sm ${
                            isCurrentUser || isProcessing
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                          }`}
                        >
                          {isProcessing ? "Processing..." : "Remove Admin"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetRole(user.uid, "admin")}
                          disabled={isProcessing}
                          className={`px-3 py-1 rounded text-sm ${
                            isProcessing
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                        >
                          {isProcessing ? "Processing..." : "Make Admin"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Important Notes</h3>
        <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
          <li>Users must sign out and sign in again for role changes to take effect</li>
          <li>You cannot remove your own admin role</li>
          <li>This list shows users from the "admins" collection in Firestore</li>
        </ul>
      </div>
    </div>
  );
}
