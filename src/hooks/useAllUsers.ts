import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";

export interface UserRecord {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: "student" | "admin" | "super-admin" | string;
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
        console.error("Error loading users:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isSuperAdmin]);

  return { users, loading, error };
}
