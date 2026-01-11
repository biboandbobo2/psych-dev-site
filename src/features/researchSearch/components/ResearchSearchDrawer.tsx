import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearchSearch } from '../hooks/useResearchSearch';
import { ResearchResultsList } from './ResearchResultsList';
import { AiAssistantBlock } from './AiAssistantBlock';
import { useSearchHistory } from '../../../hooks';

// Drawer uses only ru+en for simplicity
// Full language selection is available on the dedicated research page
const DRAWER_LANGS = ['ru', 'en'];

interface ResearchSearchDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ResearchSearchDrawer({ open, onClose }: ResearchSearchDrawerProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const { query, setQuery, state, runSearch } = useResearchSearch({
    mode: 'drawer',
    initialLangs: DRAWER_LANGS,
    initialPsychologyOnly: true,
    trigger: 'manual',
    autoTriggerInitial: false,
  });
  const { saveSearch } = useSearchHistory();

  // Сохранение поиска в историю при успешном результате
  const lastSavedQueryRef = useRef<string>('');
  useEffect(() => {
    if (
      state.status === 'success' &&
      query.trim().length >= 3 &&
      query !== lastSavedQueryRef.current
    ) {
      lastSavedQueryRef.current = query;
      saveSearch({
        type: 'research',
        query: query.trim(),
        resultsCount: state.results.length,
      });
    }
  }, [state.status, state.results.length, query, saveSearch]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <section
        className="relative h-full max-h-screen w-full max-w-[720px] overflow-y-auto bg-white shadow-2xl border-l border-border translate-x-0 transition-transform duration-200"
        aria-label="Научный поиск"
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Научный поиск</p>
            <h2 className="text-lg font-semibold text-fg">Open Access источники</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:text-fg hover:bg-card transition"
            aria-label="Закрыть поиск"
          >
            ✕
          </button>
        </header>

        <div className="px-6 py-4 space-y-4">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              runSearch();
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-fg" htmlFor="research-search-input">
                Запрос
              </label>
              <input
                id="research-search-input"
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Например: attachment theory, executive functions..."
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-fg shadow-sm focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <p className="text-xs text-muted">Минимум 3 символа. Источники: OpenAlex, Semantic Scholar (fallback позже).</p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">Поиск по русским и английским источникам</p>
              <button
                type="submit"
                disabled={query.trim().length < 3}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Искать
              </button>
            </div>

            {state.status === 'idle' ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
                Введите запрос (от 3 символов), затем нажмите «Искать».
              </div>
            ) : null}

            {state.status === 'loading' ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                Выполняем поиск…
              </div>
            ) : null}

            {state.status === 'error' ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                Не удалось загрузить результаты: {state.error}
              </div>
            ) : null}
          </form>

          {state.status === 'success' ? (
            <div className="max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
              <ResearchResultsList
                results={state.results.slice(0, 15)}
                query={query}
                onOpenAll={() => {
                  if (!query.trim()) return;
                  navigate(`/research?q=${encodeURIComponent(query.trim())}`);
                  onClose();
                }}
              />
            </div>
          ) : null}

          {/* AI Assistant Block */}
          <AiAssistantBlock />
        </div>
      </section>
    </div>
  );
}
