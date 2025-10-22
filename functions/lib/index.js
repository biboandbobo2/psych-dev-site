// Cloud Functions (Node 20, ESM), firebase-admin v12+.
import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
initializeApp();
/**
 * Callable: seedAdmin
 * По одноразовому коду добавляет пользователя в коллекцию admins/{uid}
 * и выставляет custom claim role: "admin".
 *
 * Требует аутентификации (Google Sign-In). Код берётся из functions:config admin.seed_code.
 */
export const seedAdmin = functions.https.onCall(async (data, context) => {
    console.log("🔵 seedAdmin called");
    console.log("🔵 Context auth:", JSON.stringify(context.auth, null, 2));
    console.log("🔵 Data received:", data);
    const uid = context.auth?.uid;
    const email = context.auth?.token?.email;
    const seedCode = (data?.seedCode ?? "").trim();
    console.log("🔵 UID:", uid);
    console.log("🔵 Email:", email);
    console.log("🔵 Seed code provided:", seedCode ? "yes" : "no");
    if (!uid || !email) {
        console.error("❌ No UID or email");
        throw new functions.https.HttpsError("unauthenticated", "Login required");
    }
    const expected = (functions.config().admin?.seed_code || "").trim();
    console.log("🔵 Expected seed code configured:", expected ? "yes" : "no");
    if (!expected || seedCode !== expected) {
        console.error("❌ Invalid seed code");
        throw new functions.https.HttpsError("permission-denied", "Invalid code");
    }
    try {
        console.log("🔵 Writing to Firestore admins collection...");
        await getFirestore().collection("admins").doc(uid).set({ email, createdAt: FieldValue.serverTimestamp() }, { merge: true });
        console.log("✅ Firestore write successful");
        console.log("🔵 Setting custom user claims...");
        await getAdminAuth().setCustomUserClaims(uid, { role: "admin" });
        console.log("✅ Custom claims set successfully");
        const userRecord = await getAdminAuth().getUser(uid);
        console.log("✅ User custom claims after setting:", userRecord.customClaims);
        return { ok: true, claims: userRecord.customClaims };
    }
    catch (err) {
        console.error("❌ Error in seedAdmin:", err);
        console.error("❌ Error code:", err?.code);
        console.error("❌ Error message:", err?.message);
        throw new functions.https.HttpsError("internal", "Failed to set admin role: " + err?.message);
    }
});
/**
 * setRole - управление ролями пользователей (только для админов)
 *
 * @param data.targetUid - UID пользователя, которому меняем роль
 * @param data.role - 'admin' | 'student' | null (null удаляет роль)
 */
export const setRole = functions.https.onCall(async (data, context) => {
    functions.logger.info("🔵 setRole called", {
        caller: context.auth?.uid,
        target: data?.targetUid,
        role: data?.role,
    });
    if (!context.auth) {
        functions.logger.error("❌ Unauthenticated call");
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    const callerRole = context.auth.token?.role;
    if (callerRole !== "admin") {
        functions.logger.error("❌ Caller is not admin", {
            caller: context.auth.uid,
            callerRole,
        });
        throw new functions.https.HttpsError("permission-denied", "Only admins can manage roles");
    }
    const targetUid = data?.targetUid;
    const role = data?.role;
    if (!targetUid || typeof targetUid !== "string") {
        functions.logger.error("❌ Invalid targetUid");
        throw new functions.https.HttpsError("invalid-argument", "targetUid is required and must be a string");
    }
    if (role !== "admin" && role !== "student" && role !== null) {
        functions.logger.error("❌ Invalid role", { role });
        throw new functions.https.HttpsError("invalid-argument", "role must be 'admin', 'student', or null");
    }
    try {
        const authAdmin = getAdminAuth();
        const firestore = getFirestore();
        const targetUser = await authAdmin.getUser(targetUid);
        functions.logger.info("✅ Target user found", { email: targetUser.email });
        const claims = role ? { role } : {};
        await authAdmin.setCustomUserClaims(targetUid, claims);
        functions.logger.info("✅ Custom claims updated", { targetUid, newClaims: claims });
        const adminDocRef = firestore.collection("admins").doc(targetUid);
        if (role === "admin") {
            await adminDocRef.set({
                email: targetUser.email,
                role: "admin",
                grantedBy: context.auth.uid,
                grantedByEmail: context.auth.token.email,
                grantedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            functions.logger.info("✅ Admin document created/updated");
        }
        else {
            if (role === null) {
                await adminDocRef.delete();
                functions.logger.info("✅ Admin document deleted");
            }
            else {
                await adminDocRef.set({
                    email: targetUser.email,
                    role: "student",
                    revokedBy: context.auth.uid,
                    revokedByEmail: context.auth.token.email,
                    revokedAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
                functions.logger.info("✅ Admin role revoked");
            }
        }
        const updatedUser = await authAdmin.getUser(targetUid);
        functions.logger.info("✅ Final custom claims", { claims: updatedUser.customClaims });
        return {
            success: true,
            targetUid,
            targetEmail: targetUser.email,
            newRole: role || "student",
            customClaims: updatedUser.customClaims,
            message: `Role successfully changed to ${role || "student"}. User must sign out and sign in again.`,
        };
    }
    catch (error) {
        functions.logger.error("❌ Error in setRole", {
            error: error?.message,
            code: error?.code,
            targetUid,
        });
        if (error?.code === "auth/user-not-found") {
            throw new functions.https.HttpsError("not-found", `User with UID ${targetUid} not found`);
        }
        throw new functions.https.HttpsError("internal", `Failed to set role: ${error?.message}`);
    }
});
