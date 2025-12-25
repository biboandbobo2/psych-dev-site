/**
 * Компонент отображения ответа с цитатами
 */
import { useState } from 'react';
import type { Citation } from '../hooks/useBookAnswer';
import { useBookSnippet } from '../hooks/useBookSnippet';

interface BookAnswerProps {
  answer: string;
  citations: Citation[];
  tookMs: number | null;
}

export function BookAnswer({ answer, citations, tookMs }: BookAnswerProps) {
  const [expandedChunkId, setExpandedChunkId] = useState<string | null>(null);
  const { loading, data, error, loadSnippet, clear } = useBookSnippet();

  const handleExpandCitation = async (citation: Citation) => {
    if (expandedChunkId === citation.chunkId) {
      setExpandedChunkId(null);
      clear();
      return;
    }

    setExpandedChunkId(citation.chunkId);
    await loadSnippet(citation.chunkId);
  };

  return (
    <div className="space-y-4">
      {/* Answer */}
      <div className="rounded-lg border border-border bg-card px-4 py-4 text-sm text-fg leading-relaxed whitespace-pre-wrap">
        {answer}
      </div>

      {/* Citations */}
      {citations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">
            Источники ({citations.length})
          </h4>

          <div className="space-y-2">
            {citations.map((citation) => (
              <div
                key={citation.chunkId}
                className="rounded-lg border border-border bg-card2 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => handleExpandCitation(citation)}
                  className="w-full px-3 py-2 text-left hover:bg-card transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {citation.bookTitle}
                      </div>
                      <div className="text-xs text-muted">
                        Стр. {citation.pageStart}
                        {citation.pageEnd !== citation.pageStart && `–${citation.pageEnd}`}
                      </div>
                      {citation.claim && (
                        <div className="text-xs text-muted mt-1 italic">
                          «{citation.claim}»
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-accent">
                      {expandedChunkId === citation.chunkId ? 'Скрыть' : 'Показать цитату'}
                    </span>
                  </div>
                </button>

                {/* Expanded snippet */}
                {expandedChunkId === citation.chunkId && (
                  <div className="px-3 pb-3 border-t border-border">
                    {loading ? (
                      <div className="flex items-center gap-2 py-3 text-sm text-muted">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                        Загрузка цитаты...
                      </div>
                    ) : error ? (
                      <div className="py-3 text-sm text-red-600">
                        Ошибка: {error}
                      </div>
                    ) : data ? (
                      <div className="py-3 space-y-3">
                        {/* Previous chunk context */}
                        {data.prevChunk && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted hover:text-fg transition">
                              ← Предыдущий фрагмент (стр. {data.prevChunk.pageStart}–{data.prevChunk.pageEnd})
                            </summary>
                            <div className="mt-2 p-2 bg-slate-100 rounded text-fg/70 text-sm leading-relaxed">
                              {data.prevChunk.preview}
                            </div>
                          </details>
                        )}

                        {/* Main citation */}
                        <div>
                          <div className="text-xs text-muted mb-2">
                            {data.bookTitle}, стр. {data.pageStart}
                            {data.pageEnd !== data.pageStart && `–${data.pageEnd}`}
                            {data.chapterTitle && ` • ${data.chapterTitle}`}
                          </div>
                          <div className="text-sm text-fg leading-relaxed whitespace-pre-wrap bg-white/50 rounded p-3 max-h-64 overflow-y-auto">
                            {data.text}
                          </div>
                        </div>

                        {/* Next chunk context */}
                        {data.nextChunk && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted hover:text-fg transition">
                              Следующий фрагмент (стр. {data.nextChunk.pageStart}–{data.nextChunk.pageEnd}) →
                            </summary>
                            <div className="mt-2 p-2 bg-slate-100 rounded text-fg/70 text-sm leading-relaxed">
                              {data.nextChunk.preview}
                            </div>
                          </details>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timing */}
      {tookMs && (
        <p className="text-xs text-muted text-right">
          Ответ за {(tookMs / 1000).toFixed(1)} сек
        </p>
      )}
    </div>
  );
}
