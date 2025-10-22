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
async function listAllUsers(nextPageToken, acc = []) {
    const { users, pageToken } = await adminAuth.listUsers(1000, nextPageToken);
    const combined = acc.concat(users);
    if (pageToken) {
        return listAllUsers(pageToken, combined);
    }
    return combined;
}
export const migrateAdmins = functions.https.onRequest(async (_req, res) => {
    try {
        console.log("🚀 Starting admin migration...");
        const allUsers = await listAllUsers();
        const adminsSnapshot = await db.collection("admins").get();
        const adminUids = new Set(adminsSnapshot.docs.map((doc) => doc.id));
        console.log(`Found ${adminUids.size} admins in old collection`);
        console.log(`Found ${allUsers.length} users in Authentication`);
        let migrated = 0;
        let created = 0;
        let skipped = 0;
        for (const user of allUsers) {
            const { uid, email, displayName, photoURL } = user;
            const userRef = db.collection("users").doc(uid);
            const docSnap = await userRef.get();
            let role = "student";
            if (email === SUPER_ADMIN_EMAIL) {
                role = "super-admin";
            }
            else if (adminUids.has(uid)) {
                role = "admin";
            }
            if (docSnap.exists) {
                await userRef.update({
                    role,
                    migratedAt: FieldValue.serverTimestamp(),
                });
                migrated += 1;
                console.log(`✅ Updated: ${email ?? uid} → ${role}`);
            }
            else {
                await userRef.set({
                    uid,
                    email: email ?? null,
                    displayName: displayName ?? null,
                    photoURL: photoURL ?? null,
                    role,
                    createdAt: FieldValue.serverTimestamp(),
                    lastLoginAt: FieldValue.serverTimestamp(),
                    migratedAt: FieldValue.serverTimestamp(),
                });
                created += 1;
                console.log(`✨ Created: ${email ?? uid} → ${role}`);
            }
            await adminAuth.setCustomUserClaims(uid, { role });
        }
        const summary = {
            success: true,
            message: "Migration completed",
            stats: {
                totalUsers: allUsers.length,
                oldAdmins: adminUids.size,
                migrated,
                created,
                skipped,
            },
        };
        console.log("🎉 Migration summary:", summary);
        res.json(summary);
    }
    catch (error) {
        console.error("❌ Migration error:", error);
        res.status(500).json({ success: false, error: String(error) });
    }
});
