import type { EventIconId } from '../../../../data/eventIcons';
import type { BirthDetails, EdgeT, NodeT, TimelineData } from '../../types';
import type { Periodization } from '../../data/periodizations';

export type TimelineExportPayload = {
  currentAge: number;
  ageMax: number;
  nodes: NodeT[];
  edges: EdgeT[];
  birthDetails: BirthDetails;
  selectedPeriodization: TimelineData['selectedPeriodization'];
};

/**
 * Генерирует уникальное имя файла с timestamp
 * Формат: timeline_2024-01-15_14-30-45.ext
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

type ExportDebugIcon = {
  index: number;
  iconId?: EventIconId;
  href: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  sampleX: number;
  sampleY: number;
};

type ExportDebugState = {
  icons: ExportDebugIcon[];
};

const EXPORT_DEBUG =
  typeof window !== 'undefined' &&
  (window as any).__TIMELINE_EXPORT_DEBUG__ !== false &&
  import.meta.env.DEV;

export function debugExport(...args: unknown[]) {
  if (EXPORT_DEBUG) {
    console.log('[timeline-export]', ...args);
  }
}

function debugExportGroup(label: string, fn: () => void) {
  if (EXPORT_DEBUG) {
    console.groupCollapsed(`[timeline-export] ${label}`);
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  }
}

function getDebugState(): ExportDebugState | null {
  if (!EXPORT_DEBUG || typeof window === 'undefined') return null;
  const win = window as any;
  if (!win.__TIMELINE_EXPORT_STATE) {
    win.__TIMELINE_EXPORT_STATE = { icons: [] } as ExportDebugState;
  }
  return win.__TIMELINE_EXPORT_STATE as ExportDebugState;
}

function resetDebugState() {
  const state = getDebugState();
  if (state) {
    state.icons = [];
  }
}

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

export async function renderSvgToCanvas(svg: SVGSVGElement) {
  const { serializedSvg, width, height } = await serializeSvg(svg);
  const svgBlob = new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    debugExport('Rendering SVG to canvas', { width, height });
    const image = await loadImage(url);

    // Даём браузеру время декодировать вложенные base64 изображения внутри SVG
    // Это критично, потому что image.decode() завершается для основного SVG,
    // но вложенные <image> элементы могут декодироваться асинхронно
    debugExport('Waiting for nested images to decode...');
    await new Promise(resolve => setTimeout(resolve, 300));

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
    sampleRenderedIcons(ctx, width, height);

    return { canvas, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function serializeSvg(svg: SVGSVGElement) {
  resetDebugState();
  const clone = svg.cloneNode(true) as SVGSVGElement;
  debugExportGroup('Serialize SVG', () => {
    debugExport('Original dataset', {
      worldWidth: svg.dataset.worldWidth,
      worldHeight: svg.dataset.worldHeight,
      exportRoot: !!svg.querySelector('[data-export-root="true"]'),
    });
  });

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

  debugExport('inlineImages will process', { totalImages: clone.querySelectorAll('image').length });
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
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
    };
    image.onload = () => {
      const decode = (image as HTMLImageElement & { decode?: () => Promise<void> }).decode;
      if (typeof decode === 'function') {
        decode
          .call(image)
          .then(() => {
            cleanup();
            resolve(image);
          })
          .catch((error) => {
            debugExport('Image decode failed, proceeding with onload', error);
            cleanup();
            resolve(image);
          });
      } else {
        cleanup();
        resolve(image);
      }
    };
    image.onerror = (error) => {
      cleanup();
      reject(error);
    };
    image.src = url;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
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

export function dataUriToUint8Array(dataUri: string) {
  const base64 = dataUri.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function buildPdfWithImage(
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
  // Lazy load icon data URLs (4.7 MB) only when actually exporting
  const { EVENT_ICON_DATA_URL_MAP } = await import('../../../../data/eventIconDataUrls');

  const imageNodes = Array.from(svgClone.querySelectorAll<SVGImageElement>('image'));
  const cache = new Map<string, string>();
  const debugState = getDebugState();
  const stats = {
    total: imageNodes.length,
    withDataAttr: 0,
    iconMapHit: 0,
    alreadyDataUrl: 0,
    missingHref: 0,
    fetchPerformed: 0,
    fetchCacheHit: 0,
    errors: 0,
  };

  debugExportGroup('inlineImages details', () => {
    debugExport('Image nodes snapshot', imageNodes.map((node, index) => ({
      index,
      dataIconId: node.getAttribute('data-icon-id') ?? (node.dataset ? node.dataset.iconId : null),
      href:
        node.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ??
        node.getAttribute('href'),
    })));
  });

  await Promise.all(
    imageNodes.map(async (imageNode, index) => {
      const iconIdAttr =
        imageNode.getAttribute('data-icon-id') ||
        (imageNode.dataset ? imageNode.dataset.iconId : null);
      const iconId = (iconIdAttr || undefined) as EventIconId | undefined;
      if (iconId) {
        stats.withDataAttr += 1;
        const dataUrl = EVENT_ICON_DATA_URL_MAP[iconId];
        if (dataUrl) {
          imageNode.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl);
          imageNode.setAttribute('href', dataUrl);
          stats.iconMapHit += 1;
          debugExport('Icon inlined from map', {
            index,
            iconId,
            preview: dataUrl.slice(0, 48),
          });
          if (debugState) {
            debugState.icons.push({
              index,
              iconId,
              href: dataUrl,
              x: Number(imageNode.getAttribute('x') ?? '0'),
              y: Number(imageNode.getAttribute('y') ?? '0'),
              width: Number(imageNode.getAttribute('width') ?? '0'),
              height: Number(imageNode.getAttribute('height') ?? '0'),
              sampleX:
                Number(imageNode.getAttribute('x') ?? '0') +
                Number(imageNode.getAttribute('width') ?? '0') / 2,
              sampleY:
                Number(imageNode.getAttribute('y') ?? '0') +
                Number(imageNode.getAttribute('height') ?? '0') / 2,
            });
          }
          return;
        }
        debugExport('IconId present but not found in map', { index, iconId });
      }

      const hrefAttr =
        imageNode.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ||
        imageNode.getAttribute('href');
      if (!hrefAttr) {
        stats.missingHref += 1;
        debugExport('Image is missing href, skipping', { index });
        return;
      }

      if (hrefAttr.startsWith('data:')) {
        stats.alreadyDataUrl += 1;
        debugExport('Image already contains data URL, skipping', { index });
        return;
      }

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
        let dataUrl = cache.get(absoluteUrl);
        if (!dataUrl) {
          stats.fetchPerformed += 1;
          debugExport('Fetching image for export', { index, absoluteUrl });
          dataUrl = await fetchImageAsDataURL(absoluteUrl);
          cache.set(absoluteUrl, dataUrl);
        } else {
          stats.fetchCacheHit += 1;
          debugExport('Using cached data URL', { index, absoluteUrl });
        }
        if (dataUrl) {
          imageNode.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl);
          imageNode.setAttribute('href', dataUrl);
          debugExport('Image inlined via fetch', {
            index,
            absoluteUrl,
            preview: dataUrl.slice(0, 48),
          });
          if (debugState) {
            debugState.icons.push({
              index,
              iconId,
              href: dataUrl,
              x: Number(imageNode.getAttribute('x') ?? '0'),
              y: Number(imageNode.getAttribute('y') ?? '0'),
              width: Number(imageNode.getAttribute('width') ?? '0'),
              height: Number(imageNode.getAttribute('height') ?? '0'),
              sampleX:
                Number(imageNode.getAttribute('x') ?? '0') +
                Number(imageNode.getAttribute('width') ?? '0') / 2,
              sampleY:
                Number(imageNode.getAttribute('y') ?? '0') +
                Number(imageNode.getAttribute('height') ?? '0') / 2,
            });
          }
        }
      } catch (error) {
        stats.errors += 1;
        console.warn('Failed to inline image for export:', absoluteUrl, error);
      }
    })
  );

  debugExport('inlineImages summary', stats);
  if (debugState) {
    debugExport('Icon geometry recorded', debugState.icons);
  }
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

async function fetchImageAsDataURL(url: string) {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    return await blobToDataURL(blob);
  } catch (error) {
    return loadImageAsDataURL(url);
  }
}

function loadImageAsDataURL(url: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        canvas.width = width || 1;
        canvas.height = height || 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable for image conversion'));
          return;
        }
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch (conversionError) {
        reject(conversionError);
      }
    };
    image.onerror = reject;
    image.src = url;
  });
}

function sampleRenderedIcons(ctx: CanvasRenderingContext2D, width: number, height: number) {
  if (!EXPORT_DEBUG) return;
  const state = getDebugState();
  if (!state || !state.icons.length) return;
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  const ratioX = canvasWidth / width;
  const ratioY = canvasHeight / height;

  debugExportGroup('Canvas icon samples', () => {
    state.icons.forEach((icon) => {
      const px = Math.max(
        0,
        Math.min(canvasWidth - 1, Math.round(icon.sampleX * ratioX))
      );
      const py = Math.max(
        0,
        Math.min(canvasHeight - 1, Math.round(icon.sampleY * ratioY))
      );
      let rgba: number[] = [0, 0, 0, 0];
      try {
        rgba = Array.from(ctx.getImageData(px, py, 1, 1).data);
      } catch (error) {
        debugExport('Failed to sample pixel', { icon, error });
      }
      debugExport('Icon sample RGBA', {
        index: icon.index,
        iconId: icon.iconId,
        sampleX: icon.sampleX,
        sampleY: icon.sampleY,
        px,
        py,
        rgba,
      });
    });
    const midX = Math.round(canvasWidth / 2);
    const midY = Math.round(canvasHeight / 2);
    let midRgba: number[] = [0, 0, 0, 0];
    try {
      midRgba = Array.from(ctx.getImageData(midX, midY, 1, 1).data);
    } catch (error) {
      debugExport('Failed to sample canvas center', { error });
    }
    debugExport('Canvas center sample', { px: midX, py: midY, rgba: midRgba });
  });
}
