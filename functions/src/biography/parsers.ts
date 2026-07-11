/**
 * Re-export канонических парсеров из shared server/api — раньше здесь была
 * дублированная копия (см. server/api/timelineBiographyParsers.ts).
 */
export {
  VALID_BIOGRAPHY_THEMES,
  parseSimpleJsonFacts,
  deduplicateFacts,
  parseAnnotationResponse,
  parseRedakturaResponse,
  parseMergedMarkupResponse,
  parseMergedMarkupJsonResponse,
  type AnnotationEntry,
  type MergedMarkupEntry,
} from '../../../server/api/timelineBiographyParsers.js';
