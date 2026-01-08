/**
 * Cloud Functions для верификации и примирения данных
 */
import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { buildVerifyResult, loadActualBundle, expectedFromTransformedJson, } from "../../shared/verifyCore.js";
import { ensureAdmin } from "./index.js";
import { ARRAY_FIELDS, normalizeSpaces, normalizeAuthor, normalizeAuthors, normalizeLink, normalizeLinks, normalizeVideoPlaylist, normalizeLeisure, normalizeConcepts, mergeUniqueStrings, mergeUniqueAuthors, mergeUniqueLinks, mergeUniqueVideos, mergeUniqueLeisure, } from "./lib/reconcileUtils.js";
function coerceExpected(input) {
    if (!input) {
        throw new functions.https.HttpsError('invalid-argument', 'expected payload required');
    }
    if (Array.isArray(input)) {
        return expectedFromTransformedJson(input);
    }
    if (Array.isArray(input.periods)) {
        return input;
    }
    throw new functions.https.HttpsError('invalid-argument', 'expected must contain periods array');
}
export const runVerify = functions.https.onCall(async (data, context) => {
    ensureAdmin(context);
    const db = getFirestore();
    let expected = null;
    if (data?.expected) {
        expected = coerceExpected(data.expected);
    }
    else {
        const snap = await db.collection('admin').doc('expectedData').collection('snapshots').doc('latest').get();
        if (!snap.exists) {
            throw new functions.https.HttpsError('failed-precondition', 'Upload expected snapshot first (admin/expectedData/snapshots/latest)');
        }
        expected = coerceExpected(snap.data());
    }
    const actual = await loadActualBundle(db);
    const verify = buildVerifyResult(expected, actual);
    await db.collection('admin').doc('verification').set({
        latest: {
            createdAt: FieldValue.serverTimestamp(),
            summaryPerPeriod: verify.summaryPerPeriod,
        },
    }, { merge: true });
    return {
        ok: true,
        summaryPerPeriod: verify.summaryPerPeriod,
        reportMd: verify.reportMd,
        diffJson: verify.diffJson,
    };
});
export const runReconcile = functions.https.onCall(async (data, context) => {
    ensureAdmin(context);
    const apply = !!data?.apply;
    const expected = coerceExpected(data?.expected);
    const db = getFirestore();
    const actual = await loadActualBundle(db);
    const verify = buildVerifyResult(expected, actual);
    const expectedMap = new Map();
    expected.periods.forEach((p) => expectedMap.set(p.period, p));
    if (expected.intro)
        expectedMap.set('intro', expected.intro);
    const plan = [];
    for (const [period, diff] of Object.entries(verify.diffJson.perPeriod)) {
        const expectedDoc = expectedMap.get(period);
        if (!expectedDoc)
            continue;
        const isIntro = period === 'intro';
        const docRef = isIntro ? db.collection('intro').doc('singleton') : db.collection('periods').doc(period);
        const arrays = {};
        ARRAY_FIELDS.forEach((field) => {
            const entry = diff.arrays[field];
            if (entry?.missing.length)
                arrays[field] = entry.missing.length;
        });
        plan.push({
            period,
            missingDocument: !!diff.missingDocument,
            scalars: Object.keys(diff.scalars),
            arrays,
        });
        if (!apply)
            continue;
        if (diff.missingDocument) {
            await docRef.set({ ...expectedDoc, updatedAt: FieldValue.serverTimestamp() }, { merge: false });
            if (isIntro) {
                actual.intro = expectedDoc;
            }
            else {
                actual.periods[period] = expectedDoc;
            }
            continue;
        }
        const currentData = isIntro ? actual.intro : actual.periods[period];
        const updates = {};
        Object.keys(diff.scalars).forEach((field) => {
            updates[field] = expectedDoc[field];
        });
        ARRAY_FIELDS.forEach((field) => {
            const entry = diff.arrays[field];
            if (!entry || !entry.missing.length)
                return;
            if (field === 'concepts') {
                const current = normalizeConcepts(currentData?.concepts);
                const additions = entry.missing.map((item) => normalizeSpaces(String(item)));
                updates[field] = mergeUniqueStrings(current, additions);
            }
            else if (field === 'authors') {
                const current = normalizeAuthors(currentData?.authors);
                const additions = entry.missing
                    .map((item) => normalizeAuthor(item))
                    .filter((item) => Boolean(item));
                updates[field] = mergeUniqueAuthors(current, additions);
            }
            else if (field === 'video_playlist') {
                const current = normalizeVideoPlaylist(currentData?.video_playlist);
                const additions = normalizeVideoPlaylist(entry.missing);
                updates[field] = mergeUniqueVideos(current, additions);
            }
            else if (field === 'leisure') {
                const current = normalizeLeisure(currentData?.leisure);
                const additions = normalizeLeisure(entry.missing);
                updates[field] = mergeUniqueLeisure(current, additions);
            }
            else {
                const current = normalizeLinks(currentData?.[field]);
                const additions = entry.missing
                    .map((item) => normalizeLink(item))
                    .filter((item) => Boolean(item));
                updates[field] = mergeUniqueLinks(current, additions);
            }
        });
        if (Object.keys(updates).length === 0)
            continue;
        await docRef.set({ ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        if (isIntro) {
            actual.intro = { ...(actual.intro ?? {}), ...updates };
        }
        else {
            actual.periods[period] = { ...(actual.periods[period] ?? {}), ...updates };
        }
    }
    if (apply) {
        await db.collection('admin').doc('verification').set({
            latest: {
                createdAt: FieldValue.serverTimestamp(),
                summaryPerPeriod: verify.summaryPerPeriod,
            },
        }, { merge: true });
    }
    return { ok: true, applied: apply, plan };
});
