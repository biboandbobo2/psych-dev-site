import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';

export const LECTURE_COLLECTIONS = {
  chunks: 'lecture_chunks',
  sources: 'lecture_sources',
} as const;

export const LECTURE_SEARCH_CONFIG = {
  answerMaxParagraphs: 5,
  candidateK: 36,
  contextK: 8,
  embeddingDims: 768,
  embeddingModel: 'gemini-embedding-001',
  maxChunksPerLecture: 3,
  maxLectureSelections: 24,
  maxQuestionLength: 500,
  minQuestionLength: 3,
} as const;

type LectureSourceRecord = {
  lectureKey: string;
  youtubeVideoId: string;
  courseId: string;
  periodId: string;
  periodTitle: string;
  lectureTitle: string;
  chunkCount: number;
  durationMs: number | null;
  active?: boolean;
};

type LectureChunkRecord = {
  lectureKey: string;
  youtubeVideoId: string;
  courseId: string;
  periodId: string;
  periodTitle: string;
  lectureTitle: string;
  chunkIndex: number;
  startMs: number;
  endMs: number;
  timestampLabel: string;
  text: string;
  normalizedText: string;
};

type LectureSearchMatch = LectureChunkRecord & {
  id: string;
  score: number;
};

type LectureCitationResponse = {
  chunkId: string;
  lectureKey: string;
  lectureTitle: string;
  courseId: string;
  periodId: string;
  periodTitle: string;
  youtubeVideoId: string;
  startMs: number;
  timestampLabel: string;
  excerpt: string;
  claim: string;
  path: string;
};

type ValidatedLectureScope = {
  courseId: string;
  lectureKeys: string[];
  query: string;
};

type LectureRetrievalMode = 'hybrid' | 'vector-only';

const TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION = 'searchChunks';

const SYSTEM_PROMPT = `Ты — преподаватель психологии. Отвечай на вопрос студента, опираясь ИСКЛЮЧИТЕЛЬНО на предоставленные фрагменты транскриптов лекций.

ПРАВИЛА:
1. Не выдумывай информацию вне источников.
2. Пиши на русском языке.
3. Ответ должен быть содержательным, но компактным: до 5 абзацев.
4. Не используй markdown, списки или технические ссылки в тексте ответа.
5. Ссылки на источники указывай только в массиве citations.

ФОРМАТ ОТВЕТА — строго JSON:
{
  "answer": "чистый текст ответа",
  "citations": [
    { "chunkId": "lecture-key::0", "claim": "к какому утверждению относится источник" }
  ]
}`;

let genaiClient: GoogleGenAI | null = null;

const SAFE_LECTURE_API_ERROR = 'Сервис лекций временно недоступен. Попробуйте ещё раз позже.';
const LECTURE_API_ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^https:\/\/psych-dev-site\.vercel\.app$/i,
  /^https:\/\/psych-dev-site(?:-[a-z0-9-]+)?-alexey-zykovs-projects\.vercel\.app$/i,
  /^https:\/\/psych-dev-site-git-[a-z0-9-]+-alexey-zykovs-projects\.vercel\.app$/i,
] as const;

const DEVELOPMENT_LESSON_PATHS: Record<string, string> = {
  intro: '/intro',
  prenatal: '/prenatal',
  infancy: '/0-1',
  toddler: '/1-3',
  preschool: '/3-6',
  'primary-school': '/7-9',
  earlyAdolescence: '/10-13',
  adolescence: '/14-18',
  emergingAdult: '/19-22',
  '22-27': '/22-27',
  earlyAdult: '/28-40',
  midlife: '/40-65',
  lateAdult: '/66-80',
  oldestOld: '/80-plus',
};

const CLINICAL_LESSON_PATHS: Record<string, string> = {
  'clinical-intro': '/clinical/intro',
  'clinical-1': '/clinical/1',
  'clinical-2': '/clinical/2',
  'clinical-3': '/clinical/3',
  'clinical-4': '/clinical/4',
  'clinical-5': '/clinical/5',
  'clinical-6': '/clinical/6',
  'clinical-7': '/clinical/7',
  'clinical-8': '/clinical/8',
  'clinical-9': '/clinical/9',
  'clinical-10': '/clinical/10',
};

const GENERAL_LESSON_PATHS: Record<string, string> = {
  'general-1': '/general/1',
  'general-2': '/general/2',
  'general-3': '/general/3',
  'general-4': '/general/4',
  'general-5': '/general/5',
  'general-6': '/general/6',
  'general-7': '/general/7',
  'general-8': '/general/8',
  'general-9': '/general/9',
  'general-10': '/general/10',
  'general-11': '/general/11',
  'general-12': '/general/12',
};

const DEVELOPMENT_PERIOD_ORDER: Record<string, number> = {
  intro: 0,
  prenatal: 1,
  infancy: 2,
  toddler: 3,
  preschool: 4,
  'primary-school': 5,
  school: 5,
  earlyAdolescence: 6,
  adolescence: 7,
  emergingAdult: 8,
  '22-27': 9,
  earlyAdult: 10,
  midlife: 11,
  lateAdult: 12,
  oldestOld: 13,
  seminary: 14,
};

const CLINICAL_PERIOD_ORDER: Record<string, number> = {
  'clinical-intro': 0,
  'clinical-1': 1,
  'clinical-2': 2,
  'clinical-3': 3,
  'clinical-4': 4,
  'clinical-5': 5,
  'clinical-6': 6,
  'clinical-7': 7,
  'clinical-8': 8,
  'clinical-9': 9,
  'clinical-10': 10,
  'rasstroystva-lichnosti': 11,
};

const GENERAL_PERIOD_ORDER: Record<string, number> = {
  'general-1': 0,
  'general-2': 1,
  'general-3': 2,
  'general-4': 3,
  'vnimanie-teorii': 4,
  'general-5': 5,
  'general-6': 6,
  'general-7': 7,
  'general-8': 8,
  'general-9': 9,
  'general-10': 10,
  'general-11': 11,
  'general-12': 12,
};

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return;
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!json) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not configured');
  }

  const sa = JSON.parse(json);
  initializeApp({ credential: cert(sa) });
}

function resolveLectureGeminiApiKey(req?: VercelRequest): string {
  const userKey = req?.headers['x-gemini-api-key'];
  if (typeof userKey === 'string' && userKey.trim()) {
    return userKey.trim();
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  return apiKey;
}

function getGenAI(apiKey?: string): GoogleGenAI {
  if (apiKey) {
    return new GoogleGenAI({ apiKey });
  }

  if (!genaiClient) {
    genaiClient = new GoogleGenAI({ apiKey: resolveLectureGeminiApiKey() });
  }

  return genaiClient;
}

export function getLectureApiAllowedOrigin(origin: string | undefined) {
  if (!origin) {
    return null;
  }

  return LECTURE_API_ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))
    ? origin
    : null;
}

function setLectureApiCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  const allowedOrigin = getLectureApiAllowedOrigin(origin);

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Gemini-Api-Key');
  return allowedOrigin;
}

async function verifyLectureApiAuth(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Требуется авторизация', code: 'UNAUTHORIZED' } as const;
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(authHeader.slice(7));
    return { valid: true, uid: decodedToken.uid } as const;
  } catch {
    return { valid: false, error: 'Недействительная авторизация', code: 'UNAUTHORIZED' } as const;
  }
}

function toSafeLectureApiError() {
  return SAFE_LECTURE_API_ERROR;
}

function getStaticCourseLessonPath(courseId: string, periodId: string) {
  if (courseId === 'development') {
    return DEVELOPMENT_LESSON_PATHS[periodId] ?? null;
  }

  if (courseId === 'clinical') {
    return CLINICAL_LESSON_PATHS[periodId] ?? null;
  }

  if (courseId === 'general') {
    return GENERAL_LESSON_PATHS[periodId] ?? null;
  }

  return null;
}

function getCoursePeriodOrder(courseId: string, periodId: string) {
  if (courseId === 'development') {
    return DEVELOPMENT_PERIOD_ORDER[periodId] ?? Number.MAX_SAFE_INTEGER;
  }

  if (courseId === 'clinical') {
    return CLINICAL_PERIOD_ORDER[periodId] ?? Number.MAX_SAFE_INTEGER;
  }

  if (courseId === 'general') {
    return GENERAL_PERIOD_ORDER[periodId] ?? Number.MAX_SAFE_INTEGER;
  }

  return Number.MAX_SAFE_INTEGER;
}

function compareLectureOrder(
  left: Pick<LectureSourceRecord, 'courseId' | 'periodId' | 'periodTitle' | 'lectureTitle'>,
  right: Pick<LectureSourceRecord, 'courseId' | 'periodId' | 'periodTitle' | 'lectureTitle'>
) {
  const orderDiff =
    getCoursePeriodOrder(left.courseId, left.periodId) -
    getCoursePeriodOrder(right.courseId, right.periodId);

  if (orderDiff !== 0) {
    return orderDiff;
  }

  const periodTitleDiff = left.periodTitle.localeCompare(right.periodTitle, 'ru');
  if (periodTitleDiff !== 0) {
    return periodTitleDiff;
  }

  return left.lectureTitle.localeCompare(right.lectureTitle, 'ru');
}

function buildCourseLessonPath(courseId: string, periodId: string) {
  const staticPath = getStaticCourseLessonPath(courseId, periodId);
  if (staticPath) {
    return staticPath;
  }

  if (courseId === 'development') {
    return `/${periodId}`;
  }

  if (courseId === 'clinical') {
    return `/clinical/${periodId}`;
  }

  if (courseId === 'general') {
    return `/general/${periodId}`;
  }

  return `/course/${encodeURIComponent(courseId)}/${encodeURIComponent(periodId)}`;
}

async function embedQuery(query: string, apiKey?: string): Promise<number[]> {
  const client = getGenAI(apiKey);
  const result = await client.models.embedContent({
    model: LECTURE_SEARCH_CONFIG.embeddingModel,
    contents: [{ role: 'user', parts: [{ text: query }] }],
    config: { outputDimensionality: LECTURE_SEARCH_CONFIG.embeddingDims },
  });

  const embedding = result.embeddings?.[0]?.values;
  if (!embedding) {
    throw new Error('Failed to get embedding');
  }

  return embedding;
}

function normalizeLectureKeys(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return [...new Set(
    input
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean)
  )].slice(0, LECTURE_SEARCH_CONFIG.maxLectureSelections);
}

function buildFallbackLectureKey(chunk: TranscriptSearchChunkRecord) {
  return `${chunk.courseId}::${chunk.periodId}::${chunk.youtubeVideoId}`;
}

function getQueryWords(query: string) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function matchesAllQueryWords(text: string, queryWords: string[]) {
  return queryWords.every((word) => text.includes(word));
}

export function computeLexicalScore(query: string, text: string) {
  const queryTerms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  if (!queryTerms.length) {
    return 0;
  }

  const haystack = text.toLowerCase();
  const matches = queryTerms.reduce((count, term) => {
    return count + (haystack.includes(term) ? 1 : 0);
  }, 0);

  return matches / queryTerms.length;
}

async function loadFallbackLectureSources(
  db: FirebaseFirestore.Firestore,
  courseId?: string
) {
  let query: FirebaseFirestore.Query = db.collectionGroup(TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION);
  if (courseId) {
    query = query.where('courseId', '==', courseId);
  }

  const snapshot = await query.get();
  const grouped = new Map<
    string,
    {
      lectureKey: string;
      youtubeVideoId: string;
      courseId: string;
      periodId: string;
      periodTitle: string;
      lectureTitle: string;
      chunkCount: number;
      durationMs: number | null;
      active: true;
    }
  >();

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as TranscriptSearchChunkRecord;
    const lectureKey = buildFallbackLectureKey(data);
    const current = grouped.get(lectureKey);

    if (current) {
      current.chunkCount += 1;
      current.durationMs = Math.max(current.durationMs ?? 0, data.endMs);
      return;
    }

    grouped.set(lectureKey, {
      lectureKey,
      youtubeVideoId: data.youtubeVideoId,
      courseId: data.courseId,
      periodId: data.periodId,
      periodTitle: data.periodTitle,
      lectureTitle: data.lectureTitle,
      chunkCount: 1,
      durationMs: data.endMs,
      active: true,
    });
  });

  return [...grouped.values()];
}

async function searchFallbackTranscriptChunks(
  db: FirebaseFirestore.Firestore,
  courseId: string,
  lectureKeys: string[],
  query: string,
  maxChunksPerLecture: number,
  contextK: number,
  computeScore: (query: string, text: string) => number
) {
  const snapshot = await db
    .collectionGroup(TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION)
    .where('courseId', '==', courseId)
    .get();

  const allowedLectureKeys = lectureKeys.length > 0 ? new Set(lectureKeys) : null;
  const queryWords = getQueryWords(query);

  const matches = snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as TranscriptSearchChunkRecord),
    }))
    .map((chunk) => ({
      ...chunk,
      lectureKey: buildFallbackLectureKey(chunk),
    }))
    .filter((chunk) => !allowedLectureKeys || allowedLectureKeys.has(chunk.lectureKey))
    .filter((chunk) => matchesAllQueryWords(chunk.normalizedText, queryWords))
    .map((chunk) => ({
      ...chunk,
      score: computeScore(query, chunk.normalizedText),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.startMs - b.startMs;
    });

  const perLecture = new Map<string, number>();
  const results: typeof matches = [];

  matches.forEach((match) => {
    const current = perLecture.get(match.lectureKey) ?? 0;
    if (current >= maxChunksPerLecture || results.length >= contextK) {
      return;
    }

    perLecture.set(match.lectureKey, current + 1);
    results.push(match);
  });

  return results;
}

export function buildLectureDeepLink(
  courseId: string,
  periodId: string,
  youtubeVideoId: string,
  startMs: number
) {
  const params = new URLSearchParams({
    panel: 'transcript',
    study: '1',
    t: String(Math.max(0, Math.floor(startMs / 1000))),
    video: youtubeVideoId,
  });

  return `${buildCourseLessonPath(courseId, periodId)}?${params.toString()}`;
}

export function groupLectureSourcesByCourse(sources: LectureSourceRecord[]) {
  const groups = new Map<string, LectureSourceRecord[]>();

  sources.forEach((source) => {
    const list = groups.get(source.courseId) ?? [];
    list.push(source);
    groups.set(source.courseId, list);
  });

  return [...groups.entries()]
    .sort(([courseA], [courseB]) => courseA.localeCompare(courseB, 'ru'))
    .map(([courseId, lectures]) => ({
      courseId,
      lectures: [...lectures].sort(compareLectureOrder),
    }));
}

function sortLectureCitations(citations: LectureCitationResponse[]) {
  return [...citations].sort((left, right) => {
    const lectureOrderDiff = compareLectureOrder(left, right);
    if (lectureOrderDiff !== 0) {
      return lectureOrderDiff;
    }

    return left.startMs - right.startMs;
  });
}

export function validateLectureScope(body: unknown):
  | { valid: true; value: ValidatedLectureScope }
  | { valid: false; error: string; code: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required', code: 'INVALID_BODY' };
  }

  const data = body as Record<string, unknown>;
  const query = typeof data.query === 'string' ? data.query.trim() : '';
  const courseId = typeof data.courseId === 'string' ? data.courseId.trim() : '';
  const lectureKeys = normalizeLectureKeys(data.lectureKeys);

  if (!courseId) {
    return { valid: false, error: 'courseId is required', code: 'VALIDATION_ERROR' };
  }

  if (query.length < LECTURE_SEARCH_CONFIG.minQuestionLength) {
    return { valid: false, error: 'Query too short', code: 'VALIDATION_ERROR' };
  }

  if (query.length > LECTURE_SEARCH_CONFIG.maxQuestionLength) {
    return { valid: false, error: 'Query too long', code: 'VALIDATION_ERROR' };
  }

  return {
    valid: true,
    value: {
      courseId,
      lectureKeys,
      query,
    },
  };
}

async function getLectureSourcesByCourse(
  db: FirebaseFirestore.Firestore,
  courseId: string
) {
  const snapshot = await db
    .collection(LECTURE_COLLECTIONS.sources)
    .where('courseId', '==', courseId)
    .where('active', '==', true)
    .get();

  return snapshot.docs.map((doc) => doc.data() as LectureSourceRecord);
}

async function getLectureSourcesByKeys(
  db: FirebaseFirestore.Firestore,
  courseId: string,
  lectureKeys: string[]
) {
  const refs = lectureKeys.map((lectureKey) => db.collection(LECTURE_COLLECTIONS.sources).doc(lectureKey));
  if (!refs.length) {
    return [];
  }

  const docs = await db.getAll(...refs);
  return docs
    .filter((doc) => doc.exists)
    .map((doc) => doc.data() as LectureSourceRecord)
    .filter((source) => source.active !== false && source.courseId === courseId);
}

async function resolveLectureSources(
  db: FirebaseFirestore.Firestore,
  courseId: string,
  lectureKeys: string[],
  mode: LectureRetrievalMode
) {
  const primarySources = lectureKeys.length > 0
    ? await getLectureSourcesByKeys(db, courseId, lectureKeys)
    : await getLectureSourcesByCourse(db, courseId);

  if (primarySources.length > 0 || mode === 'vector-only') {
    return {
      fallbackOnly: false,
      sources: primarySources,
    };
  }

  const fallbackSources = await loadFallbackLectureSources(db, courseId);
  const filteredFallbackSources = lectureKeys.length > 0
    ? fallbackSources.filter((source) => lectureKeys.includes(source.lectureKey))
    : fallbackSources;

  return {
    fallbackOnly: true,
    sources: filteredFallbackSources,
  };
}

async function searchChunksForCourse(
  db: FirebaseFirestore.Firestore,
  courseId: string,
  embedding: number[]
) {
  const snapshot = await db
    .collection(LECTURE_COLLECTIONS.chunks)
    .where('courseId', '==', courseId)
    .findNearest('embedding', FieldValue.vector(embedding), {
      distanceMeasure: 'COSINE',
      limit: LECTURE_SEARCH_CONFIG.candidateK,
    })
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as LectureChunkRecord),
  }));
}

async function searchChunksForLectures(
  db: FirebaseFirestore.Firestore,
  lectureKeys: string[],
  embedding: number[]
) {
  const perLectureLimit = Math.max(
    2,
    Math.ceil(LECTURE_SEARCH_CONFIG.candidateK / Math.max(lectureKeys.length, 1))
  );

  const snapshots = await Promise.all(
    lectureKeys.map((lectureKey) =>
      db
        .collection(LECTURE_COLLECTIONS.chunks)
        .where('lectureKey', '==', lectureKey)
        .findNearest('embedding', FieldValue.vector(embedding), {
          distanceMeasure: 'COSINE',
          limit: perLectureLimit,
        })
        .get()
    )
  );

  return snapshots.flatMap((snapshot) =>
    snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as LectureChunkRecord),
    }))
  );
}

function rerankLectureMatches(query: string, matches: Array<{ id: string } & LectureChunkRecord>) {
  return matches
    .map((match, index) => {
      const vectorScore = 1 - (index / Math.max(matches.length, 1)) * 0.5;
      const lexicalScore = computeLexicalScore(query, match.normalizedText || match.text);

      return {
        ...match,
        score: vectorScore * 0.7 + lexicalScore * 0.3,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.startMs - b.startMs;
    });
}

function capMatchesPerLecture(matches: LectureSearchMatch[]) {
  const perLecture = new Map<string, number>();
  const capped: LectureSearchMatch[] = [];

  matches.forEach((match) => {
    const current = perLecture.get(match.lectureKey) ?? 0;
    if (current >= LECTURE_SEARCH_CONFIG.maxChunksPerLecture) {
      return;
    }

    perLecture.set(match.lectureKey, current + 1);
    capped.push(match);
  });

  return capped.slice(0, LECTURE_SEARCH_CONFIG.contextK);
}

async function retrieveLectureMatches(
  db: FirebaseFirestore.Firestore,
  input: ValidatedLectureScope,
  mode: LectureRetrievalMode = 'hybrid',
  apiKey?: string
) {
  const { sources, fallbackOnly } = await resolveLectureSources(
    db,
    input.courseId,
    input.lectureKeys,
    mode
  );

  if (!sources.length) {
    return {
      fallbackOnly,
      matches: [] as LectureSearchMatch[],
      sources: [] as LectureSourceRecord[],
    };
  }

  const allowedKeys = new Set(sources.map((source) => source.lectureKey));

  if (fallbackOnly) {
    const fallbackMatches = await searchFallbackTranscriptChunks(
      db,
      input.courseId,
      [...allowedKeys],
      input.query,
      LECTURE_SEARCH_CONFIG.maxChunksPerLecture,
      LECTURE_SEARCH_CONFIG.contextK,
      computeLexicalScore
    );

    return {
      fallbackOnly,
      matches: fallbackMatches,
      sources,
    };
  }

  let rerankedMatches: LectureSearchMatch[] = [];

  try {
    const queryEmbedding = await embedQuery(input.query, apiKey);
    const rawMatches = input.lectureKeys.length > 0
      ? await searchChunksForLectures(db, [...allowedKeys], queryEmbedding)
      : await searchChunksForCourse(db, input.courseId, queryEmbedding);

    const filteredMatches = rawMatches.filter((match) => allowedKeys.has(match.lectureKey));
    rerankedMatches = rerankLectureMatches(input.query, filteredMatches);
  } catch (error) {
    if (mode === 'vector-only') {
      throw error;
    }

    const fallbackMatches = await searchFallbackTranscriptChunks(
      db,
      input.courseId,
      [...allowedKeys],
      input.query,
      LECTURE_SEARCH_CONFIG.maxChunksPerLecture,
      LECTURE_SEARCH_CONFIG.contextK,
      computeLexicalScore
    );

    return {
      fallbackOnly: true,
      matches: fallbackMatches,
      sources,
    };
  }

  return {
    fallbackOnly: false,
    matches: capMatchesPerLecture(rerankedMatches),
    sources,
  };
}

export function buildLectureAiUnavailableMessage() {
  return 'Для выбранных лекций ещё не подготовлены данные для ответа ИИ. Попробуйте выбрать другие лекции или весь курс.';
}

function buildLectureContext(match: LectureSearchMatch) {
  return `[SOURCE chunkId="${match.id}" lecture="${match.lectureTitle}" period="${match.periodTitle}" timestamp="${match.timestampLabel}"]
${match.text}
[/SOURCE]`;
}

function stripJsonTrailingCommas(value: string) {
  return value.replace(/,\s*([}\]])/g, '$1');
}

export function tryParseLectureGeminiJson(rawText: string) {
  const trimmed = rawText.trim();
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const candidate = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed.replace(/```json\s*\n?|\n?```/g, '').trim();
  const jsonText = candidate.startsWith('{')
    ? candidate
    : (candidate.match(/\{[\s\S]*\}/)?.[0] ?? candidate);

  try {
    return JSON.parse(stripJsonTrailingCommas(jsonText)) as {
      answer: string;
      citations: Array<{ chunkId: string; claim: string }>;
    };
  } catch {
    return null;
  }
}

function sanitizeLectureAnswer(answer: string) {
  return answer
    .replace(/\[SOURCE[^\]]*\]/gi, '')
    .replace(/\[\/SOURCE\]/gi, '')
    .replace(/\[chunkId[=:][^\]]+\]/gi, '')
    .replace(/\(chunkId[=:][^\)]+\)/gi, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/^\s*\d+\.\s*/gm, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = setLectureApiCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    if (req.headers.origin && !allowedOrigin) {
      res.status(403).json({ ok: false, error: 'Origin not allowed' });
      return;
    }

    res.status(200).end();
    return;
  }

  try {
    initFirebaseAdmin();
    const db = getFirestore();
    const action = (req.query.action as string) || (req.body?.action as string) || '';
    const authResult = await verifyLectureApiAuth(req);

    if (!authResult.valid) {
      res.status(401).json({ ok: false, error: authResult.error, code: authResult.code });
      return;
    }

    if (action === 'list' && req.method === 'GET') {
      const snapshot = await db
        .collection(LECTURE_COLLECTIONS.sources)
        .where('active', '==', true)
        .get();

      const sources = snapshot.empty
        ? await loadFallbackLectureSources(db)
        : snapshot.docs.map((doc) => doc.data() as LectureSourceRecord);
      res.status(200).json({
        ok: true,
        courses: groupLectureSourcesByCourse(sources),
      });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const validation = validateLectureScope(req.body);
    if (!validation.valid) {
      res.status(400).json({ ok: false, error: validation.error, code: validation.code });
      return;
    }

    if (action === 'search') {
      const startedAt = Date.now();
      const { matches, sources } = await retrieveLectureMatches(
        db,
        validation.value,
        'hybrid',
        resolveLectureGeminiApiKey(req)
      );

      const results = matches.map((match) => ({
        chunkId: match.id,
        lectureKey: match.lectureKey,
        courseId: match.courseId,
        periodId: match.periodId,
        periodTitle: match.periodTitle,
        lectureTitle: match.lectureTitle,
        youtubeVideoId: match.youtubeVideoId,
        startMs: match.startMs,
        endMs: match.endMs,
        timestampLabel: match.timestampLabel,
        excerpt: match.text,
        score: Math.round(match.score * 100) / 100,
        path: buildLectureDeepLink(match.courseId, match.periodId, match.youtubeVideoId, match.startMs),
      }));

      res.status(200).json({
        ok: true,
        lectures: sources,
        results,
        tookMs: Date.now() - startedAt,
      });
      return;
    }

    if (action === 'answer') {
      const startedAt = Date.now();
      const apiKey = resolveLectureGeminiApiKey(req);
      const { matches, sources } = await retrieveLectureMatches(db, validation.value, 'vector-only', apiKey);

      if (!sources.length) {
        res.status(200).json({
          ok: true,
          answer: buildLectureAiUnavailableMessage(),
          citations: [],
          tookMs: Date.now() - startedAt,
        });
        return;
      }

      if (!matches.length) {
        res.status(200).json({
          ok: true,
          answer: 'В выбранных лекциях не нашлось релевантных фрагментов для ответа на этот вопрос.',
          citations: [],
          tookMs: Date.now() - startedAt,
        });
        return;
      }

      const prompt = `${SYSTEM_PROMPT}

ИСТОЧНИКИ:
${matches.map(buildLectureContext).join('\n\n')}

ВОПРОС: ${validation.value.query}`;

      const client = getGenAI(apiKey);
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 4000, temperature: 0.3 },
      });

      const rawText = result.text || '';
      const parsed = tryParseLectureGeminiJson(rawText) ?? {
        answer: rawText || 'Не удалось сгенерировать ответ. Попробуйте переформулировать вопрос.',
        citations: [],
      };

      const chunkMap = new Map(matches.map((match) => [match.id, match]));
      const citations = sortLectureCitations((parsed.citations || [])
        .filter((citation) => chunkMap.has(citation.chunkId))
        .map((citation) => {
          const match = chunkMap.get(citation.chunkId)!;
          return {
            chunkId: citation.chunkId,
            lectureKey: match.lectureKey,
            lectureTitle: match.lectureTitle,
            courseId: match.courseId,
            periodId: match.periodId,
            periodTitle: match.periodTitle,
            youtubeVideoId: match.youtubeVideoId,
            startMs: match.startMs,
            timestampLabel: match.timestampLabel,
            excerpt: match.text,
            claim: citation.claim || '',
            path: buildLectureDeepLink(match.courseId, match.periodId, match.youtubeVideoId, match.startMs),
          };
        }));

      res.status(200).json({
        ok: true,
        answer: sanitizeLectureAnswer(parsed.answer || ''),
        citations,
        tookMs: Date.now() - startedAt,
      });
      return;
    }

    res.status(400).json({ ok: false, error: 'Invalid action' });
  } catch (error) {
    res.status(500).json({ ok: false, error: toSafeLectureApiError() });
  }
}
