import type { Timestamp } from 'firebase/firestore';
import type {
  TranscriptRefreshJobDocShape,
  TranscriptRefreshJobRunDocShape,
  VideoTranscriptDocShape,
  VideoTranscriptSearchChunkDocShape,
  VideoTranscriptSearchDocShape,
} from '../../shared/videoTranscripts/schema.js';

export {
  VIDEO_TRANSCRIPT_JOBS_COLLECTION,
  VIDEO_TRANSCRIPT_JOB_RUNS_SUBCOLLECTION,
  VIDEO_TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION,
  VIDEO_TRANSCRIPT_SEARCH_COLLECTION,
  VIDEO_TRANSCRIPT_SEARCH_VERSION,
  VIDEO_TRANSCRIPTS_COLLECTION,
  VIDEO_TRANSCRIPT_STORAGE_PREFIX,
  VIDEO_TRANSCRIPT_VERSION,
  WEEKLY_TRANSCRIPT_REFRESH_JOB,
  type TranscriptRefreshJobStatus,
  type VideoTranscriptRetryFields,
  type VideoTranscriptSegment,
  type VideoTranscriptSearchChunk,
  type VideoTranscriptStatus,
  type VideoTranscriptStoragePayload,
} from '../../shared/videoTranscripts/schema.js';

export type VideoTranscriptDoc = VideoTranscriptDocShape<Timestamp>;
export type VideoTranscriptSearchDoc = VideoTranscriptSearchDocShape<Timestamp>;
export type VideoTranscriptSearchChunkDoc = VideoTranscriptSearchChunkDocShape<Timestamp>;
export type TranscriptRefreshJobDoc = TranscriptRefreshJobDocShape<Timestamp>;
export type TranscriptRefreshJobRunDoc = TranscriptRefreshJobRunDocShape<Timestamp>;
