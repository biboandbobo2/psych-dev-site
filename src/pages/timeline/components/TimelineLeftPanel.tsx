import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, RefObject } from 'react';
import type { NodeT, TimelineCanvas } from '../types';
import { MIN_SCALE, MAX_SCALE, SPHERE_META } from '../constants';

interface TimelineLeftPanelProps {
  currentAge: number;
  ageMax: number;
  viewportAge: number;
  scale: number;
  nodes: NodeT[];
  timelineCanvases: TimelineCanvas[];
  activeTimelineId: string | null;
  activeTimelineName: string;
  showBiographyImportAction: boolean;
  biographyImportExpanded: boolean;
  biographyImportLoading: boolean;
  biographySourceUrl: string;
  biographyImportError: string | null;
  biographyDiagnostics: string[];
  biographyUiSignals: {
    reactPointerdown: number;
    reactClick: number;
    reactTouchstart: number;
    nativePointerdown: number;
    nativeClick: number;
    nativeTouchstart: number;
    docPointerdown: number;
    docClick: number;
    docTouchstart: number;
    open: number;
    close: number;
    submit: number;
  };
  biographyLastUiSignal: string | null;
  exportStatus: {
    state: 'idle' | 'running' | 'success' | 'error';
    type: 'json' | 'png' | 'pdf' | null;
    message: string | null;
  };
  exportDiagnostics: string[];
  downloadMenuOpen: boolean;
  downloadButtonRef: RefObject<HTMLButtonElement>;
  downloadMenuRef: RefObject<HTMLDivElement>;
  onCurrentAgeChange: (age: number) => void;
  onViewportAgeChange: (age: number) => void;
  onScaleChange: (scale: number) => void;
  onCreateTimeline: () => void;
  onSelectTimeline: (timelineId: string) => void;
  onDownloadMenuToggle: () => void;
  onDownloadSelect: (type: 'json' | 'png' | 'pdf') => void;
  onClearAll: () => void;
  onOpenBiographyImport: () => void;
  onCloseBiographyImport: () => void;
  onBiographySourceUrlChange: (value: string) => void;
  onSubmitBiographyImport: () => void;
  onBiographyDiagnostic: (message: string, details?: unknown) => void;
  onBiographyUiSignal: (
    signal:
      | 'reactPointerdown'
      | 'reactClick'
      | 'reactTouchstart'
      | 'nativePointerdown'
      | 'nativeClick'
      | 'nativeTouchstart'
      | 'docPointerdown'
      | 'docClick'
      | 'docTouchstart'
      | 'open'
      | 'close'
      | 'submit',
    details?: unknown
  ) => void;
}

export function TimelineLeftPanel({
  currentAge,
  ageMax,
  viewportAge,
  scale,
  nodes,
  timelineCanvases,
  activeTimelineId,
  activeTimelineName,
  showBiographyImportAction,
  biographyImportExpanded,
  biographyImportLoading,
  biographySourceUrl,
  biographyImportError,
  biographyDiagnostics,
  biographyUiSignals,
  biographyLastUiSignal,
  exportStatus,
  exportDiagnostics,
  downloadMenuOpen,
  downloadButtonRef,
  downloadMenuRef,
  onCurrentAgeChange,
  onViewportAgeChange,
  onScaleChange,
  onCreateTimeline,
  onSelectTimeline,
  onDownloadMenuToggle,
  onDownloadSelect,
  onClearAll,
  onOpenBiographyImport,
  onCloseBiographyImport,
  onBiographySourceUrlChange,
  onSubmitBiographyImport,
  onBiographyDiagnostic,
  onBiographyUiSignal,
}: TimelineLeftPanelProps) {
  const navigate = useNavigate();
  const [timelineMenuOpen, setTimelineMenuOpen] = useState(false);
  const [showDebugPopover, setShowDebugPopover] = useState(false);
  const timelineMenuRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLElement>(null);
  const biographyButtonRef = useRef<HTMLButtonElement>(null);
  const exitLinkRef = useRef<HTMLButtonElement>(null);
  const timelineSelectButtonRef = useRef<HTMLButtonElement>(null);
  const createTimelineButtonRef = useRef<HTMLButtonElement>(null);
  const [biographyButtonProbe, setBiographyButtonProbe] = useState<string>('probe: not-ready');
  const [leftPanelSignalCounts, setLeftPanelSignalCounts] = useState({
    panel: 0,
    exit: 0,
    select: 0,
    create: 0,
    download: 0,
  });
  const [leftPanelSignalLast, setLeftPanelSignalLast] = useState<string | null>(null);
  const [leftPanelDiagnostics, setLeftPanelDiagnostics] = useState<string[]>([]);
  const hasAdditionalTimelines = timelineCanvases.length > 1;

  const appendLeftPanelDiagnostic = useCallback((entry: string) => {
    setLeftPanelSignalLast(entry);
    setLeftPanelDiagnostics((prev) => [entry, ...prev].slice(0, 8));
  }, []);

  const recordLeftPanelSignal = useCallback(
    (
      target: 'panel' | 'exit' | 'select' | 'create' | 'download',
      layer: 'react' | 'native' | 'doc',
      eventType: string,
      details?: string
    ) => {
      setLeftPanelSignalCounts((prev) => ({
        ...prev,
        [target]: prev[target] + 1,
      }));
      appendLeftPanelDiagnostic(`${target}:${layer}:${eventType}${details ? `:${details}` : ''}`);
    },
    [appendLeftPanelDiagnostic]
  );

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

  useEffect(() => {
    if (!showBiographyImportAction) {
      setBiographyButtonProbe('probe: hidden');
      return;
    }

    const button = biographyButtonRef.current;
    if (!button) {
      setBiographyButtonProbe('probe: missing-button-ref');
      onBiographyDiagnostic('probe missing button ref');
      return;
    }

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const topElement = document.elementFromPoint(centerX, centerY);
    const containsTopElement = topElement ? button.contains(topElement) || topElement === button : false;
    const probe = [
      `rect=${Math.round(rect.left)},${Math.round(rect.top)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
      `center=${Math.round(centerX)},${Math.round(centerY)}`,
      `top=${topElement instanceof HTMLElement ? `${topElement.tagName.toLowerCase()}.${topElement.className || 'no-class'}` : 'none'}`,
      `hit=${containsTopElement ? 'button' : 'other'}`,
    ].join(' | ');

    setBiographyButtonProbe(probe);
    onBiographyDiagnostic('button probe', probe);
  }, [activeTimelineId, onBiographyDiagnostic, showBiographyImportAction, biographyImportExpanded]);

  useEffect(() => {
    if (!showBiographyImportAction) return;

    const button = biographyButtonRef.current;
    if (!button) return;

    const describeTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement ? `${target.tagName.toLowerCase()}.${target.className || 'no-class'}` : 'unknown';

    const getPoint = (event: Event) => {
      if (event instanceof PointerEvent || event instanceof MouseEvent) {
        return { x: event.clientX, y: event.clientY };
      }

      if (event instanceof TouchEvent) {
        const touch = event.touches[0] ?? event.changedTouches[0];
        if (touch) {
          return { x: touch.clientX, y: touch.clientY };
        }
      }

      return null;
    };

    const isInsideButtonZone = (event: Event) => {
      const point = getPoint(event);
      if (!point) return false;
      const rect = button.getBoundingClientRect();
      return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
    };

    const nativePointerdown = (event: PointerEvent) => {
      onBiographyUiSignal('nativePointerdown', describeTarget(event.target));
    };
    const nativeClick = (event: MouseEvent) => {
      onBiographyUiSignal('nativeClick', describeTarget(event.target));
    };
    const nativeTouchstart = (event: TouchEvent) => {
      onBiographyUiSignal('nativeTouchstart', describeTarget(event.target));
    };

    const docPointerdown = (event: PointerEvent) => {
      if (!isInsideButtonZone(event)) return;
      onBiographyUiSignal('docPointerdown', describeTarget(event.target));
    };
    const docClick = (event: MouseEvent) => {
      if (!isInsideButtonZone(event)) return;
      onBiographyUiSignal('docClick', describeTarget(event.target));
    };
    const docTouchstart = (event: TouchEvent) => {
      if (!isInsideButtonZone(event)) return;
      onBiographyUiSignal('docTouchstart', describeTarget(event.target));
    };

    button.addEventListener('pointerdown', nativePointerdown);
    button.addEventListener('click', nativeClick);
    button.addEventListener('touchstart', nativeTouchstart);
    document.addEventListener('pointerdown', docPointerdown, true);
    document.addEventListener('click', docClick, true);
    document.addEventListener('touchstart', docTouchstart, true);

    return () => {
      button.removeEventListener('pointerdown', nativePointerdown);
      button.removeEventListener('click', nativeClick);
      button.removeEventListener('touchstart', nativeTouchstart);
      document.removeEventListener('pointerdown', docPointerdown, true);
      document.removeEventListener('click', docClick, true);
      document.removeEventListener('touchstart', docTouchstart, true);
    };
  }, [onBiographyUiSignal, showBiographyImportAction]);

  useEffect(() => {
    const leftPanel = leftPanelRef.current;
    const exitLink = exitLinkRef.current;
    const timelineSelectButton = timelineSelectButtonRef.current;
    const createButton = createTimelineButtonRef.current;
    const downloadButton = downloadButtonRef.current;
    if (!leftPanel || !exitLink || !timelineSelectButton || !createButton || !downloadButton) return;

    const controls = [
      { key: 'panel' as const, element: leftPanel },
      { key: 'exit' as const, element: exitLink },
      { key: 'select' as const, element: timelineSelectButton },
      { key: 'create' as const, element: createButton },
      { key: 'download' as const, element: downloadButton },
    ];

    const describeTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement ? target.tagName.toLowerCase() : 'unknown';

    const getPoint = (event: Event) => {
      if (event instanceof PointerEvent || event instanceof MouseEvent) {
        return { x: event.clientX, y: event.clientY };
      }
      if (event instanceof TouchEvent) {
        const touch = event.touches[0] ?? event.changedTouches[0];
        if (touch) {
          return { x: touch.clientX, y: touch.clientY };
        }
      }
      return null;
    };

    const isInside = (event: Event, element: HTMLElement) => {
      const point = getPoint(event);
      if (!point) return false;
      const rect = element.getBoundingClientRect();
      return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
    };

    const nativeCleanup = controls.flatMap(({ key, element }) => {
      const handlePointerdown = (event: PointerEvent) => {
        recordLeftPanelSignal(key, 'native', 'pointerdown', describeTarget(event.target));
      };
      const handleTouchstart = (event: TouchEvent) => {
        recordLeftPanelSignal(key, 'native', 'touchstart', describeTarget(event.target));
      };
      const handleClick = (event: MouseEvent) => {
        recordLeftPanelSignal(key, 'native', 'click', describeTarget(event.target));
      };

      element.addEventListener('pointerdown', handlePointerdown);
      element.addEventListener('touchstart', handleTouchstart);
      element.addEventListener('click', handleClick);

      return [
        () => element.removeEventListener('pointerdown', handlePointerdown),
        () => element.removeEventListener('touchstart', handleTouchstart),
        () => element.removeEventListener('click', handleClick),
      ];
    });

    const handleDocPointerdown = (event: PointerEvent) => {
      controls.forEach(({ key, element }) => {
        if (isInside(event, element)) {
          recordLeftPanelSignal(key, 'doc', 'pointerdown', describeTarget(event.target));
        }
      });
    };
    const handleDocTouchstart = (event: TouchEvent) => {
      controls.forEach(({ key, element }) => {
        if (isInside(event, element)) {
          recordLeftPanelSignal(key, 'doc', 'touchstart', describeTarget(event.target));
        }
      });
    };
    const handleDocClick = (event: MouseEvent) => {
      controls.forEach(({ key, element }) => {
        if (isInside(event, element)) {
          recordLeftPanelSignal(key, 'doc', 'click', describeTarget(event.target));
        }
      });
    };

    document.addEventListener('pointerdown', handleDocPointerdown, true);
    document.addEventListener('touchstart', handleDocTouchstart, true);
    document.addEventListener('click', handleDocClick, true);

    return () => {
      nativeCleanup.forEach((cleanup) => cleanup());
      document.removeEventListener('pointerdown', handleDocPointerdown, true);
      document.removeEventListener('touchstart', handleDocTouchstart, true);
      document.removeEventListener('click', handleDocClick, true);
    };
  }, [downloadButtonRef, recordLeftPanelSignal]);

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

  const handleExit = () => {
    appendLeftPanelDiagnostic('exit:navigate:/profile');
    navigate('/profile');
  };

  const handleBiographySourceUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    onBiographySourceUrlChange(event.target.value);
  };

  const handleBiographySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmitBiographyImport();
  };

  return (
    <div className="fixed top-4 left-4 z-40">
      <aside
        ref={leftPanelRef}
        onPointerDownCapture={() => recordLeftPanelSignal('panel', 'react', 'pointerdown')}
        onTouchStartCapture={() => recordLeftPanelSignal('panel', 'react', 'touchstart')}
        onClickCapture={() => recordLeftPanelSignal('panel', 'react', 'click')}
        className="w-36 space-y-3 overflow-visible rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-xl backdrop-blur-md sm:w-40"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        <div className="flex items-center gap-2 pr-6">
          <button
            type="button"
            ref={exitLinkRef}
            onPointerDownCapture={() => recordLeftPanelSignal('exit', 'react', 'pointerdown')}
            onTouchStartCapture={() => recordLeftPanelSignal('exit', 'react', 'touchstart')}
            onClickCapture={() => recordLeftPanelSignal('exit', 'react', 'click')}
            onClick={handleExit}
            className="flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 px-3 py-2 text-amber-900 shadow-md transition-all duration-200 hover:border-amber-300 hover:from-amber-100 hover:to-yellow-100"
          >
            <span className="text-sm">←</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide">Выход</span>
          </button>
          <div className="relative">
            <button
              type="button"
              ref={downloadButtonRef}
              title="Скачать таймлайн"
              onPointerDownCapture={() => recordLeftPanelSignal('download', 'react', 'pointerdown')}
              onTouchStartCapture={() => recordLeftPanelSignal('download', 'react', 'touchstart')}
              onClickCapture={() => recordLeftPanelSignal('download', 'react', 'click')}
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
                    onClick={() => {
                      appendLeftPanelDiagnostic('download-option:json');
                      onDownloadSelect('json');
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      appendLeftPanelDiagnostic('download-option:png');
                      onDownloadSelect('png');
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    PNG (изображение)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      appendLeftPanelDiagnostic('download-option:pdf');
                      onDownloadSelect('pdf');
                    }}
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
            <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
              {Object.entries(SPHERE_META).map(([key, meta]) => {
                const count = nodes.filter((n) => n.sphere === key).length;
                if (count === 0) return null;
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span className="text-slate-600">{meta.emoji}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{count}</span>
                  </div>
                );
              })}
            </div>
            {showBiographyImportAction ? (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  ref={biographyButtonRef}
                  onPointerDownCapture={() => {
                    onBiographyDiagnostic('button pointerdown capture');
                    onBiographyUiSignal('reactPointerdown');
                  }}
                  onTouchStartCapture={() => {
                    onBiographyDiagnostic('button touchstart capture');
                    onBiographyUiSignal('reactTouchstart');
                  }}
                  onClickCapture={() => {
                    onBiographyDiagnostic('button click capture');
                    onBiographyUiSignal('reactClick');
                  }}
                  onClick={biographyImportExpanded ? onCloseBiographyImport : onOpenBiographyImport}
                  disabled={biographyImportLoading}
                  className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {biographyImportExpanded ? 'Скрыть импорт' : 'Загрузить источник биографии'}
                </button>

                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 text-[9px] font-mono text-slate-500">
                    bio:{biographyUiSignals.reactClick}/{biographyUiSignals.nativeClick}/{biographyUiSignals.docClick}
                    {' '}panel:{leftPanelSignalCounts.panel} exp:{exportStatus.state}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDebugPopover((prev) => !prev)}
                    className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-800"
                  >
                    {showDebugPopover ? 'Скрыть dbg' : 'Dbg'}
                  </button>
                </div>

                {biographyImportExpanded ? (
                  <form onSubmit={handleBiographySubmit} className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/70 p-2">
                    <div className="text-[10px] leading-4 text-slate-600">
                      Вставь прямую ссылку на статью Wikipedia. Таймлайн заполнит текущий пустой холст.
                    </div>
                    <input
                      type="url"
                      value={biographySourceUrl}
                      onChange={handleBiographySourceUrlChange}
                      placeholder="https://ru.wikipedia.org/wiki/..."
                      className="w-full rounded-lg border border-blue-200 bg-white px-2 py-2 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    {biographyImportError ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-[10px] leading-4 text-red-700">
                        {biographyImportError}
                      </div>
                    ) : null}
                    <button
                      type="submit"
                      onClickCapture={() => onBiographyDiagnostic('submit button click capture')}
                      disabled={biographyImportLoading || !biographySourceUrl.trim()}
                      className="w-full rounded-lg bg-blue-600 px-2 py-2 text-[11px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {biographyImportLoading ? 'Строим таймлайн...' : 'Построить таймлайн'}
                    </button>
                  </form>
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
                  ref={timelineSelectButtonRef}
                  disabled={!hasAdditionalTimelines}
                  onPointerDownCapture={() => recordLeftPanelSignal('select', 'react', 'pointerdown')}
                  onTouchStartCapture={() => recordLeftPanelSignal('select', 'react', 'touchstart')}
                  onClickCapture={() => recordLeftPanelSignal('select', 'react', 'click')}
                  onClick={() => setTimelineMenuOpen((prev) => !prev)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  Выбор ТЛ
                </button>
                <span className="pointer-events-none absolute -top-9 left-1/2 z-50 w-28 -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1 text-center text-[10px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                  Выбрать активный таймлайн
                </span>

                {timelineMenuOpen && hasAdditionalTimelines && (
                  <div className="absolute left-full top-1/2 z-50 ml-2 w-44 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Выбор таймлайна
                    </div>
                    <div className="space-y-1">
                      {timelineCanvases.map((timeline) => {
                        const isActive = timeline.id === activeTimelineId;
                        return (
                          <button
                            key={timeline.id}
                            type="button"
                            onClick={() => onSelectTimeline(timeline.id)}
                            className={`w-full rounded-xl px-2 py-2 text-left text-xs transition ${
                              isActive
                                ? 'bg-blue-50 font-semibold text-blue-700'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {timeline.name}
                          </button>
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
                  ref={createTimelineButtonRef}
                  onPointerDownCapture={() => recordLeftPanelSignal('create', 'react', 'pointerdown')}
                  onTouchStartCapture={() => recordLeftPanelSignal('create', 'react', 'touchstart')}
                  onClickCapture={() => recordLeftPanelSignal('create', 'react', 'click')}
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

      {showBiographyImportAction && showDebugPopover ? (
        <div className="absolute left-full top-0 z-50 ml-3 w-72 rounded-2xl border border-amber-200 bg-amber-50/95 p-3 font-mono text-[10px] leading-4 text-amber-950 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold uppercase tracking-[0.18em]">Диагностика</div>
            <button
              type="button"
              onClick={() => setShowDebugPopover(false)}
              className="rounded-md border border-amber-300 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em]"
            >
              Закрыть
            </button>
          </div>
          <div className="mt-2 break-words">{biographyButtonProbe}</div>
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-amber-200/70 pt-2">
            <div>expanded: {biographyImportExpanded ? 'true' : 'false'}</div>
            <div>loading: {biographyImportLoading ? 'true' : 'false'}</div>
            <div>error: {biographyImportError ? 'true' : 'false'}</div>
            <div>last: {biographyLastUiSignal ?? 'none'}</div>
            <div>r/n/d click: {biographyUiSignals.reactClick}/{biographyUiSignals.nativeClick}/{biographyUiSignals.docClick}</div>
            <div>r/n/d touch: {biographyUiSignals.reactTouchstart}/{biographyUiSignals.nativeTouchstart}/{biographyUiSignals.docTouchstart}</div>
            <div>open/close: {biographyUiSignals.open}/{biographyUiSignals.close}</div>
            <div>submit: {biographyUiSignals.submit}</div>
            <div>panel/exit: {leftPanelSignalCounts.panel}/{leftPanelSignalCounts.exit}</div>
            <div>select/create: {leftPanelSignalCounts.select}/{leftPanelSignalCounts.create}</div>
            <div>download: {leftPanelSignalCounts.download}</div>
            <div>panelLast: {leftPanelSignalLast ?? 'none'}</div>
            <div>export: {exportStatus.state}</div>
            <div>type: {exportStatus.type ?? 'none'}</div>
            <div className="col-span-2 break-words">exportMsg: {exportStatus.message ?? 'none'}</div>
          </div>
          <div className="mt-2 max-h-24 space-y-1 overflow-auto border-t border-amber-200/70 pt-2">
            {biographyDiagnostics.length > 0 ? (
              biographyDiagnostics.map((entry) => (
                <div key={entry} className="break-words border-t border-amber-200/70 pt-1 first:border-t-0 first:pt-0">
                  {entry}
                </div>
              ))
            ) : (
              <div>Пока нет bio-событий</div>
            )}
          </div>
          <div className="mt-2 max-h-20 space-y-1 overflow-auto border-t border-amber-200/70 pt-2">
            {leftPanelDiagnostics.length > 0 ? (
              leftPanelDiagnostics.map((entry) => (
                <div key={entry} className="break-words border-t border-amber-200/70 pt-1 first:border-t-0 first:pt-0">
                  {entry}
                </div>
              ))
            ) : (
              <div>Панель пока молчит</div>
            )}
          </div>
          <div className="mt-2 max-h-20 space-y-1 overflow-auto border-t border-amber-200/70 pt-2">
            {exportDiagnostics.length > 0 ? (
              exportDiagnostics.map((entry) => (
                <div key={entry} className="break-words border-t border-amber-200/70 pt-1 first:border-t-0 first:pt-0">
                  {entry}
                </div>
              ))
            ) : (
              <div>Экспорт пока молчит</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
