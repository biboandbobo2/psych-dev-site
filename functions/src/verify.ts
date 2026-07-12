/**
 * Cloud Functions для верификации и примирения данных
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  buildVerifyResult,
  loadActualBundle,
  expectedFromTransformedJson,
  type ExpectedBundle,
  type PeriodDoc,
} from "../../shared/verifyCore.js";
import { ensureAdmin } from "./lib/shared.js";
import {
  ARRAY_FIELDS,
  normalizeSpaces,
  normalizeAuthor,
  normalizeAuthors,
  normalizeLink,
  normalizeLinks,
  normalizeVideoPlaylist,
  normalizeLeisure,
  normalizeConcepts,
  mergeUniqueStrings,
  mergeUniqueAuthors,
  mergeUniqueLinks,
  mergeUniqueVideos,
  mergeUniqueLeisure,
  type Author,
  type Link,
} from "./lib/reconcileUtils.js";

// Клиент вызывает getFunctions(app) без региона → us-central1 обязателен.
// cpu/memory явно: у gen2 другие дефолты (cpu до 1 vCPU и т.п.), не выкручиваем ресурсы.
const CALLABLE_OPTS = { region: "us-central1", cpu: 1, memory: "256MiB" } as const;

function coerceExpected(input: any): ExpectedBundle {
  if (!input) {
    throw new HttpsError('invalid-argument', 'expected payload required');
  }
  if (Array.isArray(input)) {
    return expectedFromTransformedJson(input as PeriodDoc[]);
  }
  if (Array.isArray(input.periods)) {
    return input as ExpectedBundle;
  }
  throw new HttpsError('invalid-argument', 'expected must contain periods array');
}

export const runVerify = onCall(CALLABLE_OPTS, async (request) => {
  ensureAdmin(request);
  const data = request.data;
  const db = getFirestore();

  let expected: ExpectedBundle | null = null;
  if (data?.expected) {
    expected = coerceExpected(data.expected);
  } else {
    const snap = await db.collection('admin').doc('expectedData').collection('snapshots').doc('latest').get();
    if (!snap.exists) {
      throw new HttpsError('failed-precondition', 'Upload expected snapshot first (admin/expectedData/snapshots/latest)');
    }
    expected = coerceExpected(snap.data());
  }

  const actual = await loadActualBundle(db);
  const verify = buildVerifyResult(expected, actual);

  await db.collection('admin').doc('verification').set(
    {
      latest: {
        createdAt: FieldValue.serverTimestamp(),
        summaryPerPeriod: verify.summaryPerPeriod,
      },
    },
    { merge: true }
  );

  return {
    ok: true,
    summaryPerPeriod: verify.summaryPerPeriod,
    reportMd: verify.reportMd,
    diffJson: verify.diffJson,
  };
});

export const runReconcile = onCall(CALLABLE_OPTS, async (request) => {
  ensureAdmin(request);
  const data = request.data;
  const apply = !!data?.apply;
  const expected = coerceExpected(data?.expected);
  const db = getFirestore();

  const actual = await loadActualBundle(db);
  const verify = buildVerifyResult(expected, actual);
  const expectedMap = new Map<string, PeriodDoc>();
  expected.periods.forEach((p) => expectedMap.set(p.period, p));
  if (expected.intro) expectedMap.set('intro', expected.intro);

  const plan: Array<{
    period: string;
    missingDocument: boolean;
    scalars: string[];
    arrays: Record<string, number>;
  }> = [];

  for (const [period, diff] of Object.entries(verify.diffJson.perPeriod)) {
    const expectedDoc = expectedMap.get(period);
    if (!expectedDoc) continue;

    const isIntro = period === 'intro';
    const docRef = isIntro ? db.collection('intro').doc('singleton') : db.collection('periods').doc(period);

    const arrays: Record<string, number> = {};
    ARRAY_FIELDS.forEach((field) => {
      const entry = diff.arrays[field];
      if (entry?.missing.length) arrays[field] = entry.missing.length;
    });

    plan.push({
      period,
      missingDocument: !!diff.missingDocument,
      scalars: Object.keys(diff.scalars),
      arrays,
    });

    if (!apply) continue;

    if (diff.missingDocument) {
      await docRef.set({ ...expectedDoc, updatedAt: FieldValue.serverTimestamp() }, { merge: false });
      if (isIntro) {
        actual.intro = expectedDoc;
      } else {
        actual.periods[period] = expectedDoc;
      }
      continue;
    }

    const currentData = isIntro ? actual.intro : actual.periods[period];
    const updates: Record<string, unknown> = {};

    Object.keys(diff.scalars).forEach((field) => {
      updates[field] = (expectedDoc as any)[field];
    });

    ARRAY_FIELDS.forEach((field) => {
      const entry = diff.arrays[field];
      if (!entry || !entry.missing.length) return;
      if (field === 'concepts') {
        const current = normalizeConcepts(currentData?.concepts);
        const additions = entry.missing.map((item) => normalizeSpaces(String(item)));
        updates[field] = mergeUniqueStrings(current, additions);
      } else if (field === 'authors') {
        const current = normalizeAuthors(currentData?.authors);
        const additions = entry.missing
          .map((item) => normalizeAuthor(item))
          .filter((item): item is Author => Boolean(item));
        updates[field] = mergeUniqueAuthors(current, additions);
      } else if (field === 'video_playlist') {
        const current = normalizeVideoPlaylist((currentData as any)?.video_playlist);
        const additions = normalizeVideoPlaylist(entry.missing);
        updates[field] = mergeUniqueVideos(current, additions);
      } else if (field === 'leisure') {
        const current = normalizeLeisure((currentData as any)?.leisure);
        const additions = normalizeLeisure(entry.missing);
        updates[field] = mergeUniqueLeisure(current, additions);
      } else {
        const current = normalizeLinks((currentData as any)?.[field]);
        const additions = entry.missing
          .map((item) => normalizeLink(item))
          .filter((item): item is Link => Boolean(item));
        updates[field] = mergeUniqueLinks(current, additions);
      }
    });

    if (Object.keys(updates).length === 0) continue;

    await docRef.set({ ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    if (isIntro) {
      actual.intro = { ...(actual.intro ?? {}), ...updates } as PeriodDoc;
    } else {
      actual.periods[period] = { ...(actual.periods[period] ?? {}), ...updates } as PeriodDoc;
    }
  }

  if (apply) {
    await db.collection('admin').doc('verification').set(
      {
        latest: {
          createdAt: FieldValue.serverTimestamp(),
          summaryPerPeriod: verify.summaryPerPeriod,
        },
      },
      { merge: true }
    );
  }

  return { ok: true, applied: apply, plan };
});
