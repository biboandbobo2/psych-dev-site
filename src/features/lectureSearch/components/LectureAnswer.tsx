import type { LectureCitation } from '../hooks/useLectureAnswer';

interface LectureAnswerProps {
  answer: string;
  citations: LectureCitation[];
  tookMs: number | null;
}

export function LectureAnswer({ answer, citations, tookMs }: LectureAnswerProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card px-4 py-4 text-sm text-fg leading-relaxed whitespace-pre-wrap">
        {answer}
      </div>

      {citations.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Источники из лекций ({citations.length})
          </h4>

          <div className="space-y-2">
            {citations.map((citation) => (
              <div
                key={citation.chunkId}
                className="rounded-lg border border-border bg-card2 px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-fg">
                      {citation.lectureTitle}
                    </div>
                    <div className="text-xs text-muted">
                      {citation.periodTitle} · {citation.timestampLabel}
                    </div>
                    {citation.claim ? (
                      <div className="mt-1 text-xs italic text-muted">
                        «{citation.claim}»
                      </div>
                    ) : null}
                  </div>

                  <a
                    href={citation.path}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-card2"
                  >
                    Открыть лекцию
                  </a>
                </div>

                <div className="mt-3 rounded bg-card px-3 py-2 text-xs leading-relaxed text-muted">
                  {citation.excerpt}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tookMs ? (
        <p className="text-right text-xs text-muted">
          Ответ за {(tookMs / 1000).toFixed(1)} сек
        </p>
      ) : null}
    </div>
  );
}
