import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import type { NodeT, Sphere, TimelineCanvas } from '../types';
import { MIN_SCALE, MAX_SCALE } from '../constants';
import { DeleteTimelineConfirmModal } from './DeleteTimelineConfirmModal';
import { BiographyImportFormModal } from './BiographyImportFormModal';
import { TimelineSphereLegend } from './TimelineSphereLegend';

interface TimelineLeftPanelProps {
  currentAge: number;
  ageMax: number;
  viewportAge: number;
  scale: number;
  nodes: NodeT[];
  sphereFilter: Sphere | null;
  onSphereFilterChange: (sphere: Sphere | null) => void;
  timelineCanvases: TimelineCanvas[];
  activeTimelineId: string | null;
  activeTimelineName: string;
  showBiographyImportAction: boolean;
  biographyImportExpanded: boolean;
  biographyImportLoading: boolean;
  biographySourceUrl: string;
  biographyImportError: string | null;
  biographyMeta: {
    source?: string;
    factsModel?: string;
    model?: string;
    reviewApplied?: boolean;
    reviewIssues?: string[];
    nodes?: number;
    edges?: number;
  } | null;
  downloadMenuOpen: boolean;
  downloadButtonRef: RefObject<HTMLButtonElement>;
  downloadMenuRef: RefObject<HTMLDivElement>;
  onCurrentAgeChange: (age: number) => void;
  onViewportAgeChange: (age: number) => void;
  onScaleChange: (scale: number) => void;
  onCreateTimeline: () => void;
  onSelectTimeline: (timelineId: string) => void;
  onDeleteTimeline: (timelineId: string) => void;
  onDownloadMenuToggle: () => void;
  onDownloadSelect: (type: 'json' | 'png' | 'pdf' | 'poster') => void;
  onClearAll: () => void;
  onOpenBiographyImport: () => void;
  onCloseBiographyImport: () => void;
  onBiographySourceUrlChange: (value: string) => void;
  onSubmitBiographyImport: () => void;
  onImportTimelineJsonFile: (file: File | null) => void;
}

export function TimelineLeftPanel({
  currentAge,
  ageMax,
  viewportAge,
  scale,
  nodes,
  sphereFilter,
  onSphereFilterChange,
  timelineCanvases,
  activeTimelineId,
  activeTimelineName,
  showBiographyImportAction,
  biographyImportExpanded,
  biographyImportLoading,
  biographySourceUrl,
  biographyImportError,
  biographyMeta,
  downloadMenuOpen,
  downloadButtonRef,
  downloadMenuRef,
  onCurrentAgeChange,
  onViewportAgeChange,
  onScaleChange,
  onCreateTimeline,
  onSelectTimeline,
  onDeleteTimeline,
  onDownloadMenuToggle,
  onDownloadSelect,
  onClearAll,
  onOpenBiographyImport,
  onCloseBiographyImport,
  onBiographySourceUrlChange,
  onSubmitBiographyImport,
  onImportTimelineJsonFile,
}: TimelineLeftPanelProps) {
  const [timelineMenuOpen, setTimelineMenuOpen] = useState(false);
  const [pendingDeleteTimelineId, setPendingDeleteTimelineId] = useState<string | null>(null);
  const timelineMenuRef = useRef<HTMLDivElement>(null);
  const hasAdditionalTimelines = timelineCanvases.length > 1;

  useEffect(() => {
    if (!timelineMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (timelineMenuRef.current?.contains(event.target)) return;
      setTimelineMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [timelineMenuOpen]);

  useEffect(() => {
    setTimelineMenuOpen(false);
  }, [activeTimelineId]);

  const handleAgeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onCurrentAgeChange(Number(event.target.value));
  };

  const handleViewportChange = (event: ChangeEvent<HTMLInputElement>) => {
    onViewportAgeChange(Number(event.target.value));
  };

  const handleScaleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onScaleChange(Number(event.target.value));
  };

  const handleCreateTimeline = () => {
    setTimelineMenuOpen(false);
    onCreateTimeline();
  };

  return (
    <div className="fixed top-4 left-4 z-40">
      <aside
        className="w-36 space-y-3 overflow-visible rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-xl backdrop-blur-md sm:w-40"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        <div className="flex items-center gap-2 pr-6">
          <Link
            to="/profile"
            className="flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 px-3 py-2 text-amber-900 shadow-md transition-all duration-200 hover:border-amber-300 hover:from-amber-100 hover:to-yellow-100"
          >
            <span className="text-sm">←</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide">Выход</span>
          </Link>
          <div className="relative">
            <button
              type="button"
              ref={downloadButtonRef}
              title="Скачать таймлайн"
              onClick={onDownloadMenuToggle}
              className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:text-slate-900"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M12 3v12" />
                <path d="M7.5 10.5 12 15l4.5-4.5" />
                <path d="M5 17h14" />
              </svg>
            </button>

            {downloadMenuOpen && (
              <div
                ref={downloadMenuRef}
                className="absolute right-0 top-full z-50 mt-3 w-40 rounded-2xl border border-slate-200 bg-white shadow-lg backdrop-blur-md"
              >
                <div className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                  Скачать
                </div>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => onDownloadSelect('json')}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadSelect('png')}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    PNG (изображение)
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadSelect('poster')}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    Постер (PNG)
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadSelect('pdf')}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    PDF (отчёт)
                  </button>
                </div>
                <div className="h-2" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">Мой возраст</span>
            <input
              type="number"
              value={currentAge}
              min={0}
              max={ageMax}
              onChange={handleAgeChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-lg font-semibold text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">Прокрутка</span>
            <input
              type="range"
              value={viewportAge}
              onChange={handleViewportChange}
              min={0}
              max={ageMax}
              step={1}
              className="accent-blue-500"
            />
            <span className="text-center text-[11px] font-medium text-slate-600">{viewportAge} лет</span>
          </label>

          <label className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">Масштаб</span>
            <input
              type="range"
              value={scale}
              onChange={handleScaleChange}
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={0.05}
              className="h-24 w-2 accent-blue-500"
              style={{ writingMode: 'vertical-lr', WebkitAppearance: 'slider-vertical' }}
            />
            <span className="text-[11px] font-medium text-slate-600">{(scale * 100).toFixed(0)}%</span>
          </label>

          <div className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-inner">
            <div className="text-center">
              <div className="text-xl font-semibold text-slate-900">{nodes.length}</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-600">Событий</div>
            </div>
            <TimelineSphereLegend
              nodes={nodes}
              activeSphere={sphereFilter}
              onChange={onSphereFilterChange}
            />
            {showBiographyImportAction ? (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={onOpenBiographyImport}
                  disabled={biographyImportLoading}
                  className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Загрузить источник биографии
                </button>

                {biographyMeta ? (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1.5 text-[10px] leading-[14px] text-sky-800">
                    <span className="font-semibold">{biographyMeta.source ?? '?'}</span>
                    {' · '}facts: {biographyMeta.factsModel ?? '?'}
                    {' · '}plan: {biographyMeta.model ?? '?'}
                    {biographyMeta.reviewApplied ? ' · review' : ''}
                    {' · '}{biographyMeta.nodes ?? 0} узл / {biographyMeta.edges ?? 0} вет
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={onClearAll}
                className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
              >
                ✕ Очистить всё
              </button>
            )}
          </div>

          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <div ref={timelineMenuRef} className="relative group">
                <button
                  type="button"
                  title="Выбрать активный таймлайн"
                  disabled={!hasAdditionalTimelines}
                  onClick={() => setTimelineMenuOpen((prev) => !prev)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  Выбор ТЛ
                </button>
                <span className="pointer-events-none absolute -top-9 left-1/2 z-50 w-28 -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1 text-center text-[10px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                  Выбрать активный таймлайн
                </span>

                {timelineMenuOpen && hasAdditionalTimelines && (
                  <div className="absolute bottom-0 left-full z-50 ml-2 max-h-[70vh] w-44 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Выбор таймлайна
                    </div>
                    <div className="space-y-1">
                      {timelineCanvases.map((timeline) => {
                        const isActive = timeline.id === activeTimelineId;
                        return (
                          <div
                            key={timeline.id}
                            className={`flex items-center gap-1 rounded-xl transition ${
                              isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => onSelectTimeline(timeline.id)}
                              className={`flex-1 truncate px-2 py-2 text-left text-xs transition ${
                                isActive ? 'font-semibold text-blue-700' : 'text-slate-700'
                              }`}
                            >
                              {timeline.name}
                            </button>
                            {hasAdditionalTimelines ? (
                              <button
                                type="button"
                                title="Удалить таймлайн"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setPendingDeleteTimelineId(timeline.id);
                                }}
                                className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              >
                                ×
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative group">
                <button
                  type="button"
                  title="Создать новый пустой холст"
                  onClick={handleCreateTimeline}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 text-lg font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:from-blue-100 hover:to-sky-100"
                >
                  +
                </button>
                <span className="pointer-events-none absolute -top-9 left-1/2 z-50 w-28 -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1 text-center text-[10px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                  Создать новый холст
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-[11px] text-slate-600 shadow-inner">
              <span className="block uppercase tracking-[0.2em] text-[9px] text-slate-500">Активный холст</span>
              <span className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-slate-800">{activeTimelineName}</span>
                <span className="text-[10px] text-slate-400">{timelineCanvases.length}</span>
              </span>
            </div>
          </div>
        </div>
      </aside>

      {biographyImportExpanded && showBiographyImportAction ? (
        <BiographyImportFormModal
          sourceUrl={biographySourceUrl}
          loading={biographyImportLoading}
          error={biographyImportError}
          meta={biographyMeta}
          onSourceUrlChange={onBiographySourceUrlChange}
          onSubmit={onSubmitBiographyImport}
          onClose={onCloseBiographyImport}
          onImportTimelineJsonFile={onImportTimelineJsonFile}
        />
      ) : null}

      {pendingDeleteTimelineId
        ? (() => {
            const target = timelineCanvases.find((canvas) => canvas.id === pendingDeleteTimelineId);
            if (!target) return null;
            return (
              <DeleteTimelineConfirmModal
                timelineName={target.name}
                onCancel={() => setPendingDeleteTimelineId(null)}
                onConfirm={() => {
                  onDeleteTimeline(pendingDeleteTimelineId);
                  setPendingDeleteTimelineId(null);
                }}
              />
            );
          })()
        : null}
    </div>
  );
}
