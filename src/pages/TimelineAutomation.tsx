import { useMemo, useRef, useState } from 'react';
import type { PointerEvent, WheelEvent } from 'react';
import { debugError, debugLog } from '../lib/debug';
import { TimelineCanvas } from './timeline/components/TimelineCanvas';
import { YEAR_PX } from './timeline/constants';
import { type TimelineData, type Transform } from './timeline/types';
import { buildTimelineExportPayload, exportTimelineJSON, exportTimelinePDF } from './timeline/utils/exporters';
import { getPeriodizationById } from './timeline/data/periodizations';

type TimelineAutomationPayload = {
  canvasName?: string;
  subjectName?: string;
  timeline?: TimelineData;
  meta?: {
    sourceTitle?: string;
    sourceUrl?: string;
  };
};

declare global {
  interface Window {
    __TIMELINE_AUTOMATION_PAYLOAD__?: TimelineAutomationPayload | TimelineData;
  }
}

const DEFAULT_WORLD_WIDTH = 4000;

function parseBirthYear(dateValue: string | undefined) {
  if (!dateValue) return null;
  const match = dateValue.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? Number(match[1]) : null;
}

function readAutomationPayload() {
  if (typeof window === 'undefined') {
    return null;
  }

  const payload = window.__TIMELINE_AUTOMATION_PAYLOAD__;
  if (!payload) {
    return null;
  }

  if ('timeline' in payload && payload.timeline) {
    return payload;
  }

  return {
    canvasName: 'Timeline Automation',
    timeline: payload as TimelineData,
  } satisfies TimelineAutomationPayload;
}

function noopWheel(_event: WheelEvent<SVGSVGElement>) {}
function noopPointer(_event: PointerEvent<SVGSVGElement>) {}
function noopNodePointer(_event: PointerEvent, _nodeId: string) {}

export default function TimelineAutomation() {
  const svgRef = useRef<SVGSVGElement>(null);
  const payload = useMemo(() => readAutomationPayload(), []);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timeline = payload?.timeline ?? null;
  const currentAge = timeline?.currentAge ?? 0;
  const ageMax = timeline?.ageMax ?? 100;
  const worldHeight = ageMax * YEAR_PX + 500;
  const worldWidth = useMemo(() => {
    if (!timeline) return DEFAULT_WORLD_WIDTH;
    const nodeXs = timeline.nodes.map(n => n.x ?? 2000);
    const edgeXs = timeline.edges.map(e => e.x);
    const allX = [...nodeXs, ...edgeXs, 2000];
    const maxX = Math.max(...allX);
    const minX = Math.min(...allX);
    const needed = Math.max(maxX + 600, 2000 + (2000 - minX) + 600);
    return Math.max(DEFAULT_WORLD_WIDTH, Math.ceil(needed / 500) * 500);
  }, [timeline]);
  const birthBaseYear = parseBirthYear(timeline?.birthDetails?.date);
  const currentYearLabel = birthBaseYear !== null ? birthBaseYear + currentAge : null;
  const exportFilenamePrefix = useMemo(() => {
    if (typeof window === 'undefined') {
      return 'timeline-automation';
    }

    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('filename')?.trim() || payload?.canvasName?.trim() || payload?.subjectName?.trim() || 'timeline-automation';
  }, [payload?.canvasName, payload?.subjectName]);
  const transform = useMemo<Transform>(() => ({ x: 0, y: 120, k: 0.22 }), []);

  const handleExportJson = () => {
    if (!timeline) return;

    try {
      exportTimelineJSON(buildTimelineExportPayload(timeline), `${exportFilenamePrefix}.json`);
      setStatus('JSON выгружен');
      setError(null);
      debugLog('[TimelineAutomation] JSON export complete', { filename: exportFilenamePrefix });
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : 'JSON export failed';
      setError(message);
      setStatus(null);
      debugError('[TimelineAutomation] JSON export failed', exportError);
    }
  };

  const handleExportPdf = async () => {
    if (!timeline || !svgRef.current) return;

    try {
      const periodization = timeline.selectedPeriodization
        ? getPeriodizationById(timeline.selectedPeriodization) ?? null
        : null;
      await exportTimelinePDF(
        svgRef.current,
        buildTimelineExportPayload(timeline),
        periodization,
        `${exportFilenamePrefix}.pdf`
      );
      setStatus('PDF выгружен');
      setError(null);
      debugLog('[TimelineAutomation] PDF export complete', { filename: exportFilenamePrefix });
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : 'PDF export failed';
      setError(message);
      setStatus(null);
      debugError('[TimelineAutomation] PDF export failed', exportError);
    }
  };

  if (!timeline) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-2xl font-semibold">Timeline Automation</h1>
          <p className="mt-4 text-sm text-slate-300">
            Payload не передан. Открой страницу через automation harness или установи
            {' '}
            <code className="rounded bg-black/30 px-2 py-1">window.__TIMELINE_AUTOMATION_PAYLOAD__</code>
            {' '}
            перед загрузкой.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f8fafc_0%,#dbeafe_35%,#cbd5e1_100%)] text-slate-950">
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Internal Automation</p>
            <h1 className="text-2xl font-semibold">
              {payload.canvasName || payload.subjectName || 'Timeline Automation'}
            </h1>
            <p className="text-sm text-slate-600">
              {payload.meta?.sourceTitle || payload.subjectName || 'Источник не указан'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="timeline-automation-download-json"
              onClick={handleExportJson}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
            >
              Скачать JSON
            </button>
            <button
              type="button"
              data-testid="timeline-automation-download-pdf"
              onClick={() => {
                void handleExportPdf();
              }}
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Скачать PDF
            </button>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <span data-testid="timeline-automation-ready" className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800">
            Canvas ready
          </span>
          <span>События: {timeline.nodes.length}</span>
          <span>Ветки: {timeline.edges.length}</span>
          <span>Возраст: {timeline.currentAge}</span>
          {status ? <span className="text-emerald-700">{status}</span> : null}
          {error ? <span className="text-rose-700">{error}</span> : null}
        </div>

        <div className="overflow-auto rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <div className="relative h-[88vh] min-h-[960px] min-w-[1200px]">
            <TimelineCanvas
              svgRef={svgRef}
              transform={transform}
              onWheel={noopWheel}
              onPointerDown={noopPointer}
              onPointerMove={noopPointer}
              onPointerUp={noopPointer}
              onNodeClick={() => {}}
              onNodeDragStart={noopNodePointer}
              onPeriodBoundaryClick={() => {}}
              onSelectBranch={() => {}}
              onClearSelection={() => {}}
              onSelectBirth={() => {}}
              worldWidth={worldWidth}
              worldHeight={worldHeight}
              ageMax={timeline.ageMax}
              currentAge={timeline.currentAge}
              nodes={timeline.nodes}
              edges={timeline.edges}
              selectedPeriodization={timeline.selectedPeriodization ?? null}
              selectedId={null}
              selectedBranchX={null}
              draggingNodeId={null}
              birthSelected={false}
              birthBaseYear={birthBaseYear}
              formattedCurrentAge={String(currentAge)}
              currentYearLabel={currentYearLabel}
              cursorClass="cursor-default"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
