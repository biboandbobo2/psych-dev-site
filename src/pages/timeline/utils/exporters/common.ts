/**
 * Common types and utilities for timeline export
 */
import type { BirthDetails, EdgeT, NodeT, TimelineData } from '../../types';

// Re-export from submodules for backwards compatibility
export { renderSvgToCanvas } from './svgRenderer';
export { buildPdfWithImage } from './pdfBuilder';

/**
 * Payload for timeline export operations
 */
export type TimelineExportPayload = {
  currentAge: number;
  ageMax: number;
  nodes: NodeT[];
  edges: EdgeT[];
  birthDetails: BirthDetails;
  selectedPeriodization: TimelineData['selectedPeriodization'];
};

/**
 * Generates a unique filename with timestamp
 * Format: timeline_2024-01-15_14-30-45.ext
 */
export function generateFilename(extension: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `timeline_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.${extension}`;
}

const EXPORT_DEBUG =
  typeof window !== 'undefined' &&
  (window as unknown as Record<string, unknown>).__TIMELINE_EXPORT_DEBUG__ !== false &&
  import.meta.env.DEV;

/**
 * Debug logging for export operations (only in dev mode)
 */
export function debugExport(...args: unknown[]) {
  if (EXPORT_DEBUG) {
    console.log('[timeline-export]', ...args);
  }
}

/**
 * Downloads a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Converts a canvas to a blob
 */
export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Converts a data URI to Uint8Array
 */
export function dataUriToUint8Array(dataUri: string) {
  const base64 = dataUri.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
