const TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION = 'searchChunks';

type TranscriptSearchChunkRecord = {
  youtubeVideoId: string;
  courseId: string;
  periodId: string;
  periodTitle: string;
  lectureTitle: string;
  startMs: number;
  endMs: number;
  timestampLabel: string;
  text: string;
  normalizedText: string;
};

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

export async function loadFallbackLectureSources(
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

export async function searchFallbackTranscriptChunks(
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
