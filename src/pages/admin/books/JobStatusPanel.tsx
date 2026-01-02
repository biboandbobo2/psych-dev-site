/**
 * Панель статуса обработки книги
 */
import type { JobStatus } from './types';

interface JobStatusPanelProps {
  job: JobStatus;
  onClose: () => void;
}

export function JobStatusPanel({ job, onClose }: JobStatusPanelProps) {
  const isError = job.status === 'error';
  const isDone = job.status === 'done' || isError;

  return (
    <div
      className={`rounded-2xl border p-5 space-y-3 ${
        isError ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3
          className={`font-semibold ${isError ? 'text-red-900' : 'text-amber-900'}`}
        >
          {isError ? 'Ошибка обработки' : 'Обработка книги'}
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${isError ? 'text-red-700' : 'text-amber-700'}`}
          >
            {job.stepLabel}
          </span>
          {isDone && (
            <button
              onClick={onClose}
              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
            >
              Закрыть
            </button>
          )}
        </div>
      </div>

      <div
        className={`w-full rounded-full h-2 ${
          isError ? 'bg-red-200' : 'bg-amber-200'
        }`}
      >
        <div
          className={`h-2 rounded-full transition-all ${
            isError ? 'bg-red-600' : 'bg-amber-600'
          }`}
          style={{ width: `${job.progressPercent}%` }}
        />
      </div>

      <p
        className={`text-sm ${isError ? 'text-red-800' : 'text-amber-800'}`}
      >
        Прогресс: {job.progress.done} / {job.progress.total} ({job.progressPercent}%)
      </p>

      {job.error && (
        <div className="text-sm text-red-800 bg-red-100 rounded p-2">
          Ошибка: {job.error.message}
        </div>
      )}

      {job.logs.length > 0 && (
        <details
          className={`text-xs ${isError ? 'text-red-700' : 'text-amber-700'}`}
          open={isError}
        >
          <summary className="cursor-pointer font-medium">
            Логи ({job.logs.length})
          </summary>
          <pre className="mt-2 p-2 bg-white/50 rounded overflow-x-auto max-h-64 overflow-y-auto">
            {job.logs.join('\n')}
          </pre>
        </details>
      )}
    </div>
  );
}
