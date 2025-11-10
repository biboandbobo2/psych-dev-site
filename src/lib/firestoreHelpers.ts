import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Period, IntroContent, PeriodFormData } from "../types/content";

const LEGACY_PERIOD_IDS: Record<string, string> = {
  school: "primary-school",
};

const CANONICAL_TO_LEGACY_IDS: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_PERIOD_IDS).map(([legacy, canonical]) => [canonical, legacy])
);

export const canonicalizePeriodId = (id: string): string => LEGACY_PERIOD_IDS[id] ?? id;
const resolveLegacyId = (id: string): string | undefined => CANONICAL_TO_LEGACY_IDS[id];

async function getPeriodDocWithAliases(periodId: string) {
  const canonical = canonicalizePeriodId(periodId);
  const legacy = resolveLegacyId(periodId);
  const tryIds: string[] = [];

  if (!tryIds.includes(canonical)) {
    tryIds.push(canonical);
  }
  if (!tryIds.includes(periodId)) {
    tryIds.push(periodId);
  }
  if (legacy && !tryIds.includes(legacy)) {
    tryIds.push(legacy);
  }

  for (const id of tryIds) {
    const docRef = doc(db, "periods", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { snap: docSnap, id };
    }
  }
  return null;
}

function mapDocsToPeriods(docs: Array<{ id: string; data: () => any }>): Period[] {
  const map = new Map<string, { rawId: string; data: Period }>();

  docs.forEach((docSnap) => {
    const rawId = docSnap.id;
    const canonicalId = canonicalizePeriodId(rawId);
    const data: Period = {
      ...(docSnap.data() as Omit<Period, "period">),
      period: canonicalId,
    };

    const existing = map.get(canonicalId);
    if (!existing) {
      map.set(canonicalId, { rawId, data });
      return;
    }

    const existingIsCanonical = existing.rawId === canonicalId;
    const currentIsCanonical = rawId === canonicalId;
    if (!existingIsCanonical && currentIsCanonical) {
      map.set(canonicalId, { rawId, data });
    }
  });

  return Array.from(map.values()).map(({ data }) => data);
}

// === PERIODS ===

export async function getAllPeriods(): Promise<Period[]> {
  const periodsRef = collection(db, "periods");
  const q = query(periodsRef, orderBy("order", "asc"));
  const snapshot = await getDocs(q);

  return mapDocsToPeriods(snapshot.docs);
}

export async function getPublishedPeriods(): Promise<Period[]> {
  const periodsRef = collection(db, "periods");
  const q = query(periodsRef, where("published", "==", true), orderBy("order", "asc"));
  const snapshot = await getDocs(q);

  return mapDocsToPeriods(snapshot.docs);
}

export async function getPeriod(periodId: string): Promise<Period | null> {
  const result = await getPeriodDocWithAliases(periodId);
  if (!result) {
    return null;
  }

  const canonicalId = canonicalizePeriodId(result.id);
  return {
    ...(result.snap.data() as Omit<Period, "period">),
    period: canonicalId,
  };
}

export async function savePeriod(periodId: string, data: PeriodFormData): Promise<void> {
  const canonicalId = canonicalizePeriodId(periodId);
  const docRef = doc(db, "periods", canonicalId);

  await setDoc(
    docRef,
    {
      ...data,
      period: canonicalId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deletePeriod(periodId: string): Promise<void> {
  const canonicalId = canonicalizePeriodId(periodId);
  await deleteDoc(doc(db, "periods", canonicalId));
  const legacyId = resolveLegacyId(canonicalId);
  if (legacyId) {
    await deleteDoc(doc(db, "periods", legacyId)).catch(() => {});
  }
}

// === INTRO ===

export async function getIntro(): Promise<IntroContent | null> {
  const canonicalIntro = await getPeriod("intro");
  if (canonicalIntro) {
    return canonicalIntro as IntroContent;
  }

  const docRef = doc(db, "intro", "singleton");
  const docSnap = await getDoc(docRef);

  let payload: Record<string, unknown> | null = null;

  if (docSnap.exists()) {
    payload = docSnap.data() as Record<string, unknown>;
  }

  const stringFields = (keys: string[]) =>
    keys
      .map((key) => String(payload?.[key] ?? "").trim())
      .filter(Boolean);

  const hasVideo = stringFields(["video_url", "videoUrl"]).length > 0;
  const hasDeck = stringFields(["deck_url", "deckUrl"]).length > 0;
  const hasSelfQuestions = stringFields(["self_questions_url", "selfQuestionsUrl"]).length > 0;

  const payloadRecord = payload as Record<string, unknown> | null;

  const arrayHasItems = (field: string) => {
    if (!payloadRecord) return false;
    const value = payloadRecord[field];
    return Array.isArray(value) && value.length > 0;
  };

  const hasAnyArrayContent =
    arrayHasItems("concepts") ||
    arrayHasItems("authors") ||
    arrayHasItems("core_literature") ||
    arrayHasItems("extra_literature") ||
    arrayHasItems("extra_videos");

  const isPayloadEmpty =
    !payload ||
    (!hasVideo && !hasDeck && !hasSelfQuestions && !hasAnyArrayContent);

  if (isPayloadEmpty) {
    const fallbackRef = doc(db, "periods", "intro");
    const fallbackSnap = await getDoc(fallbackRef);
    if (fallbackSnap.exists()) {
      payload = fallbackSnap.data() as Record<string, unknown>;
    }
  }

  if (!payload) {
    return null;
  }

  return {
    ...(payload as Omit<IntroContent, "period">),
    period: "intro",
  };
}

export async function saveIntro(data: Omit<IntroContent, "period" | "updatedAt">): Promise<void> {
  const docRef = doc(db, "intro", "singleton");

  await setDoc(
    docRef,
    {
      ...data,
      period: "intro",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// === HELPERS ===

export function parseDelimitedString(str: string | undefined): string[] {
  if (!str) return [];
  return str
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseLinks(str: string | undefined): { title: string; url: string }[] {
  if (!str) return [];

  return str
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [title, url] = pair.split("::").map((s) => s.trim());
      return { title: title || "", url: url || "" };
    })
    .filter((link) => link.title && link.url);
}

export function stringifyLinks(links: { title: string; url: string }[]): string {
  return links
    .filter((link) => link.title && link.url)
    .map((link) => `${link.title}::${link.url}`)
    .join("|");
}

export function stringifyArray(arr: string[]): string {
  return arr.filter(Boolean).join("|");
}
