import { BaseModal } from '../../../components/ui/BaseModal';

export interface BiographyProgressEvent {
  step: number;
  total: number;
  label: string;
  detail?: string;
}

export interface BiographyImportMeta {
  source?: string;
  model?: string;
  nodes?: number;
  edges?: number;
}

interface BiographyImportModalProps {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  errorDetail: string | null;
  meta: BiographyImportMeta | null;
  progress: BiographyProgressEvent | null;
  onClose: () => void;
}

const STEP_LABELS: Record<number, string> = {
  1: 'Загрузка статьи из Wikipedia',
  2: 'Извлечение биографических фактов',
  3: 'Добивочный проход (gap-filling)',
  4: 'Аннотация и тематизация',
  5: 'Редактура и ранжирование',
  6: 'Композиция и визуализация',
};

export function BiographyImportModal({
  isOpen,
  loading,
  error,
  errorDetail,
  meta,
  progress,
  onClose,
}: BiographyImportModalProps) {
  const totalSteps = progress?.total ?? 6;
  const currentStep = progress?.step ?? 0;
  const progressPercent = loading
    ? Math.min(96, Math.round((currentStep / totalSteps) * 100))
    : error
      ? 100
      : meta
        ? 100
        : 0;

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
              <span className="font-medium">{progress?.label ?? 'Подготовка...'}</span>
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
            {progress?.detail && (
              <div className="text-xs leading-5 text-blue-700">
                {progress.detail}
              </div>
            )}
          </div>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
            <div
              key={step}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                step < currentStep
                  ? 'bg-green-50 text-green-800'
                  : step === currentStep
                    ? 'bg-blue-50 text-blue-800 font-medium'
                    : 'text-slate-400'
              }`}
            >
              {step < currentStep ? (
                <svg className="h-5 w-5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : step === currentStep ? (
                <svg className="h-5 w-5 shrink-0 animate-spin text-blue-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <div className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" />
              )}
              <span>{STEP_LABELS[step] ?? `Шаг ${step}`}</span>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
          {errorDetail && (
            <details className="rounded-lg border border-red-100 bg-red-50/50 px-4 py-3">
              <summary className="cursor-pointer text-xs font-medium text-red-600">
                Подробности ошибки
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs text-red-600">
                {errorDetail}
              </pre>
            </details>
          )}
          {progress && (
            <div className="text-xs text-slate-500">
              Ошибка на шаге {progress.step}/{progress.total}: {progress.label}
            </div>
          )}
        </div>
      ) : meta ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Таймлайн успешно построен
          </div>
          <div className="space-y-1 text-sm text-slate-700">
            <div><span className="font-medium">Модель:</span> {meta.model ?? '—'}</div>
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
