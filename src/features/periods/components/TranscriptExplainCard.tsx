import { formatTimestampMs } from '../../../lib/formatTimestamp';
import type { LectureExplainState } from '../hooks/useLectureExplain';

interface TranscriptExplainCardProps {
  state: LectureExplainState;
  onClose: () => void;
  onCitationClick: (startMs: number) => void;
}

/** Карточка ответа «Объяснить» в конспект-режиме: ответ AI + таймкоды-цитаты */
export function TranscriptExplainCard({ state, onClose, onCitationClick }: TranscriptExplainCardProps) {
  if (state.status === 'idle') return null;

  return (
    <div className="max-h-[45%] shrink-0 overflow-y-auto border-t border-white/10 bg-black/30 px-4 py-3 lg:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
            Объяснение фрагмента
          </p>
          {state.fragment ? (
            <p className="mt-1 truncate text-xs italic text-white/40">«{state.fragment}»</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть объяснение"
          className="shrink-0 rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      {state.status === 'loading' ? (
        <div className="mt-3 flex items-center gap-3 text-sm text-white/60">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
          Готовим объяснение…
        </div>
      ) : null}

      {state.status === 'error' ? (
        <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </p>
      ) : null}

      {state.status === 'success' ? (
        <>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/85">{state.answer}</p>
          {state.citations.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {state.citations.map((citation) => (
                <button
                  key={citation.chunkId}
                  type="button"
                  onClick={() => onCitationClick(citation.startMs)}
                  title={citation.excerpt}
                  className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 transition hover:bg-white/15 hover:text-white"
                >
                  ⏱ {citation.timestampLabel || formatTimestampMs(citation.startMs)}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
