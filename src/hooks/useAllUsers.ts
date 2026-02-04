import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { debugError } from "../lib/debug";
import type { CourseAccessMap, UserRole } from "../types/user";

export interface UserRecord {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  /** Гранулярный доступ к курсам (для guest) */
  courseAccess?: CourseAccessMap;
  /** Пользователь отключён (не может войти, но данные сохранены) */
  disabled?: boolean;
  /** API ключ Gemini пользователя (BYOK) */
  geminiApiKey?: string;
  /** Пользователь приглашён массово, но ещё не зарегистрировался */
  pendingRegistration?: boolean;
  createdAt: any;
  lastLoginAt: any;
}

export function useAllUsers() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    if (!isSuperAdmin) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const usersRef = collection(db, "users");
    const q = query(usersRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() })) as UserRecord[];
        setUsers(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        debugError("Error loading users:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isSuperAdmin]);

  return { users, loading, error };
}
