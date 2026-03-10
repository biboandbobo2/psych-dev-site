import { useEffect, useRef } from 'react';
import type { VideoTranscriptStoragePayload } from '../../../types/videoTranscripts';

interface VideoTranscriptPanelProps {
  error: string | null;
  highlightedStartMs?: number | null;
  isChecking: boolean;
  isLoading: boolean;
  onTimestampClick: (startMs: number) => void;
  query?: string | null;
  transcript: VideoTranscriptStoragePayload | null;
}

function formatTranscriptTimestamp(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
  }

  return [minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export function VideoTranscriptPanel({
  error,
  highlightedStartMs = null,
  isChecking,
  isLoading,
  onTimestampClick,
  query = null,
  transcript,
}: VideoTranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlightedStartMs === null || !containerRef.current) {
      return;
    }

    const highlightedNode = containerRef.current.querySelector<HTMLElement>(
      `[data-start-ms="${highlightedStartMs}"]`
    );
    highlightedNode?.scrollIntoView({ block: 'center' });
  }, [highlightedStartMs, transcript]);

  return (
    <aside className="flex h-full min-h-0 flex-col px-4 py-4 text-white lg:px-5 lg:py-5">
      <div className="border-b border-white/10 pb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">Транскрипт</p>
        <h3 className="mt-3 text-lg font-semibold text-white">С расшифровкой по таймкодам</h3>
        <p className="mt-2 text-sm leading-6 text-white/55">
          {transcript?.language ? `Язык: ${transcript.language.toUpperCase()}` : 'Текст лекции с привязкой ко времени'}
        </p>
        {query ? (
          <p className="mt-2 text-xs leading-5 text-white/40">Открыто из поиска по запросу: {query}</p>
        ) : null}
      </div>

      <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto py-4">
        {isChecking || isLoading ? (
          <p className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/70">
            Загружаем транскрипт...
          </p>
        ) : null}

        {!isChecking && !isLoading && error ? (
          <p className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/70">
            {error}
          </p>
        ) : null}

        {!isChecking && !isLoading && !error && transcript ? (
          <div className="space-y-3">
            {transcript.segments.map((segment) => (
              <div
                key={`${segment.index}-${segment.startMs}`}
                data-start-ms={segment.startMs}
                className={`rounded-[1.1rem] border px-4 py-3 ${
                  highlightedStartMs === segment.startMs
                    ? 'border-accent bg-accent/10 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
                    : 'border-white/10 bg-black/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onTimestampClick(segment.startMs)}
                  className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40 transition hover:text-white focus:outline-none focus:text-white"
                >
                  {formatTranscriptTimestamp(segment.startMs)}
                </button>
                <p className="mt-2 text-sm leading-6 text-white/85">{segment.text}</p>
              </div>
            ))}
          </div>
        ) : null}

        {!isChecking && !isLoading && !error && !transcript ? (
          <p className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/70">
            Транскрипт пока недоступен.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
