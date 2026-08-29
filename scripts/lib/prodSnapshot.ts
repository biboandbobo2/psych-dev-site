/**
 * Общий контракт «прод-среза» ролевого стенда: allow-list коллекций, формат
 * снапшота на диске и его доливка в песочницу эмулятора.
 *
 * Пишет снапшот `scripts/fetchProdContentSnapshot.ts` (read-only к проду),
 * читает — `scripts/seedEmulatorRoles.ts --prod-data`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';

/** Корень репозитория (scripts/lib → ../..). */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Снапшот лежит в гитигнореном tmp/ и в репозиторий не попадает. */
export const SNAPSHOT_DIR = join(ROOT, 'tmp/prod-snapshot');
export const SNAPSHOT_TMP_DIR = join(ROOT, 'tmp/prod-snapshot.partial');
export const MANIFEST_FILE = 'manifest.json';

/** Проект, из которого снимается срез (только чтение). */
export const PROD_PROJECT_ID = 'psych-dev-site-prod';

/**
 * ЖЁСТКИЙ allow-list: только образовательный контент, ноль PII по построению.
 * Ключ — имя файла снапшота и корневой коллекции, `sub` — что дочитывается
 * под каждым документом.
 */
export const SNAPSHOT_COLLECTIONS = [
  /** courses/{id} (+ intro) и занятия динамических курсов. */
  { name: 'courses', subCollections: ['lessons'] },
  /** Занятия core-курсов. */
  { name: 'periods', subCollections: [] },
  { name: 'clinical-topics', subCollections: [] },
  { name: 'general-topics', subCollections: [] },
  /** Лёгкий nav-индекс (LS-3). */
  { name: 'courseNavIndex', subCollections: [] },
  /** Метаданные тестов; вопросы — subdoc content/questions. */
  { name: 'tests', subCollections: ['content'] },
  /** pages/home, pages/about — публичный контент лендингов. */
  { name: 'pages', subCollections: [] },
] as const;

/**
 * ЯВНЫЙ deny: эти коллекции не выкачиваются НИКОГДА, даже частично.
 * Список держится рядом с allow-list, чтобы расширение среза было осознанным
 * решением, а не побочным эффектом правки.
 *
 * users, notes, lectureQuestions, sharedLectureNotes, groups — персональные
 * данные и переписка; testResults, searchHistory, feature_events,
 * page_visit_daily, page_visit_months, aiUsageDaily — поведенческая
 * телеметрия; exams — брони и эссе студентов; videoTranscripts, book_chunks,
 * lecture_chunks — тяжёлые RAG-payload'ы, для формы данных бесполезные.
 */
export const SNAPSHOT_DENIED_COLLECTIONS = [
  'users',
  'notes',
  'lectureQuestions',
  'sharedLectureNotes',
  'groups',
  'feature_events',
  'testResults',
  'searchHistory',
  'page_visit_daily',
  'page_visit_months',
  'exams',
  'videoTranscripts',
  'videoTranscriptSearch',
  'book_chunks',
  'lecture_chunks',
  'aiUsageDaily',
  'timelines',
  'disorderTables',
] as const;

export interface SnapshotEntry {
  /** Полный путь документа: `courses/x`, `courses/x/lessons/y`. */
  path: string;
  data: Record<string, unknown>;
}

export interface SnapshotManifest {
  generatedAt: string;
  sourceProject: string;
  /** Имя коллекции → счётчики (документы + байты файла). */
  collections: Record<string, { docs: number; bytes: number }>;
  totalDocs: number;
  totalBytes: number;
  /** Сколько строковых значений замаскировала PII-страховка. */
  maskedValues: number;
}

/** Сентинел Timestamp'а: импорт восстанавливает его как Timestamp, не строку. */
interface TimestampSentinel {
  __t: 'ts';
  s: number;
  n: number;
}

function isTimestampSentinel(value: unknown): value is TimestampSentinel {
  return typeof value === 'object' && value !== null && (value as { __t?: string }).__t === 'ts';
}

/**
 * Firestore-значение → JSON. Timestamp сохраняет секунды/наносекунды,
 * остальные небазовые типы (DocumentReference, GeoPoint, Bytes) в контенте не
 * встречаются — при появлении зовём onDrop и пишем null, чтобы срез не унёс
 * непереносимую ссылку молча.
 */
export function encodeValue(value: unknown, path: string, onDrop: (path: string, kind: string) => void): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Timestamp) {
    return { __t: 'ts', s: value.seconds, n: value.nanoseconds } satisfies TimestampSentinel;
  }
  if (Array.isArray(value)) return value.map((item, i) => encodeValue(item, `${path}[${i}]`, onDrop));
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      onDrop(path, (value as object).constructor?.name ?? 'unknown');
      return null;
    }
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = encodeValue(item, `${path}.${key}`, onDrop);
    }
    return out;
  }
  return value;
}

/** JSON → Firestore-значение (обратная операция к encodeValue). */
export function decodeValue(value: unknown): unknown {
  if (isTimestampSentinel(value)) return new Timestamp(value.s, value.n);
  if (Array.isArray(value)) return value.map(decodeValue);
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = decodeValue(item);
    }
    return out;
  }
  return value;
}

export function readManifest(): SnapshotManifest | null {
  const file = join(SNAPSHOT_DIR, MANIFEST_FILE);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8')) as SnapshotManifest;
}

/** Текст ошибки «снапшота нет» — одинаковый в оркестраторе и в сиде. */
export const SNAPSHOT_MISSING_HINT =
  `Прод-срез не найден в ${SNAPSHOT_DIR}. ` +
  'Сначала сними его: npx tsx scripts/fetchProdContentSnapshot.ts (нужен ADC-доступ к проду).';

export interface ImportStats {
  written: number;
  skipped: number;
}

/**
 * Доливает снапшот в песочницу поверх синтетического сида.
 *
 * Правило конфликта: **фикстура всегда побеждает**. `protectedPaths` — пути,
 * которые только что записал сид; прод-документ с таким путём пропускается,
 * иначе прод перетёр бы мир сценариев. Всё остальное перезаписывается
 * (`set`), поэтому повторный прогон с обновлённым снапшотом идемпотентен.
 */
export async function importProdSnapshot(
  db: Firestore,
  protectedPaths: ReadonlySet<string>,
  log: (message: string) => void
): Promise<ImportStats> {
  const manifest = readManifest();
  if (!manifest) throw new Error(SNAPSHOT_MISSING_HINT);

  const writer = db.bulkWriter();
  let written = 0;
  let skipped = 0;

  for (const { name } of SNAPSHOT_COLLECTIONS) {
    const file = join(SNAPSHOT_DIR, `${name}.json`);
    if (!existsSync(file)) continue;
    const entries = JSON.parse(readFileSync(file, 'utf8')) as SnapshotEntry[];
    for (const entry of entries) {
      if (protectedPaths.has(entry.path)) {
        skipped += 1;
        continue;
      }
      void writer.set(db.doc(entry.path), decodeValue(entry.data) as Record<string, unknown>);
      written += 1;
    }
  }

  await writer.close();
  log(`прод-срез от ${manifest.generatedAt}: записано ${written}, пропущено фикстурных ${skipped}`);
  return { written, skipped };
}
