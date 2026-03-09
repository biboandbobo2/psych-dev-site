import { applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";

export function ensureAdminApp() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
  }

  return getApp();
}
