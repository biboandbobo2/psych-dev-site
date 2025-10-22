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

// === PERIODS ===

export async function getAllPeriods(): Promise<Period[]> {
  const periodsRef = collection(db, "periods");
  const q = query(periodsRef, orderBy("order", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as Omit<Period, "period">),
    period: docSnap.id,
  }));
}

export async function getPublishedPeriods(): Promise<Period[]> {
  const periodsRef = collection(db, "periods");
  const q = query(periodsRef, where("published", "==", true), orderBy("order", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as Omit<Period, "period">),
    period: docSnap.id,
  }));
}

export async function getPeriod(periodId: string): Promise<Period | null> {
  const docRef = doc(db, "periods", periodId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    ...(docSnap.data() as Omit<Period, "period">),
    period: periodId,
  };
}

export async function savePeriod(periodId: string, data: PeriodFormData): Promise<void> {
  const docRef = doc(db, "periods", periodId);

  await setDoc(
    docRef,
    {
      ...data,
      period: periodId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deletePeriod(periodId: string): Promise<void> {
  const docRef = doc(db, "periods", periodId);
  await deleteDoc(docRef);
}

// === INTRO ===

export async function getIntro(): Promise<IntroContent | null> {
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
