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
                className="overflow-hidden rounded-xl border border-sky-100 bg-sky-50/60 shadow-sm"
              >
                <div className="border-b border-sky-100 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-fg">
                        {citation.lectureTitle}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {citation.periodTitle}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={citation.path}
                        className="inline-flex items-center rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                      >
                        {citation.timestampLabel}
                      </a>
                      <a
                        href={citation.path}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-card2"
                      >
                        Открыть лекцию
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 px-4 py-3">
                  {citation.claim ? (
                    <div className="rounded-lg border border-sky-100 bg-white px-3 py-2 text-xs italic leading-relaxed text-slate-600">
                      «{citation.claim}»
                    </div>
                  ) : null}

                  <div className="rounded-lg bg-white px-3 py-3 text-sm leading-relaxed text-fg">
                    {citation.excerpt}
                  </div>
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
