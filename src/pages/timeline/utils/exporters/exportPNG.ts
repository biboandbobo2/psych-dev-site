import {
  canvasToBlob,
  computeExportTopAge,
  debugExport,
  downloadBlob,
  generateFilename,
  renderSvgToCanvas,
} from './common';
import type { TimelineExportPayload } from './common';

export async function exportTimelinePNG(
  svg: SVGSVGElement,
  data?: TimelineExportPayload,
  filename?: string
) {
  debugExport('Starting PNG export');
  const topAge = data ? computeExportTopAge(data) : undefined;
  const { canvas } = await renderSvgToCanvas(svg, { topAge });
  const blob = await canvasToBlob(canvas, 'image/png', 1);
  downloadBlob(blob, filename || generateFilename('png'));
  debugExport('PNG export complete');
}
