import * as functions from "firebase-functions";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
}
const db = getFirestore();
const adminAuth = getAuth();
const SUPER_ADMIN_EMAIL = "biboandbobo2@gmail.com";
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    const { uid, email, displayName, photoURL } = user;
    const role = email === SUPER_ADMIN_EMAIL ? "super-admin" : "student";
    try {
        await db.collection("users").doc(uid).set({
            uid,
            email: email ?? null,
            displayName: displayName ?? null,
            photoURL: photoURL ?? null,
            role,
            createdAt: FieldValue.serverTimestamp(),
            lastLoginAt: FieldValue.serverTimestamp(),
        });
        await adminAuth.setCustomUserClaims(uid, { role });
        console.log(`✅ User created: ${email ?? uid} with role: ${role}`);
    }
    catch (error) {
        console.error("❌ Error creating user document:", error);
    }
});
