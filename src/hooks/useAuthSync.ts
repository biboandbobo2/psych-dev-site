import { useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";

export function useAuthSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const updateLastLogin = async () => {
      try {
        const ref = doc(db, "users", user.uid);
        await updateDoc(ref, {
          lastLoginAt: serverTimestamp(),
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
      } catch (error) {
        console.error("Error updating last login:", error);
      }
    };

    updateLastLogin();
  }, [user]);
}
