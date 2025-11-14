import { getFunctions, httpsCallable, type Functions, type HttpsCallable } from "firebase/functions";
import { app } from "./firebase";

// Lazy initialization to avoid "Cannot access uninitialized variable" in production
let _functions: Functions | null = null;
let _seedAdmin: HttpsCallable | null = null;
let _setRole: HttpsCallable<
  { targetUid: string; role: "admin" | "student" | null },
  {
    success: boolean;
    targetUid: string;
    targetEmail: string;
    newRole: string;
    customClaims: Record<string, any>;
    message: string;
  }
> | null = null;

function getFunctionsInstance(): Functions {
  if (!_functions) {
    _functions = getFunctions(app);
  }
  return _functions;
}

export function getSeedAdmin(): HttpsCallable {
  if (!_seedAdmin) {
    _seedAdmin = httpsCallable(getFunctionsInstance(), "seedAdmin");
  }
  return _seedAdmin;
}

export function getSetRole() {
  if (!_setRole) {
    _setRole = httpsCallable<
      { targetUid: string; role: "admin" | "student" | null },
      {
        success: boolean;
        targetUid: string;
        targetEmail: string;
        newRole: string;
        customClaims: Record<string, any>;
        message: string;
      }
    >(getFunctionsInstance(), "setRole");
  }
  return _setRole;
}

// Backward compatibility exports using Proxy
export const seedAdmin = new Proxy({} as HttpsCallable, {
  apply(target, thisArg, args) {
    return getSeedAdmin().apply(thisArg, args);
  },
  get(target, prop) {
    return (getSeedAdmin() as any)[prop];
  },
});

export const setRole = new Proxy({} as HttpsCallable, {
  apply(target, thisArg, args) {
    return getSetRole().apply(thisArg, args);
  },
  get(target, prop) {
    return (getSetRole() as any)[prop];
  },
});
