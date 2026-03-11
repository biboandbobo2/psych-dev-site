import type { LectureCitation } from '../hooks/useLectureAnswer';

interface LectureAnswerProps {
  answer: string;
  citations: LectureCitation[];
  tookMs: number | null;
}

export function LectureAnswer({ answer, citations, tookMs }: LectureAnswerProps) {
  const groupedCitations = groupLectureCitations(citations);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card px-4 py-4 text-sm text-fg leading-relaxed whitespace-pre-wrap">
        {answer}
      </div>

      {groupedCitations.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Источники из лекций ({groupedCitations.length})
          </h4>

          <div className="space-y-2">
            {groupedCitations.map((citation) => (
              <div
                key={citation.lectureKey}
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
                      {citation.timestamps.map((timestamp) => (
                        <a
                          key={`${citation.lectureKey}-${timestamp.startMs}`}
                          href={timestamp.path}
                          className="inline-flex items-center rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                        >
                          {timestamp.timestampLabel}
                        </a>
                      ))}
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
                  {citation.claims.length > 0 ? (
                    <div className="rounded-lg border border-sky-100 bg-white px-3 py-2 text-xs italic leading-relaxed text-slate-600">
                      {citation.claims.map((claim, index) => (
                        <p key={`${citation.lectureKey}-claim-${index}`}>
                          «{claim}»
                        </p>
                      ))}
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

function groupLectureCitations(citations: LectureCitation[]) {
  const groups = new Map<
    string,
    LectureCitation & {
      claims: string[];
      timestamps: Array<{
        path: string;
        startMs: number;
        timestampLabel: string;
      }>;
    }
  >();

  citations.forEach((citation) => {
    const current = groups.get(citation.lectureKey);
    if (!current) {
      groups.set(citation.lectureKey, {
        ...citation,
        claims: citation.claim ? [citation.claim] : [],
        timestamps: [
          {
            path: citation.path,
            startMs: citation.startMs,
            timestampLabel: citation.timestampLabel,
          },
        ],
      });
      return;
    }

    if (citation.claim && !current.claims.includes(citation.claim)) {
      current.claims.push(citation.claim);
    }

    if (!current.timestamps.some((timestamp) => timestamp.startMs === citation.startMs)) {
      current.timestamps.push({
        path: citation.path,
        startMs: citation.startMs,
        timestampLabel: citation.timestampLabel,
      });
      current.timestamps.sort((left, right) => left.startMs - right.startMs);
    }
  });

  return [...groups.values()];
}
