import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

const functions = getFunctions(app);

export const seedAdmin = httpsCallable(functions, "seedAdmin");

export const setRole = httpsCallable<
  { targetUid: string; role: "admin" | "student" | null },
  {
    success: boolean;
    targetUid: string;
    targetEmail: string;
    newRole: string;
    customClaims: Record<string, any>;
    message: string;
  }
>(functions, "setRole");
