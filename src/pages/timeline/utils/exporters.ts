import type { BirthDetails, EdgeT, NodeT, TimelineData } from '../types';
import type { Periodization } from '../data/periodizations';

export type TimelineExportPayload = {
  currentAge: number;
  ageMax: number;
  nodes: NodeT[];
  edges: EdgeT[];
  birthDetails: BirthDetails;
  selectedPeriodization: TimelineData['selectedPeriodization'];
};

const JSON_FILENAME = 'timeline.json';
const PNG_FILENAME = 'timeline.png';
const PDF_FILENAME = 'timeline.pdf';

export function exportTimelineJSON(data: TimelineExportPayload, filename = JSON_FILENAME) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export async function exportTimelinePNG(svg: SVGSVGElement, filename = PNG_FILENAME) {
  const { canvas } = await renderSvgToCanvas(svg);
  const blob = await canvasToBlob(canvas, 'image/png', 1);
  downloadBlob(blob, filename);
}

export async function exportTimelinePDF(
  svg: SVGSVGElement,
  data: TimelineExportPayload,
  periodization: Periodization | null,
  filename = PDF_FILENAME
) {
  const { canvas, width, height } = await renderSvgToCanvas(svg);
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const jpegBytes = dataUriToUint8Array(jpegDataUrl);
  const pdfBytes = buildPdfWithImage(jpegBytes, width, height, periodization, data);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function renderSvgToCanvas(svg: SVGSVGElement) {
  const { serializedSvg, width, height } = await serializeSvg(svg);
  const svgBlob = new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(url);
    const ratio = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context unavailable');
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    return { canvas, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function serializeSvg(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;

  const DEFAULT_WIDTH = Number(svg.dataset.worldWidth ?? 4000);
  const DEFAULT_HEIGHT = Number(svg.dataset.worldHeight ?? 100 * 80 + 500);
  const PADDING_X = 160;
  const PADDING_TOP = 160;
  const PADDING_BOTTOM = 480;

  const width = DEFAULT_WIDTH + PADDING_X * 2;
  const height = DEFAULT_HEIGHT + PADDING_TOP + PADDING_BOTTOM;

  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', `-${PADDING_X} -${PADDING_TOP} ${width} ${height}`);

  const exportRoot = clone.querySelector<SVGGElement>('[data-export-root="true"]');
  if (exportRoot) {
    exportRoot.setAttribute('transform', `translate(${PADDING_X},${PADDING_TOP}) scale(1)`);
  }

  clone.querySelectorAll('text').forEach((textNode) => {
    textNode.setAttribute('font-family', 'Manrope, sans-serif');
  });

  await inlineImages(clone);

  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(clone);

  if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) {
    source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!source.includes('xmlns:xlink=')) {
    source = source.replace('<svg', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }
  source = `<?xml version="1.0" standalone="no"?>\n${source}`;

  return { serializedSvg: source, width, height };
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob from canvas'));
      }
    }, type, quality);
  });
}

function dataUriToUint8Array(dataUri: string) {
  const base64 = dataUri.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function buildPdfWithImage(
  imageBytes: Uint8Array,
  widthPx: number,
  heightPx: number,
  periodization: Periodization | null,
  data: TimelineExportPayload
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
  lines.push(
    `${imageWidth.toFixed(2)} 0 0 ${imageHeight.toFixed(2)} ${imageX.toFixed(2)} ${imageY.toFixed(2)} cm`
  );
  lines.push('/Im1 Do');
  lines.push('Q');
  const content = lines.join('\n');
  return textEncoder.encode(content);
}

function sanitizeText(text: string) {
  return text.replace(/[^\x20-\x7E]/g, '?');
}

async function inlineImages(svgClone: SVGSVGElement) {
  const imageNodes = Array.from(svgClone.querySelectorAll<SVGImageElement>('image'));
  const cache = new Map<string, string>();

  await Promise.all(
    imageNodes.map(async (imageNode) => {
      const hrefAttr =
        imageNode.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ||
        imageNode.getAttribute('href');
      if (!hrefAttr) return;

      if (hrefAttr.startsWith('data:')) return;

      let absoluteUrl = hrefAttr;
      if (hrefAttr.startsWith('http')) {
        absoluteUrl = hrefAttr;
      } else if (hrefAttr.startsWith('/')) {
        absoluteUrl = `${window.location.origin}${hrefAttr}`;
      } else {
        const base = window.location.href.replace(/#.*$/, '');
        absoluteUrl = new URL(hrefAttr, base).href;
      }

      try {
        if (!cache.has(absoluteUrl)) {
          const response = await fetch(absoluteUrl, { mode: 'cors' });
          const blob = await response.blob();
          const dataUrl = await blobToDataURL(blob);
          cache.set(absoluteUrl, dataUrl);
        }
        const dataUrl = cache.get(absoluteUrl)!;
        imageNode.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl);
        imageNode.setAttribute('href', dataUrl);
      } catch (error) {
        console.warn('Failed to inline image for export:', absoluteUrl, error);
      }
    })
  );
}

function blobToDataURL(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
