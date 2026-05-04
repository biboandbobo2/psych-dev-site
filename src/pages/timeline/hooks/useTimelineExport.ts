import { useCallback } from 'react';
import type { RefObject } from 'react';
import type { BirthDetails, EdgeT, NodeT, TimelineData } from '../types';
import { getPeriodizationById } from '../data/periodizations';
import {
  buildTimelineExportPayload,
  exportTimelineJSON,
  exportTimelinePDF,
  exportTimelinePNG,
} from '../utils/exporters';
import { debugError } from '../../../lib/debug';

interface UseTimelineExportOptions {
  svgRef: RefObject<SVGSVGElement>;
  currentAge: number;
  ageMax: number;
  nodes: NodeT[];
  edges: EdgeT[];
  birthDetails: BirthDetails;
  selectedPeriodization: TimelineData['selectedPeriodization'];
  filenamePrefix: string;
  onBeforeDownload?: () => void;
}

export type DownloadType = 'json' | 'png' | 'pdf';

export function useTimelineExport({
  svgRef,
  currentAge,
  ageMax,
  nodes,
  edges,
  birthDetails,
  selectedPeriodization,
  filenamePrefix,
  onBeforeDownload,
}: UseTimelineExportOptions) {
  const handleDownload = useCallback(
    async (type: DownloadType) => {
      onBeforeDownload?.();
      const exportPayload = buildTimelineExportPayload({
        currentAge,
        ageMax,
        nodes,
        edges,
        birthDetails,
        selectedPeriodization,
      });
      try {
        if (type === 'json') {
          exportTimelineJSON(exportPayload, `${filenamePrefix}.json`);
          return;
        }
        if (!svgRef.current) throw new Error('SVG not ready');
        if (type === 'png') {
          await exportTimelinePNG(svgRef.current, exportPayload, `${filenamePrefix}.png`);
          return;
        }
        const periodization = selectedPeriodization
          ? getPeriodizationById(selectedPeriodization) ?? null
          : null;
        await exportTimelinePDF(
          svgRef.current,
          exportPayload,
          periodization,
          `${filenamePrefix}.pdf`
        );
      } catch (error) {
        debugError('Export failed', error);
      }
    },
    [
      ageMax,
      birthDetails,
      currentAge,
      edges,
      filenamePrefix,
      nodes,
      onBeforeDownload,
      selectedPeriodization,
      svgRef,
    ]
  );

  return { handleDownload };
}
