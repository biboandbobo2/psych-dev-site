import type { ResearchWork } from '../types';

interface ResearchResultsListProps {
  results: ResearchWork[];
  onOpenAll?: () => void;
}

export function ResearchResultsList({ results, onOpenAll }: ResearchResultsListProps) {
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
        <article key={work.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
                {work.source === 'openalex' ? 'OpenAlex' : 'Semantic Scholar'}
                {work.host ? <span className="rounded-full bg-accent-50 px-2 py-0.5 text-accent text-[11px] font-semibold">{work.host}</span> : null}
                {work.language && work.language !== 'unknown' ? (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                    {work.language.toUpperCase()}
                  </span>
                ) : null}
              </div>
              <h3 className="text-lg font-semibold text-fg">{work.title}</h3>
              <p className="text-sm text-muted">
                {work.authors.slice(0, 4).join(', ')}
                {work.authors.length > 4 ? ' …' : ''} {work.year ? `• ${work.year}` : ''}
                {work.venue ? ` • ${work.venue}` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
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
              {work.doi ? <span className="text-[11px] text-muted">DOI: {work.doi}</span> : null}
            </div>
          </div>
          {work.paragraph ? (
            <p className="mt-3 text-sm text-fg/80 leading-relaxed">{work.paragraph}</p>
          ) : null}
        </article>
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
