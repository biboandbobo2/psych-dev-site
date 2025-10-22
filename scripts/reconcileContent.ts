import fs from 'fs';
import path from 'path';
import { FieldValue } from 'firebase-admin/firestore';
import { initAdmin } from './_adminInit';
import {
  buildVerifyResult,
  expectedFromTransformedJson,
  loadActualBundle,
  type PeriodDoc,
} from '../shared/verifyCore';

const APPLY_FLAG = process.argv.includes('--apply');

type Author = { name: string; url?: string };
type Link = { title: string; url?: string };

type ArrayField = 'concepts' | 'authors' | 'core_literature' | 'extra_literature' | 'extra_videos';
const ARRAY_FIELD_LIST: ArrayField[] = ['concepts', 'authors', 'core_literature', 'extra_literature', 'extra_videos'];

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeConcepts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeSpaces(String(item ?? '')))
    .filter((item) => item.length > 0);
}

function normalizeAuthor(value: any): Author | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const name = normalizeSpaces(value);
    if (!name) return undefined;
    return { name };
  }
  if (typeof value === 'object') {
    const name = normalizeSpaces(String(value.name ?? value.title ?? ''));
    if (!name) return undefined;
    const url = value.url ?? value.link ?? value.href;
    return url ? { name, url: String(url).trim() } : { name };
  }
  return undefined;
}

function normalizeAuthors(value: unknown): Author[] {
  if (!Array.isArray(value)) return [];
  const authors: Author[] = [];
  value.forEach((item) => {
    const normalized = normalizeAuthor(item);
    if (normalized) authors.push(normalized);
  });
  return authors;
}

function normalizeLink(value: any): Link | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const title = normalizeSpaces(value);
    if (!title) return undefined;
    return { title };
  }
  if (typeof value === 'object') {
    const title = normalizeSpaces(String(value.title ?? value.name ?? ''));
    if (!title) return undefined;
    const url = value.url ?? value.link ?? value.href;
    return url ? { title, url: String(url).trim() } : { title };
  }
  return undefined;
}

function normalizeLinks(value: unknown): Link[] {
  if (!Array.isArray(value)) return [];
  const links: Link[] = [];
  value.forEach((item) => {
    const normalized = normalizeLink(item);
    if (normalized) links.push(normalized);
  });
  return links;
}

function conceptKey(value: string): string {
  return normalizeSpaces(value).toLowerCase();
}

function authorKey(value: Author): string {
  const name = normalizeSpaces(value.name).toLowerCase();
  const url = value.url ? value.url.trim().toLowerCase() : '';
  return `${name}|${url}`;
}

function linkKey(value: Link): string {
  const title = normalizeSpaces(value.title).toLowerCase();
  const url = value.url ? value.url.trim().toLowerCase() : '';
  return `${title}|${url}`;
}

function mergeUniqueStrings(current: string[], additions: string[]): string[] {
  const set = new Set(current.map(conceptKey));
  const result = [...current];
  additions.forEach((item) => {
    const key = conceptKey(item);
    if (!set.has(key)) {
      set.add(key);
      result.push(item);
    }
  });
  return result;
}

function mergeUniqueAuthors(current: Author[], additions: Author[]): Author[] {
  const set = new Set(current.map(authorKey));
  const result = [...current];
  additions.forEach((item) => {
    const key = authorKey(item);
    if (!set.has(key)) {
      set.add(key);
      result.push(item);
    }
  });
  return result;
}

function mergeUniqueLinks(current: Link[], additions: Link[]): Link[] {
  const set = new Set(current.map(linkKey));
  const result = [...current];
  additions.forEach((item) => {
    const key = linkKey(item);
    if (!set.has(key)) {
      set.add(key);
      result.push(item);
    }
  });
  return result;
}

function readExpectedBundle(): { bundle: ReturnType<typeof expectedFromTransformedJson>; map: Map<string, PeriodDoc> } {
  const expectedPath = path.resolve(process.cwd(), 'public/transformed-data.json');
  if (!fs.existsSync(expectedPath)) {
    throw new Error('public/transformed-data.json not found. Run npm run transform first.');
  }
  const raw = JSON.parse(fs.readFileSync(expectedPath, 'utf8')) as PeriodDoc[];
  const bundle = expectedFromTransformedJson(raw);
  const map = new Map<string, PeriodDoc>();
  bundle.periods.forEach((p) => map.set(p.period, p));
  if (bundle.intro) map.set('intro', bundle.intro);
  return { bundle, map };
}

async function main() {
  const { db, projectId } = initAdmin();
  console.log(`📡 Connected to Firestore project: ${projectId ?? '(ADC/SA)'}`);
  console.log(APPLY_FLAG ? '🚀 APPLY MODE: changes will be written.' : '🧪 DRY-RUN: no changes will be written.');

  const { bundle: expectedBundle, map: expectedMap } = readExpectedBundle();
  const actualBundle = await loadActualBundle(db);
  const verify = buildVerifyResult(expectedBundle, actualBundle);

  const entries = Object.entries(verify.diffJson.perPeriod);
  for (const [period, diff] of entries) {
    const expectedDoc = expectedMap.get(period);
    if (!expectedDoc) {
      console.warn(`⚠️ Expected data for ${period} not found, skipping.`);
      continue;
    }

    const isIntro = period === 'intro';
    const docRef = isIntro ? db.collection('intro').doc('singleton') : db.collection('periods').doc(period);
    const descriptor = isIntro ? 'intro/singleton' : `periods/${period}`;

    if (diff.missingDocument) {
      if (APPLY_FLAG) {
        console.log(`➕ Creating ${descriptor}`);
        await docRef.set({ ...expectedDoc, updatedAt: FieldValue.serverTimestamp() }, { merge: false });
      } else {
        console.log(`(dry-run) ➕ Would create ${descriptor}`);
      }
      continue;
    }

    const snap = await docRef.get();
    if (!snap.exists) {
      if (APPLY_FLAG) {
        console.log(`⚠️ ${descriptor} missing (detected late), creating.`);
        await docRef.set({ ...expectedDoc, updatedAt: FieldValue.serverTimestamp() }, { merge: false });
      } else {
        console.log(`(dry-run) ⚠️ ${descriptor} missing, would create.`);
      }
      continue;
    }

    const current = snap.data() as PeriodDoc;
    const updates: Record<string, unknown> = {};

    Object.entries(diff.scalars).forEach(([field, info]) => {
      updates[field] = info.expected;
    });

    ARRAY_FIELD_LIST.forEach((field) => {
      const entry = diff.arrays[field];
      if (!entry || !entry.missing.length) return;
      if (field === 'concepts') {
        const currentArr = normalizeConcepts(current[field]);
        const merged = mergeUniqueStrings(currentArr, entry.missing.map((item) => normalizeSpaces(String(item))));
        updates[field] = merged;
      } else if (field === 'authors') {
        const currentArr = normalizeAuthors(current[field]);
        const additions = entry.missing
          .map((item) => normalizeAuthor(item))
          .filter((item): item is Author => Boolean(item));
        updates[field] = mergeUniqueAuthors(currentArr, additions);
      } else {
        const currentArr = normalizeLinks(current[field]);
        const additions = entry.missing
          .map((item) => normalizeLink(item))
          .filter((item): item is Link => Boolean(item));
        updates[field] = mergeUniqueLinks(currentArr, additions);
      }
    });

    if (Object.keys(updates).length === 0) {
      console.log(`✅ ${descriptor} — no updates needed`);
      continue;
    }

    if (APPLY_FLAG) {
      console.log(`✏️  Updating ${descriptor}: ${Object.keys(updates).join(', ')}`);
      await docRef.set({ ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } else {
      console.log(`(dry-run) ✏️  Would update ${descriptor}: ${Object.keys(updates).join(', ')}`);
    }
  }

  if (verify.diffJson.extraDocuments.length) {
    console.log('⚠️ Extra documents detected:');
    verify.diffJson.extraDocuments.forEach((docId) => {
      console.log(`- periods/${docId}`);
    });
  }

  console.log('');
  console.log('ℹ️  Done. Run `npm run verify` again to confirm state.');
}

main().catch((error) => {
  console.error('❌ Reconcile failed:', error);
  process.exit(1);
});
