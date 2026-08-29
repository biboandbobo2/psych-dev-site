/**
 * Снимает read-only срез КОНТЕНТА прода для ролевого стенда (`--prod-data`).
 *
 *   npx tsx scripts/fetchProdContentSnapshot.ts [--dry-run]
 *
 * Зачем: сценарии стенда должны падать на реальной ФОРМЕ данных (старые
 * документы без новых полей, реальные объёмы), а не только на синтетике.
 *
 * Границы:
 *  - читаются ТОЛЬКО коллекции из SNAPSHOT_COLLECTIONS (scripts/lib/prodSnapshot.ts);
 *    deny-list там же — PII не выкачивается по построению, а не по фильтру;
 *  - никаких collection-group запросов по проекту: обход строго по allow-list;
 *  - скрипт строго read-only: ни одного set/update/delete к проду;
 *  - результат кладётся в гитигнореный tmp/prod-snapshot/ атомарной подменой.
 *
 * Доступ — ADC (`gcloud auth application-default login`); ключей сервис-аккаунта
 * в репозитории нет и быть не должно.
 */
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { initializeApp, applicationDefault, deleteApp } from 'firebase-admin/app';
import { getFirestore, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';

import {
  MANIFEST_FILE,
  PROD_PROJECT_ID,
  SNAPSHOT_COLLECTIONS,
  SNAPSHOT_DENIED_COLLECTIONS,
  SNAPSHOT_DIR,
  SNAPSHOT_TMP_DIR,
  encodeValue,
  type SnapshotEntry,
  type SnapshotManifest,
} from './lib/prodSnapshot';

const TAG = '[prod-snapshot]';

/**
 * PII-страховка ПОВЕРХ allow-list. В контенте курсов теоретически может лежать
 * контакт автора — это не секрет, но в снапшот он не поедет.
 */
const PII_PATTERNS: Array<{ label: string; re: RegExp; mask: string }> = [
  { label: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, mask: '[email]' },
  {
    label: 'phone-ru',
    re: /(?:\+7|\b8)[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g,
    mask: '[phone]',
  },
  {
    label: 'phone-intl',
    re: /\+\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g,
    mask: '[phone]',
  },
];

interface MaskStats {
  masked: number;
}

/** Маскирует найденные контакты и печатает путь документа с типом находки. */
function maskPii(value: unknown, docPath: string, fieldPath: string, stats: MaskStats): unknown {
  if (typeof value === 'string') {
    let out = value;
    for (const { label, re, mask } of PII_PATTERNS) {
      re.lastIndex = 0;
      if (!re.test(out)) continue;
      re.lastIndex = 0;
      out = out.replace(re, mask);
      stats.masked += 1;
      console.warn(`${TAG} ⚠ ${label} замаскирован: ${docPath} → ${fieldPath}`);
    }
    return out;
  }
  if (Array.isArray(value)) return value.map((item, i) => maskPii(item, docPath, `${fieldPath}[${i}]`, stats));
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = maskPii(item, docPath, `${fieldPath}.${key}`, stats);
    }
    return out;
  }
  return value;
}

function encodeDoc(doc: QueryDocumentSnapshot, stats: MaskStats): SnapshotEntry {
  const path = doc.ref.path;
  const encoded = encodeValue(doc.data(), path, (where, kind) => {
    console.warn(`${TAG} ⚠ значение типа ${kind} не переносится, заменено на null: ${where}`);
  }) as Record<string, unknown>;
  return { path, data: maskPii(encoded, path, '', stats) as Record<string, unknown> };
}

/** Обход одной корневой коллекции allow-list'а вместе с разрешёнными детьми. */
async function fetchCollection(
  db: Firestore,
  name: string,
  subCollections: readonly string[],
  stats: MaskStats
): Promise<SnapshotEntry[]> {
  const entries: SnapshotEntry[] = [];
  const snap = await db.collection(name).get();
  for (const doc of snap.docs) {
    entries.push(encodeDoc(doc, stats));
    for (const sub of subCollections) {
      const childSnap = await doc.ref.collection(sub).get();
      for (const child of childSnap.docs) entries.push(encodeDoc(child, stats));
    }
  }
  return entries;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`${TAG} источник: ${PROD_PROJECT_ID} (read-only, ADC)`);
  console.log(`${TAG} allow-list: ${SNAPSHOT_COLLECTIONS.map((c) => c.name).join(', ')}`);
  console.log(`${TAG} никогда не выкачивается: ${SNAPSHOT_DENIED_COLLECTIONS.join(', ')}`);

  // Прод читается только по ADC. Явный ключ сервис-аккаунта в окружении —
  // повод остановиться: скрипту достаточно прав пользователя.
  const app = initializeApp({ credential: applicationDefault(), projectId: PROD_PROJECT_ID }, 'prod-snapshot');
  const db = getFirestore(app);

  const stats: MaskStats = { masked: 0 };
  const collections: SnapshotManifest['collections'] = {};
  const files: Array<{ name: string; json: string }> = [];
  let totalDocs = 0;
  let totalBytes = 0;

  try {
    for (const { name, subCollections } of SNAPSHOT_COLLECTIONS) {
      const entries = await fetchCollection(db, name, subCollections, stats);
      const json = JSON.stringify(entries);
      collections[name] = { docs: entries.length, bytes: Buffer.byteLength(json) };
      totalDocs += entries.length;
      totalBytes += collections[name].bytes;
      files.push({ name, json });
      console.log(`${TAG}   ${name}: ${entries.length} док., ${(collections[name].bytes / 1024).toFixed(1)} КБ`);
    }
  } finally {
    await deleteApp(app);
  }

  const manifest: SnapshotManifest = {
    generatedAt: new Date().toISOString(),
    sourceProject: PROD_PROJECT_ID,
    collections,
    totalDocs,
    totalBytes,
    maskedValues: stats.masked,
  };

  if (dryRun) {
    console.log(`${TAG} --dry-run: на диск ничего не пишу`);
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  // Атомарная подмена: собираем во временный каталог и переименовываем, чтобы
  // упавший на середине прогон не оставил полусрез, который стенд примет.
  rmSync(SNAPSHOT_TMP_DIR, { recursive: true, force: true });
  mkdirSync(SNAPSHOT_TMP_DIR, { recursive: true });
  for (const { name, json } of files) writeFileSync(join(SNAPSHOT_TMP_DIR, `${name}.json`), json);
  writeFileSync(join(SNAPSHOT_TMP_DIR, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
  rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
  renameSync(SNAPSHOT_TMP_DIR, SNAPSHOT_DIR);

  console.log(
    `\n${TAG} ✅ ${totalDocs} док. (${(totalBytes / 1024).toFixed(1)} КБ) в ${SNAPSHOT_DIR}; ` +
      `замаскировано значений: ${stats.masked}`
  );
  console.log(`${TAG} стенд: npm run smoke:roles -- --prod-data`);
}

main().catch((err) => {
  console.error(`${TAG} Ошибка:`, err instanceof Error ? err.message : err);
  process.exit(1);
});
