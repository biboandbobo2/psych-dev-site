import { debugError } from '../../../lib/debug';
import type { BirthDetails, EdgeT, NodeT } from '../types';
import { getPeriodizationById } from '../data/periodizations';
import { exportTimelineJSON, exportTimelinePNG, exportTimelinePDF } from './exporters';

export interface TimelineExportPayload {
  currentAge: number;
  ageMax: number;
  nodes: NodeT[];
  edges: EdgeT[];
  birthDetails: BirthDetails;
  selectedPeriodization: string | null;
}

interface DownloadParams {
  type: 'json' | 'png' | 'pdf';
  payload: TimelineExportPayload;
  filenamePrefix: string;
  svg: SVGSVGElement | null;
}

/**
 * Унифицированный обработчик «Скачать таймлайн как X».
 * Не бросает наверх — все ошибки логирует через debugError, чтобы UI не
 * упал при сбое экспорта.
 */
export async function handleTimelineDownload({
  type,
  payload,
  filenamePrefix,
  svg,
}: DownloadParams): Promise<void> {
  try {
    if (type === 'json') {
      exportTimelineJSON(payload, `${filenamePrefix}.json`);
      return;
    }
    if (!svg) throw new Error('SVG not ready');
    if (type === 'png') {
      await exportTimelinePNG(svg, `${filenamePrefix}.png`);
      return;
    }
    const periodization = payload.selectedPeriodization
      ? (getPeriodizationById(payload.selectedPeriodization) ?? null)
      : null;
    await exportTimelinePDF(svg, payload, periodization, `${filenamePrefix}.pdf`);
  } catch (error) {
    debugError('Export failed', error);
  }
}
