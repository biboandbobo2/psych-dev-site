import { Link } from 'react-router-dom';
import type { NodeT } from '../types';
import { MIN_SCALE, MAX_SCALE, SPHERE_META } from '../constants';
import type { ChangeEvent } from 'react';
import type { RefObject } from 'react';

interface TimelineLeftPanelProps {
  currentAge: number;
  ageMax: number;
  viewportAge: number;
  scale: number;
  nodes: NodeT[];
  downloadMenuOpen: boolean;
  downloadButtonRef: RefObject<HTMLButtonElement>;
  downloadMenuRef: RefObject<HTMLDivElement>;
  onCurrentAgeChange: (age: number) => void;
  onViewportAgeChange: (age: number) => void;
  onScaleChange: (scale: number) => void;
  onDownloadMenuToggle: () => void;
  onDownloadSelect: (type: 'json' | 'png' | 'pdf') => void;
  onClearAll: () => void;
}

export function TimelineLeftPanel({
  currentAge,
  ageMax,
  viewportAge,
  scale,
  nodes,
  downloadMenuOpen,
  downloadButtonRef,
  downloadMenuRef,
  onCurrentAgeChange,
  onViewportAgeChange,
  onScaleChange,
  onDownloadMenuToggle,
  onDownloadSelect,
  onClearAll,
}: TimelineLeftPanelProps) {
  const handleAgeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onCurrentAgeChange(Number(event.target.value));
  };

  const handleViewportChange = (event: ChangeEvent<HTMLInputElement>) => {
    onViewportAgeChange(Number(event.target.value));
  };

  const handleScaleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onScaleChange(Number(event.target.value));
  };

  return (
    <div className="fixed top-4 left-4 z-40">
      <aside
        className="w-36 space-y-3 rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-xl backdrop-blur-md sm:w-40"
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
              orient="vertical"
              value={scale}
              onChange={handleScaleChange}
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={0.05}
              className="h-32 w-2 accent-blue-500"
              style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' }}
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
            <button
              type="button"
              onClick={onClearAll}
              className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
            >
              ✕ Очистить всё
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
