import * as functions from "firebase-functions";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL } = user;

  try {
    await db.collection("users").doc(uid).set({
      uid,
      email: email ?? null,
      displayName: displayName ?? null,
      photoURL: photoURL ?? null,
      role: "student",
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ User created in Firestore: ${email ?? uid}`);
  } catch (error) {
    console.error("❌ Error creating user document:", error);
  }
});
