export const LECTURE_RAG_SOURCES_COLLECTION = "lecture_sources";
export const LECTURE_RAG_CHUNKS_COLLECTION = "lecture_chunks";
export const LECTURE_RAG_VERSION = 1;

export interface LectureRagChunk {
  chunkIndex: number;
  endMs: number;
  normalizedText: string;
  segmentCount: number;
  startMs: number;
  text: string;
  timestampLabel: string;
}

export interface LectureRagSourceDocShape<TTimestamp> {
  lectureKey: string;
  youtubeVideoId: string;
  courseId: string;
  periodId: string;
  periodTitle: string;
  lectureTitle: string;
  sourcePath: string;
  sourceUrl: string;
  active: boolean;
  chunkCount: number;
  transcriptSegmentCount: number;
  durationMs: number | null;
  updatedAt: TTimestamp;
  version: number;
}

export interface LectureRagChunkDocShape<TTimestamp, TVector = number[]> {
  lectureKey: string;
  youtubeVideoId: string;
  courseId: string;
  periodId: string;
  periodTitle: string;
  lectureTitle: string;
  sourcePath: string;
  sourceUrl: string;
  chunkIndex: number;
  startMs: number;
  endMs: number;
  timestampLabel: string;
  segmentCount: number;
  text: string;
  normalizedText: string;
  embedding: TVector;
  updatedAt: TTimestamp;
  version: number;
}
