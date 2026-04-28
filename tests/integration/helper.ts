import admin from 'firebase-admin';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { app as clientApp } from '../../src/lib/firebase';

const DEFAULT_PROJECT_ID = 'psych-dev-site-test';
const EMULATOR_HOSTS: Record<string, string> = {
  FIRESTORE_EMULATOR_HOST: 'localhost:8080',
  FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
  FIREBASE_STORAGE_EMULATOR_HOST: 'localhost:9199',
};
const DEFAULT_STORAGE_BUCKET = 'psych-dev-site-test.appspot.com';

let clientEmulatorsConnected = false;

function connectClientSdkToEmulators(): void {
  if (clientEmulatorsConnected) return;
  // Firebase JS SDK не подхватывает FIRESTORE_EMULATOR_HOST автоматически
  // (в отличие от firebase-admin) — нужно подключать явно.
  connectFirestoreEmulator(getFirestore(clientApp), 'localhost', 8080);
  connectAuthEmulator(getAuth(clientApp), 'http://localhost:9099', { disableWarnings: true });
  connectStorageEmulator(getStorage(clientApp), 'localhost', 9199);
  clientEmulatorsConnected = true;
}

export function setupIntegrationEnv(): void {
  ensureEmulatorEnv();
  connectClientSdkToEmulators();
}

function ensureEmulatorEnv(): void {
  Object.entries(EMULATOR_HOSTS).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });

  process.env.GCLOUD_PROJECT ||= process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID;
  process.env.FIREBASE_PROJECT_ID ||= process.env.GCLOUD_PROJECT || DEFAULT_PROJECT_ID;
  process.env.FIREBASE_STORAGE_BUCKET ||= DEFAULT_STORAGE_BUCKET;

  // Ensure Firebase Admin uses emulator credentials.
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||= '';
}

function getProjectId(): string {
  return process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || DEFAULT_PROJECT_ID;
}

function getAdminApp() {
  ensureEmulatorEnv();
  return (
    admin.apps[0] ??
    admin.initializeApp({
      projectId: getProjectId(),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET,
    })
  );
}

export function initializeIntegrationApp() {
  return getAdminApp();
}

export async function resetFirestore(): Promise<void> {
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || EMULATOR_HOSTS.FIRESTORE_EMULATOR_HOST;
  const response = await fetch(
    `http://${firestoreHost}/emulator/v1/projects/${getProjectId()}/databases/(default)/documents`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    throw new Error(`Failed to reset Firestore emulator: ${response.status}`);
  }
}

export async function resetAuth(): Promise<void> {
  const auth = admin.auth(getAdminApp());
  let nextPageToken: string | undefined;

  do {
    const { users, pageToken } = await auth.listUsers(1000, nextPageToken);
    if (!users.length) break;

    await auth.deleteUsers(users.map((user) => user.uid));
    nextPageToken = pageToken ?? undefined;
  } while (nextPageToken);
}

export async function resetStorage(): Promise<void> {
  const storage = admin.storage(getAdminApp());
  const bucket = storage.bucket();

  try {
    await bucket.deleteFiles({ force: true });
  } catch {
    // Эмулятор может быть не настроен — игнорируем ошибки.
  }
}

export async function resetIntegrationData(): Promise<void> {
  await initializeIntegrationApp();
  await Promise.all([resetFirestore(), resetAuth(), resetStorage()]);
}
