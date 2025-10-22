import { useEffect } from "react";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../lib/firebase";
import { SUPER_ADMIN_EMAIL } from "../constants/superAdmin";

export function useAuthSync() {
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (!user) return;

    const syncUser = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);
        const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

        if (!snapshot.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: isSuperAdmin ? "super-admin" : "student",
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          });
          return;
        }

        const updates: Record<string, unknown> = {
          lastLoginAt: serverTimestamp(),
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        };

        const currentRole = snapshot.data()?.role;
        if (isSuperAdmin && currentRole !== "super-admin") {
          updates.role = "super-admin";
          updates.upgradedAt = serverTimestamp();
        }

        await updateDoc(userRef, updates);
      } catch (error) {
        console.error("Error syncing user:", error);
      }
    };

    syncUser();
  }, [user]);
}
