import type { Timestamp } from 'firebase/firestore';
import type {
  TranscriptRefreshJobDocShape,
  TranscriptRefreshJobRunDocShape,
  VideoTranscriptDocShape,
} from '../../shared/videoTranscripts/schema';

export {
  VIDEO_TRANSCRIPT_JOBS_COLLECTION,
  VIDEO_TRANSCRIPT_JOB_RUNS_SUBCOLLECTION,
  VIDEO_TRANSCRIPTS_COLLECTION,
  VIDEO_TRANSCRIPT_STORAGE_PREFIX,
  VIDEO_TRANSCRIPT_VERSION,
  WEEKLY_TRANSCRIPT_REFRESH_JOB,
  type TranscriptRefreshJobStatus,
  type VideoTranscriptRetryFields,
  type VideoTranscriptSegment,
  type VideoTranscriptStatus,
  type VideoTranscriptStoragePayload,
} from '../../shared/videoTranscripts/schema';

export type VideoTranscriptDoc = VideoTranscriptDocShape<Timestamp>;
export type TranscriptRefreshJobDoc = TranscriptRefreshJobDocShape<Timestamp>;
export type TranscriptRefreshJobRunDoc = TranscriptRefreshJobRunDocShape<Timestamp>;
