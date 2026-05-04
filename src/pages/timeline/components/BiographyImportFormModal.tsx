import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

interface BiographyMeta {
  source?: string;
  factsModel?: string;
  model?: string;
  reviewApplied?: boolean;
  reviewIssues?: string[];
  nodes?: number;
  edges?: number;
}

interface BiographyImportFormModalProps {
  sourceUrl: string;
  loading: boolean;
  error: string | null;
  meta: BiographyMeta | null;
  onSourceUrlChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onImportTimelineJsonFile: (file: File | null) => void;
}

export function BiographyImportFormModal({
  sourceUrl,
  loading,
  error,
  meta,
  onSourceUrlChange,
  onSubmit,
  onClose,
  onImportTimelineJsonFile,
}: BiographyImportFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    urlInputRef.current?.focus();
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || !sourceUrl.trim()) return;
    onSubmit();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onImportTimelineJsonFile(file);
    event.target.value = '';
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-800">Импорт биографии</div>
            <div className="mt-1 text-xs text-slate-500">
              Вставьте прямую ссылку на статью Wikipedia или загрузите готовый JSON-таймлайн.
              Импорт заполнит текущий пустой холст.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {meta ? (
          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1.5 text-[10px] leading-[14px] text-sky-800">
            <span className="font-semibold">{meta.source ?? '?'}</span>
            {' · '}facts: {meta.factsModel ?? '?'}
            {' · '}plan: {meta.model ?? '?'}
            {meta.reviewApplied ? ' · review' : ''}
            {' · '}{meta.nodes ?? 0} узл / {meta.edges ?? 0} вет
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            ref={urlInputRef}
            type="url"
            value={sourceUrl}
            onChange={(event) => onSourceUrlChange(event.target.value)}
            placeholder="https://ru.wikipedia.org/wiki/..."
            disabled={loading}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
          />

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-4 text-red-700">
              {error}
            </div>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              Загрузить JSON
            </button>
            <button
              type="submit"
              disabled={loading || !sourceUrl.trim()}
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? 'Строим...' : 'Построить таймлайн'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
