import { useState } from 'react';
import type { ResearchWork } from '../types';

interface ResearchResultsListProps {
  results: ResearchWork[];
  query?: string;
  onOpenAll?: () => void;
}

// Highlight search terms in text
function highlightText(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;

  // Split query into words, filter short ones
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // escape regex chars

  if (terms.length === 0) return text;

  const regex = new RegExp(`(${terms.join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) => {
    const isMatch = terms.some((t) => part.toLowerCase() === t.toLowerCase());
    if (isMatch) {
      return (
        <mark key={i} className="bg-yellow-200 text-fg rounded px-0.5">
          {part}
        </mark>
      );
    }
    return part;
  });
}

// Single result card with expandable abstract
function ResultCard({ work, query }: { work: ResearchWork; query?: string }) {
  const [expanded, setExpanded] = useState(false);

  const hasLongParagraph = work.paragraph && work.paragraph.length > 200;
  const displayText = expanded || !hasLongParagraph
    ? work.paragraph
    : `${work.paragraph?.slice(0, 200)}…`;

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted flex-wrap">
            {work.source === 'openalex' ? 'OpenAlex' : 'Semantic Scholar'}
            {work.host ? (
              <span className="rounded-full bg-accent-50 px-2 py-0.5 text-accent text-[11px] font-semibold">
                {work.host}
              </span>
            ) : null}
            {work.language && work.language !== 'unknown' ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                {work.language.toUpperCase()}
              </span>
            ) : null}
            {work.year ? (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                {work.year}
              </span>
            ) : null}
          </div>
          <h3 className="text-lg font-semibold text-fg leading-tight">
            {query ? highlightText(work.title, query) : work.title}
          </h3>
          <p className="text-sm text-muted">
            {work.authors.slice(0, 4).join(', ')}
            {work.authors.length > 4 ? ' …' : ''}
            {work.venue ? ` • ${work.venue}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {work.oaPdfUrl || work.primaryUrl ? (
            <a
              href={work.oaPdfUrl || work.primaryUrl || undefined}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Открыть
            </a>
          ) : (
            <span className="text-xs text-muted">Ссылка недоступна</span>
          )}
          {work.doi ? (
            <span className="text-[11px] text-muted truncate max-w-[150px]" title={work.doi}>
              DOI: {work.doi.replace('https://doi.org/', '')}
            </span>
          ) : null}
        </div>
      </div>

      {work.paragraph ? (
        <div className="mt-3">
          <p className="text-sm text-fg/80 leading-relaxed">
            {query ? highlightText(displayText || '', query) : displayText}
          </p>
          {hasLongParagraph ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs text-accent hover:underline"
            >
              {expanded ? 'Свернуть' : 'Показать полностью'}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function ResearchResultsList({ results, query, onOpenAll }: ResearchResultsListProps) {
  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
        Ничего не найдено. Попробуйте уточнить запрос или изменить язык.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((work) => (
        <ResultCard key={work.id} work={work} query={query} />
      ))}

      {onOpenAll ? (
        <button
          type="button"
          onClick={onOpenAll}
          className="mt-2 w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-accent transition hover:bg-card2"
        >
          Открыть все результаты
        </button>
      ) : null}
    </div>
  );
}
