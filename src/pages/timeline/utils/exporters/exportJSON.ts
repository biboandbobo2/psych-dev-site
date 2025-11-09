import type { TimelineExportPayload } from './common';
import { downloadBlob, generateFilename } from './common';

export function exportTimelineJSON(data: TimelineExportPayload, filename?: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename || generateFilename('json'));
}
