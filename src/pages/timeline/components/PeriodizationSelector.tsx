import { useState, useEffect, useRef } from 'react';
import { PERIODIZATIONS } from '../data/periodizations';

interface PeriodizationSelectorProps {
  value: string | null; // ID выбранной периодизации или null
  onChange: (value: string | null) => void;
}

export function PeriodizationSelector({ value, onChange }: PeriodizationSelectorProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Получить название выбранной периодизации
  const selectedPeriodization = value ? PERIODIZATIONS.find(p => p.id === value) : null;
  const buttonText = selectedPeriodization ? selectedPeriodization.name : 'Периодизации';

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
        title="Выбрать периодизацию развития"
      >
        <img src="/icons/periodization-trigger.png" alt="Периодизации" className="h-8 w-8" loading="lazy" />
        <span className="whitespace-nowrap">{buttonText}</span>
        <svg
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full z-50 mt-3 w-52 rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_36px_rgba(15,23,42,0.14)] backdrop-blur-md overflow-hidden"
        >
          <div className="mb-2 px-3 pt-3 text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
            Периодизация
          </div>

          {/* Опция "Без периодизации" */}
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`w-full px-3.5 py-2 text-left text-sm transition ${
              value === null
                ? 'bg-emerald-50 font-semibold text-emerald-700'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Без периодизации
          </button>

          <div className="my-2 border-t border-slate-100" />

          {/* Список периодизаций */}
          {PERIODIZATIONS.map((periodization) => {
            const isActive = value === periodization.id;
            const label =
              periodization.id === 'course-outline'
                ? periodization.name
                : periodization.author || periodization.name;
            const subLabel =
              periodization.id === 'course-outline' ? periodization.author : null;
            return (
              <button
                type="button"
                key={periodization.id}
                onClick={() => {
                  onChange(periodization.id);
                  setOpen(false);
                }}
                className={`w-full px-3.5 py-2 text-left transition ${
                  isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-col">
                  <div
                    className={`text-sm leading-snug ${
                      isActive ? 'font-semibold text-emerald-800' : 'text-slate-700'
                    }`}
                  >
                    {label}
                  </div>
                  {subLabel && <div className="text-xs text-slate-500">{subLabel}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
