import * as functions from "firebase-functions";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
}
const db = getFirestore();
const adminAuth = getAuth();
/**
 * Cloud Function: делает пользователя администратором
 * Может быть вызвана только super-admin'ом (biboandbobo2@gmail.com)
 */
export const makeUserAdmin = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Требуется авторизация');
    }
    const callerEmail = context.auth.token.email;
    const { targetUid, targetEmail } = data;
    if (callerEmail !== 'biboandbobo2@gmail.com') {
        throw new functions.https.HttpsError('permission-denied', 'Только super-admin может назначать администраторов');
    }
    try {
        let userUid = targetUid;
        if (targetEmail && !userUid) {
            try {
                const userRecord = await adminAuth.getUserByEmail(targetEmail);
                userUid = userRecord.uid;
            }
            catch (error) {
                throw new functions.https.HttpsError('not-found', `Пользователь с email ${targetEmail} не найден. Он должен хотя бы раз войти на сайт.`);
            }
        }
        if (!userUid) {
            throw new functions.https.HttpsError('invalid-argument', 'Не указан UID или email пользователя');
        }
        const userDoc = await db.collection('users').doc(userUid).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Пользователь должен хотя бы раз войти на сайт через Google');
        }
        await db.collection('users').doc(userUid).update({
            role: 'admin',
            promotedAt: FieldValue.serverTimestamp(),
            promotedBy: context.auth.uid,
        });
        await adminAuth.setCustomUserClaims(userUid, { role: 'admin' });
        console.log(`✅ User ${userUid} promoted to admin by ${callerEmail}`);
        return {
            success: true,
            message: 'Пользователь назначен администратором',
            uid: userUid,
        };
    }
    catch (error) {
        console.error('❌ Error making user admin:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message || 'Неизвестная ошибка');
    }
});
/**
 * Cloud Function: снимает права администратора
 */
export const removeAdmin = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Требуется авторизация');
    }
    const callerEmail = context.auth.token.email;
    const { targetUid } = data;
    if (callerEmail !== 'biboandbobo2@gmail.com') {
        throw new functions.https.HttpsError('permission-denied', 'Только super-admin может снимать права администратора');
    }
    if (!targetUid) {
        throw new functions.https.HttpsError('invalid-argument', 'Не указан UID пользователя');
    }
    if (context.auth.uid === targetUid) {
        throw new functions.https.HttpsError('invalid-argument', 'Нельзя снять права у самого себя');
    }
    try {
        await db.collection('users').doc(targetUid).update({
            role: 'student',
            demotedAt: FieldValue.serverTimestamp(),
            demotedBy: context.auth.uid,
        });
        await adminAuth.setCustomUserClaims(targetUid, { role: 'student' });
        console.log(`✅ User ${targetUid} demoted to student by ${callerEmail}`);
        return { success: true, message: 'Права администратора сняты' };
    }
    catch (error) {
        console.error('❌ Error removing admin:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Неизвестная ошибка');
    }
});
