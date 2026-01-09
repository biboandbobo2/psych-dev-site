/**
 * SVG to Canvas rendering utilities for timeline export
 */
import type { EventIconId } from '../../../../data/eventIcons';
import { debugExport } from './common';
import { debugWarn } from '@/lib/debug';

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
  (window as unknown as Record<string, unknown>).__TIMELINE_EXPORT_DEBUG__ !== false &&
  import.meta.env.DEV;

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
  const win = window as unknown as Record<string, unknown>;
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

/**
 * Renders an SVG element to a canvas
 */
export async function renderSvgToCanvas(svg: SVGSVGElement) {
  const { serializedSvg, width, height } = await serializeSvg(svg);
  const svgBlob = new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    debugExport('Rendering SVG to canvas', { width, height });
    const image = await loadImage(url);

    // Give browser time to decode nested base64 images inside SVG
    debugExport('Waiting for nested images to decode...');
    await new Promise((resolve) => setTimeout(resolve, 300));

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
    debugExport(
      'Image nodes snapshot',
      imageNodes.map((node, index) => ({
        index,
        dataIconId: node.getAttribute('data-icon-id') ?? (node.dataset ? node.dataset.iconId : null),
        href: node.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ?? node.getAttribute('href'),
      }))
    );
  });

  await Promise.all(
    imageNodes.map(async (imageNode, index) => {
      const iconIdAttr =
        imageNode.getAttribute('data-icon-id') || (imageNode.dataset ? imageNode.dataset.iconId : null);
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
                Number(imageNode.getAttribute('x') ?? '0') + Number(imageNode.getAttribute('width') ?? '0') / 2,
              sampleY:
                Number(imageNode.getAttribute('y') ?? '0') + Number(imageNode.getAttribute('height') ?? '0') / 2,
            });
          }
          return;
        }
        debugExport('IconId present but not found in map', { index, iconId });
      }

      const hrefAttr =
        imageNode.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || imageNode.getAttribute('href');
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
                Number(imageNode.getAttribute('x') ?? '0') + Number(imageNode.getAttribute('width') ?? '0') / 2,
              sampleY:
                Number(imageNode.getAttribute('y') ?? '0') + Number(imageNode.getAttribute('height') ?? '0') / 2,
            });
          }
        }
      } catch (error) {
        stats.errors += 1;
        debugWarn('Failed to inline image for export:', absoluteUrl, error);
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
  } catch {
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
      const px = Math.max(0, Math.min(canvasWidth - 1, Math.round(icon.sampleX * ratioX)));
      const py = Math.max(0, Math.min(canvasHeight - 1, Math.round(icon.sampleY * ratioY)));
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
