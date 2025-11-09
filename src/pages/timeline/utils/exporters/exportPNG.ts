import { canvasToBlob, debugExport, downloadBlob, generateFilename, renderSvgToCanvas } from './common';

export async function exportTimelinePNG(svg: SVGSVGElement, filename?: string) {
  debugExport('Starting PNG export');
  const { canvas } = await renderSvgToCanvas(svg);
  const blob = await canvasToBlob(canvas, 'image/png', 1);
  downloadBlob(blob, filename || generateFilename('png'));
  debugExport('PNG export complete');
}
