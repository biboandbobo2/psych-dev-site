// Lecture retrieval pipeline для /api/lectures: вычисление embedding,
// валидация scope, подбор источников (DB + fallback), vector search в
// Firestore с rerank vector + lexical, cap per lecture.

import { FieldValue } from 'firebase-admin/firestore';
import {
  buildCourseLessonPath,
  compareLectureOrder,
} from './lectureCourseConfig.js';
import {
  computeLexicalScore,
  loadFallbackLectureSources,
  searchFallbackTranscriptChunks,
} from './lectureFallback.js';
import { getLectureGenAiClient } from './lectureApiRuntime.js';

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

export type LectureSourceRecord = {
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

export type LectureChunkRecord = {
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

type LectureSearchMatchRecord = Omit<LectureChunkRecord, 'chunkIndex'> & {
  chunkIndex?: number;
};

export type LectureSearchMatch = LectureSearchMatchRecord & {
  id: string;
  score: number;
};

export type LectureCitationResponse = {
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

export type ValidatedLectureScope = {
  courseId: string;
  lectureKeys: string[];
  query: string;
};

export type LectureRetrievalMode = 'hybrid' | 'vector-only';

async function embedQuery(query: string, apiKey?: string): Promise<number[]> {
  const client = getLectureGenAiClient(apiKey);
  const result = await client.models.embedContent({
    model: LECTURE_SEARCH_CONFIG.embeddingModel,
    contents: [{ role: 'user', parts: [{ text: query }] }],
    config: { outputDimensionality: LECTURE_SEARCH_CONFIG.embeddingDims },
  });

  const embedding = result.embeddings?.[0]?.values;
  if (!embedding) throw new Error('Failed to get embedding');
  return embedding;
}

function normalizeLectureKeys(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [
    ...new Set(
      input
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].slice(0, LECTURE_SEARCH_CONFIG.maxLectureSelections);
}

export function buildLectureDeepLink(
  courseId: string,
  periodId: string,
  youtubeVideoId: string,
  startMs: number,
): string {
  const params = new URLSearchParams({
    panel: 'transcript',
    study: '1',
    t: String(Math.max(0, Math.floor(startMs / 1000))),
    video: youtubeVideoId,
  });

  return `${buildCourseLessonPath(courseId, periodId)}?${params.toString()}`;
}

export function sortLectureCitations(
  citations: LectureCitationResponse[],
): LectureCitationResponse[] {
  return [...citations].sort((left, right) => {
    const lectureOrderDiff = compareLectureOrder(left, right);
    if (lectureOrderDiff !== 0) return lectureOrderDiff;
    return left.startMs - right.startMs;
  });
}

export function validateLectureScope(
  body: unknown,
):
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

  return { valid: true, value: { courseId, lectureKeys, query } };
}

async function getLectureSourcesByCourse(
  db: FirebaseFirestore.Firestore,
  courseId: string,
): Promise<LectureSourceRecord[]> {
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
  lectureKeys: string[],
): Promise<LectureSourceRecord[]> {
  const refs = lectureKeys.map((lectureKey) =>
    db.collection(LECTURE_COLLECTIONS.sources).doc(lectureKey),
  );
  if (!refs.length) return [];

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
  mode: LectureRetrievalMode,
): Promise<{ fallbackOnly: boolean; sources: LectureSourceRecord[] }> {
  const primarySources =
    lectureKeys.length > 0
      ? await getLectureSourcesByKeys(db, courseId, lectureKeys)
      : await getLectureSourcesByCourse(db, courseId);

  if (primarySources.length > 0 || mode === 'vector-only') {
    return { fallbackOnly: false, sources: primarySources };
  }

  const fallbackSources = await loadFallbackLectureSources(db, courseId);
  const filteredFallbackSources =
    lectureKeys.length > 0
      ? fallbackSources.filter((source) => lectureKeys.includes(source.lectureKey))
      : fallbackSources;

  return { fallbackOnly: true, sources: filteredFallbackSources };
}

async function searchChunksForCourse(
  db: FirebaseFirestore.Firestore,
  courseId: string,
  embedding: number[],
) {
  const snapshot = await db
    .collection(LECTURE_COLLECTIONS.chunks)
    .where('courseId', '==', courseId)
    .findNearest('embedding', FieldValue.vector(embedding), {
      distanceMeasure: 'COSINE',
      limit: LECTURE_SEARCH_CONFIG.candidateK,
    })
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as LectureChunkRecord) }));
}

async function searchChunksForLectures(
  db: FirebaseFirestore.Firestore,
  lectureKeys: string[],
  embedding: number[],
) {
  const perLectureLimit = Math.max(
    2,
    Math.ceil(LECTURE_SEARCH_CONFIG.candidateK / Math.max(lectureKeys.length, 1)),
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
        .get(),
    ),
  );

  return snapshots.flatMap((snapshot) =>
    snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as LectureChunkRecord) })),
  );
}

function rerankLectureMatches(
  query: string,
  matches: Array<{ id: string } & LectureSearchMatchRecord>,
): LectureSearchMatch[] {
  return matches
    .map((match, index) => {
      const vectorScore = 1 - (index / Math.max(matches.length, 1)) * 0.5;
      const lexicalScore = computeLexicalScore(query, match.normalizedText || match.text);
      return { ...match, score: vectorScore * 0.7 + lexicalScore * 0.3 };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.startMs - b.startMs;
    });
}

function capMatchesPerLecture(matches: LectureSearchMatch[]): LectureSearchMatch[] {
  const perLecture = new Map<string, number>();
  const capped: LectureSearchMatch[] = [];

  matches.forEach((match) => {
    const current = perLecture.get(match.lectureKey) ?? 0;
    if (current >= LECTURE_SEARCH_CONFIG.maxChunksPerLecture) return;
    perLecture.set(match.lectureKey, current + 1);
    capped.push(match);
  });

  return capped.slice(0, LECTURE_SEARCH_CONFIG.contextK);
}

/**
 * Полный pipeline retrieval: resolve sources (с fallback при отсутствии) →
 * embedding → vector search → rerank vector/lexical 0.7/0.3 → cap по
 * лекции и contextK. Mode 'vector-only' отключает fallback и пробрасывает
 * ошибки embedding наверх (для action=answer).
 */
export async function retrieveLectureMatches(
  db: FirebaseFirestore.Firestore,
  input: ValidatedLectureScope,
  mode: LectureRetrievalMode = 'hybrid',
  apiKey?: string,
): Promise<{
  fallbackOnly: boolean;
  matches: LectureSearchMatch[];
  sources: LectureSourceRecord[];
}> {
  const { sources, fallbackOnly } = await resolveLectureSources(
    db,
    input.courseId,
    input.lectureKeys,
    mode,
  );

  if (!sources.length) {
    return { fallbackOnly, matches: [] as LectureSearchMatch[], sources: [] };
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
      computeLexicalScore,
    );
    return { fallbackOnly, matches: fallbackMatches, sources };
  }

  let rerankedMatches: LectureSearchMatch[] = [];

  try {
    const queryEmbedding = await embedQuery(input.query, apiKey);
    const rawMatches =
      input.lectureKeys.length > 0
        ? await searchChunksForLectures(db, [...allowedKeys], queryEmbedding)
        : await searchChunksForCourse(db, input.courseId, queryEmbedding);

    const filteredMatches = rawMatches.filter((match) => allowedKeys.has(match.lectureKey));
    rerankedMatches = rerankLectureMatches(input.query, filteredMatches);
  } catch (error) {
    if (mode === 'vector-only') throw error;

    const fallbackMatches = await searchFallbackTranscriptChunks(
      db,
      input.courseId,
      [...allowedKeys],
      input.query,
      LECTURE_SEARCH_CONFIG.maxChunksPerLecture,
      LECTURE_SEARCH_CONFIG.contextK,
      computeLexicalScore,
    );
    return { fallbackOnly: true, matches: fallbackMatches, sources };
  }

  return {
    fallbackOnly: false,
    matches: capMatchesPerLecture(rerankedMatches),
    sources,
  };
}
