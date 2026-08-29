// LS-4: публичные данные первого рендера — прямой REST-запрос к Firestore
// БЕЗ ожидания Firebase Auth. Firestore SDK не шлёт запросы, пока не пройдёт
// инициализация auth (на первом визите это ~0,5–2 с даже для публичных
// коллекций), REST-fetch стартует сразу. Используется только как быстрый
// ПЕРВЫЙ источник: авторитетный результат по-прежнему приходит из SDK и
// перезаписывает REST-данные. Любая ошибка REST-пути молча оставляет
// прежнее поведение.

const REST_TIMEOUT_MS = 7000;

const env = (typeof import.meta.env === 'object' ? import.meta.env : process.env) as Record<
  string,
  string | undefined
>;
const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || '';
const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || '';
const BASE = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

/**
 * REST-путь включён только в реальном рантайме: в vitest (MODE === 'test')
 * выключен, чтобы тесты не ходили в сеть — они мокают этот модуль явно.
 * В эмуляторном режиме (HP-2, ролевой стенд) тоже выключен: BASE указывает
 * на прод-endpoint и не знает про песочницы testProject, а SDK против
 * локального эмулятора и так отвечает мгновенно.
 */
export function isPublicRestAvailable(): boolean {
  return (
    env.MODE !== 'test' &&
    env.VITE_USE_FIREBASE_EMULATORS !== 'true' &&
    typeof fetch === 'function' &&
    Boolean(projectId) &&
    Boolean(apiKey)
  );
}

// Формат значений Firestore REST API (typed values)
interface FirestoreRestValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  referenceValue?: string;
  mapValue?: { fields?: Record<string, FirestoreRestValue> };
  arrayValue?: { values?: FirestoreRestValue[] };
}

export function decodeFirestoreValue(value: FirestoreRestValue): unknown {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if ('nullValue' in value) return null;
  if (value.referenceValue !== undefined) return value.referenceValue;
  if (value.mapValue) return decodeFirestoreFields(value.mapValue.fields ?? {});
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(decodeFirestoreValue);
  // geoPoint/bytes в публичных доках проекта не используются
  return undefined;
}

export function decodeFirestoreFields(
  fields: Record<string, FirestoreRestValue>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = decodeFirestoreValue(value);
  }
  return result;
}

async function restFetch(url: string): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Firestore REST: HTTP ${response.status}`);
    return (await response.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

/** Один публичный док; null — дока нет. */
export async function restGetPublicDoc(path: string): Promise<Record<string, unknown> | null> {
  const json = await restFetch(`${BASE}/${path}?key=${apiKey}`);
  const fields = json?.fields as Record<string, FirestoreRestValue> | undefined;
  if (!fields) return null;
  return decodeFirestoreFields(fields);
}

/**
 * Публичная коллекция одним запросом (без пагинации — потребители маленькие:
 * `courses` — десятки доков; при росте за pageSize появится усечение,
 * но SDK-источник истины перезапишет полным списком).
 */
export async function restListPublicCollection(
  path: string
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const json = await restFetch(`${BASE}/${path}?pageSize=300&key=${apiKey}`);
  const documents = (json?.documents ?? []) as Array<{
    name: string;
    fields?: Record<string, FirestoreRestValue>;
  }>;
  return documents.map((doc) => ({
    id: doc.name.split('/').pop() ?? '',
    data: decodeFirestoreFields(doc.fields ?? {}),
  }));
}
