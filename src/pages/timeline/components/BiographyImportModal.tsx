import { useEffect, useState } from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';

interface BiographyImportMeta {
  source?: string;
  factsModel?: string;
  model?: string;
  reviewApplied?: boolean;
  reviewIssues?: string[];
  nodes?: number;
  edges?: number;
}

interface BiographyImportModalProps {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  meta: BiographyImportMeta | null;
  onClose: () => void;
}

const PROGRESS_STEPS = [
  { label: 'Загрузка статьи из Wikipedia', delay: 0 },
  { label: 'Извлечение биографических фактов', delay: 3000 },
  { label: 'Генерация плана таймлайна', delay: 8000 },
  { label: 'Ревью и обогащение плана', delay: 15000 },
  { label: 'Построение таймлайна', delay: 22000 },
];

export function BiographyImportModal({
  isOpen,
  loading,
  error,
  meta,
  onClose,
}: BiographyImportModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const progressPercent = loading
    ? Math.min(96, Math.round(((activeStep + 1) / PROGRESS_STEPS.length) * 100))
    : error
      ? 100
      : meta
        ? 100
        : 0;
  const currentStepLabel = PROGRESS_STEPS[activeStep]?.label ?? PROGRESS_STEPS[0].label;

  // Reset on open
  useEffect(() => {
    if (isOpen && loading) {
      setActiveStep(0);
      setStartTime(Date.now());
    }
  }, [isOpen, loading]);

  // Animate steps based on elapsed time
  useEffect(() => {
    if (!loading || !startTime) return;

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      let step = 0;
      for (let i = PROGRESS_STEPS.length - 1; i >= 0; i--) {
        if (elapsed >= PROGRESS_STEPS[i].delay) {
          step = i;
          break;
        }
      }
      setActiveStep(step);
    }, 500);

    return () => clearInterval(interval);
  }, [loading, startTime]);

  const finished = !loading && (meta !== null || error !== null);
  const title = loading
    ? 'Построение таймлайна...'
    : error
      ? 'Ошибка импорта'
      : 'Таймлайн построен';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      disabled={loading}
      maxWidth="md"
      footer={
        finished ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700"
          >
            ОК
          </button>
        ) : undefined
      }
    >
      {loading ? (
        <div className="space-y-3">
          <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-sm text-blue-800">
              <span className="font-medium">{currentStepLabel}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                {progressPercent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-[width] duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-xs leading-5 text-blue-700">
              Это может занять до минуты: мы последовательно загружаем статью, извлекаем факты, собираем план и
              нормализуем итоговый холст.
            </div>
          </div>
          {PROGRESS_STEPS.map((step, index) => (
            <div
              key={step.label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                index < activeStep
                  ? 'bg-green-50 text-green-800'
                  : index === activeStep
                    ? 'bg-blue-50 text-blue-800 font-medium'
                    : 'text-slate-400'
              }`}
            >
              {index < activeStep ? (
                <svg className="h-5 w-5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : index === activeStep ? (
                <svg className="h-5 w-5 shrink-0 animate-spin text-blue-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <div className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" />
              )}
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : meta ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Таймлайн успешно построен
          </div>
          <div className="space-y-1 text-sm text-slate-700">
            <div><span className="font-medium">Источник:</span> {meta.source ?? 'модель'}</div>
            <div><span className="font-medium">Модель фактов:</span> {meta.factsModel ?? '—'}</div>
            <div><span className="font-medium">Модель плана:</span> {meta.model ?? '—'}</div>
            {meta.reviewApplied && (
              <div><span className="font-medium">Ревью:</span> применено</div>
            )}
            <div>
              <span className="font-medium">Результат:</span>{' '}
              {meta.nodes ?? 0} узлов, {meta.edges ?? 0} веток
            </div>
          </div>
        </div>
      ) : null}
    </BaseModal>
  );
}
