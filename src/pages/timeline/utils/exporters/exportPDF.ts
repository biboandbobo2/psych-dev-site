import type { Periodization } from '../../data/periodizations';
import type { TimelineExportPayload } from './common';
import {
  buildPdfWithImage,
  dataUriToUint8Array,
  debugExport,
  downloadBlob,
  generateFilename,
  renderSvgToCanvas,
} from './common';

export async function exportTimelinePDF(
  svg: SVGSVGElement,
  data: TimelineExportPayload,
  periodization: Periodization | null,
  filename?: string
) {
  debugExport('Starting PDF export');
  const { canvas, width, height } = await renderSvgToCanvas(svg);
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const jpegBytes = dataUriToUint8Array(jpegDataUrl);
  const pdfBytes = buildPdfWithImage(jpegBytes, width, height, periodization, data);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  downloadBlob(blob, filename || generateFilename('pdf'));
  debugExport('PDF export complete');
}
