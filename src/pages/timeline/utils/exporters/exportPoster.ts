import {
  canvasToBlob,
  computeExportTopAge,
  debugExport,
  downloadBlob,
  generateFilename,
  renderSvgToCanvas,
} from './common';
import type { TimelineExportPayload } from './common';
import type { PosterSphere } from './svgRenderer';
import { SPHERE_META } from '../../constants';
import type { NodeT, Sphere } from '../../types';

/** Сферы с событиями для легенды постера (в порядке SPHERE_META). */
export function collectSphereLegend(nodes: NodeT[]): PosterSphere[] {
  const counts = new Map<Sphere, number>();
  for (const node of nodes) {
    if (!node.sphere) continue;
    counts.set(node.sphere, (counts.get(node.sphere) ?? 0) + 1);
  }
  return (Object.keys(SPHERE_META) as Sphere[])
    .filter((sphere) => counts.has(sphere))
    .map((sphere) => ({
      color: SPHERE_META[sphere].color,
      label: SPHERE_META[sphere].label,
      emoji: SPHERE_META[sphere].emoji,
      count: counts.get(sphere)!,
    }));
}

export function buildPosterSubtitle(data: TimelineExportPayload): string {
  const date = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  return `Возраст ${data.currentAge} · ${date}`;
}

/**
 * «Парадный» PNG: без сетки, с заголовком, легендой сфер и подписью —
 * постер для сохранения и шаринга, а не скриншот рабочего холста.
 */
export async function exportTimelinePoster(
  svg: SVGSVGElement,
  data: TimelineExportPayload,
  title: string,
  filename?: string
) {
  debugExport('Starting poster export');
  const topAge = computeExportTopAge(data);
  const { canvas } = await renderSvgToCanvas(svg, {
    topAge,
    poster: {
      title: title.trim() || 'Линия жизни',
      subtitle: buildPosterSubtitle(data),
      spheres: collectSphereLegend(data.nodes),
      footer: 'DOM Academy · academydom.com',
    },
  });
  const blob = await canvasToBlob(canvas, 'image/png', 1);
  downloadBlob(blob, filename || generateFilename('png'));
  debugExport('Poster export complete');
}
