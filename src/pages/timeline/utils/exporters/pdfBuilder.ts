/**
 * PDF generation utilities for timeline export
 */
import type { Periodization } from '../../data/periodizations';
import type { TimelineExportPayload } from './common';

/**
 * Builds a PDF document with an embedded JPEG image
 */
export function buildPdfWithImage(
  imageBytes: Uint8Array,
  widthPx: number,
  heightPx: number,
  _periodization: Periodization | null,
  _data: TimelineExportPayload
) {
  const textEncoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];

  function pushString(str: string) {
    chunks.push(textEncoder.encode(str));
  }

  function pushUint8Array(arr: Uint8Array) {
    chunks.push(arr);
  }

  function currentOffset() {
    return chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  }

  pushString('%PDF-1.4\n');

  function addObject(content: string) {
    offsets.push(currentOffset());
    pushString(`${content}\n`);
  }

  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const margin = 36;

  const pxToPt = 72 / 96;
  const imageWidthPt = widthPx * pxToPt;
  const imageHeightPt = heightPx * pxToPt;
  const maxImageWidth = pageWidth - margin * 2;
  const maxImageHeight = pageHeight - margin * 2;
  const scale = Math.min(maxImageWidth / imageWidthPt, maxImageHeight / imageHeightPt, 1);
  const finalImageWidth = imageWidthPt * scale;
  const finalImageHeight = imageHeightPt * scale;
  const imageX = (pageWidth - finalImageWidth) / 2;
  const imageY = margin;

  const contentStream = buildContentStream([], pageHeight - margin - 20, finalImageWidth, finalImageHeight, imageX, imageY);
  const contentLength = contentStream.length;

  addObject('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  addObject('2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj');
  addObject(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(
      2
    )}] /Contents 4 0 R /Resources << /Font << /F1 6 0 R >> /XObject << /Im1 5 0 R >> >> >>\nendobj`
  );

  offsets.push(currentOffset());
  pushString(`4 0 obj\n<< /Length ${contentLength} >>\nstream\n`);
  pushUint8Array(contentStream);
  pushString('\nendstream\nendobj\n');

  offsets.push(currentOffset());
  pushString(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`
  );
  pushUint8Array(imageBytes);
  pushString('\nendstream\nendobj\n');

  addObject('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');

  const xrefOffset = currentOffset();
  let xref = `xref\n0 ${offsets.length + 1}\n`;
  xref += '0000000000 65535 f \n';
  offsets.forEach((offset) => {
    xref += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  pushString(xref);
  pushString(`trailer\n<< /Root 1 0 R /Size ${offsets.length + 1} >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let position = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, position);
    position += chunk.length;
  });
  return output;
}

function buildContentStream(
  textLines: string[],
  textStartY: number,
  imageWidth: number,
  imageHeight: number,
  imageX: number,
  imageY: number
) {
  const textEncoder = new TextEncoder();
  const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const lines: string[] = [];
  if (textLines.length) {
    lines.push('BT');
    lines.push('/F1 12 Tf');
    lines.push('14 TL');
    lines.push(`1 0 0 1 ${50} ${textStartY.toFixed(2)} Tm`);
    textLines.forEach((line, index) => {
      if (index === 0) {
        lines.push(`(${escape(line)}) Tj`);
      } else {
        lines.push('T*');
        lines.push(`(${escape(line)}) Tj`);
      }
    });
    lines.push('ET');
  }
  lines.push('q');
  lines.push(`${imageWidth.toFixed(2)} 0 0 ${imageHeight.toFixed(2)} ${imageX.toFixed(2)} ${imageY.toFixed(2)} cm`);
  lines.push('/Im1 Do');
  lines.push('Q');
  const content = lines.join('\n');
  return textEncoder.encode(content);
}
