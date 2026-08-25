import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  VideoTranscriptSegment,
  VideoTranscriptStoragePayload,
} from '../../../types/videoTranscripts';
import { formatTimestampMs } from '../../../lib/formatTimestamp';
import { useTextSelection } from '../hooks/useTextSelection';
import { TranscriptSelectionMenu } from './TranscriptSelectionMenu';
import { trackFeatureEvent } from '../../../lib/telemetry';
import { groupTranscriptSegments } from '../lib/transcriptDisplay';

interface VideoTranscriptPanelProps {
  error: string | null;
  focusTimeMs?: number | null;
  highlightedStartMs?: number | null;
  isChecking: boolean;
  isLoading: boolean;
  onTimestampClick: (startMs: number) => void;
  query?: string | null;
  transcript: VideoTranscriptStoragePayload | null;
  /** Понятия урока для поисковых чипов при длинном выделении */
  concepts?: string[];
  /** «Объяснить» выделенный фрагмент лекционным AI; без хендлера кнопка скрыта */
  onExplainSelection?: (text: string) => void;
}

function getFocusedSegmentStartMs(
  groups: VideoTranscriptSegment[],
  highlightedStartMs: number | null,
  focusTimeMs: number | null
) {
  if (!groups.length) {
    return null;
  }

  // Живая позиция воспроизведения приоритетнее deep-link подсветки (?t=...):
  // иначе рамка навсегда залипает на моменте из URL, хотя лекция ушла дальше.
  if (focusTimeMs !== null) {
    const containing = groups.find(
      (group) => focusTimeMs >= group.startMs && focusTimeMs < group.endMs
    );
    if (containing) {
      return containing.startMs;
    }

    const previous = [...groups].reverse().find((group) => group.startMs <= focusTimeMs);
    return previous?.startMs ?? groups[0].startMs;
  }

  if (highlightedStartMs !== null) {
    const highlighted = groups.find(
      (group) => highlightedStartMs >= group.startMs && highlightedStartMs < group.endMs
    );
    if (highlighted) {
      return highlighted.startMs;
    }
  }

  return null;
}

/** Подсветка совпадений поиска внутри абзаца транскрипта. */
function renderWithMatches(text: string, normalizedQuery: string): ReactNode {
  if (!normalizedQuery) {
    return text;
  }

  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = lower.indexOf(normalizedQuery);

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      parts.push(text.slice(cursor, matchIndex));
    }
    parts.push(
      <mark
        key={matchIndex}
        className="rounded bg-[color:var(--accent)]/35 px-0.5 text-white"
      >
        {text.slice(matchIndex, matchIndex + normalizedQuery.length)}
      </mark>
    );
    cursor = matchIndex + normalizedQuery.length;
    matchIndex = lower.indexOf(normalizedQuery, cursor);
  }

  parts.push(text.slice(cursor));
  return parts;
}

export function VideoTranscriptPanel({
  error,
  focusTimeMs = null,
  highlightedStartMs = null,
  isChecking,
  isLoading,
  onTimestampClick,
  query = null,
  transcript,
  concepts = [],
  onExplainSelection,
}: VideoTranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { selection, clear: clearSelection } = useTextSelection(containerRef);
  const [searchQuery, setSearchQuery] = useState('');
  // Подсветка следует за воспроизведением, пока читатель сам не отмотал список.
  const [isFollowing, setIsFollowing] = useState(true);
  const programmaticScrollRef = useRef(false);

  const groups = useMemo(
    () => (transcript ? groupTranscriptSegments(transcript.segments) : []),
    [transcript]
  );
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleGroups = useMemo(
    () =>
      normalizedQuery
        ? groups.filter((group) => group.text.toLowerCase().includes(normalizedQuery))
        : groups,
    [groups, normalizedQuery]
  );
  const focusedSegmentStartMs = getFocusedSegmentStartMs(
    groups,
    highlightedStartMs,
    focusTimeMs
  );

  const handleSearchSelection = (selectionQuery: string) => {
    trackFeatureEvent('selection_search');
    window.open(`/research?q=${encodeURIComponent(selectionQuery)}`, '_blank', 'noopener');
    clearSelection();
  };

  const handleExplainSelection = onExplainSelection
    ? (text: string) => {
        onExplainSelection(text);
        clearSelection();
      }
    : undefined;

  const handleTimestampClick = (startMs: number) => {
    setIsFollowing(true);
    onTimestampClick(startMs);
  };

  useEffect(() => {
    if (
      !isFollowing ||
      normalizedQuery ||
      focusedSegmentStartMs === null ||
      !containerRef.current
    ) {
      return;
    }

    const highlightedNode = containerRef.current.querySelector<HTMLElement>(
      `[data-start-ms="${focusedSegmentStartMs}"]`
    );
    if (!highlightedNode) {
      return;
    }

    const container = containerRef.current;
    const targetTop =
      highlightedNode.offsetTop - container.clientHeight / 2 + highlightedNode.offsetHeight / 2;

    // Флаг с таймаутом: события скролла от программной прокрутки не должны
    // выключать следование (scroll от пользователя — должен).
    programmaticScrollRef.current = true;
    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 150);

    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'auto',
    });
  }, [focusedSegmentStartMs, transcript, isFollowing, normalizedQuery]);

  return (
    <aside className="flex h-full min-h-0 flex-col px-4 py-4 text-white lg:px-5 lg:py-5">
      <div className="border-b border-white/10 pb-3">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Поиск по транскрипту"
          aria-label="Поиск по транскрипту"
          className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30"
        />
        {normalizedQuery && transcript ? (
          <p className="mt-2 text-xs leading-5 text-white/40">
            Найдено абзацев: {visibleGroups.length}
          </p>
        ) : null}
        {query ? (
          <p className="mt-2 text-xs leading-5 text-white/40">Открыто из поиска: {query}</p>
        ) : null}
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={containerRef}
          onScroll={() => {
            if (programmaticScrollRef.current) {
              return;
            }
            setIsFollowing(false);
          }}
          className="h-full overflow-y-auto py-4"
        >
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
            visibleGroups.length > 0 ? (
              <div className="space-y-3">
                {visibleGroups.map((group) => (
                  <div
                    key={`${group.index}-${group.startMs}`}
                    data-start-ms={group.startMs}
                    className={`rounded-[1.1rem] border px-4 py-3 ${
                      focusedSegmentStartMs === group.startMs
                        ? 'border-accent bg-accent/10 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
                        : 'border-white/10 bg-black/20'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleTimestampClick(group.startMs)}
                      aria-label={`Перейти к ${formatTimestampMs(group.startMs)}`}
                      className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40 transition hover:text-white focus:outline-none focus:text-white"
                    >
                      {formatTimestampMs(group.startMs)}
                    </button>
                    <p className="mt-2 text-sm leading-6 text-white/85">
                      {renderWithMatches(group.text, normalizedQuery)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/70">
                Ничего не найдено по запросу «{searchQuery.trim()}».
              </p>
            )
          ) : null}

          {!isChecking && !isLoading && !error && !transcript ? (
            <p className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/70">
              Транскрипт пока недоступен.
            </p>
          ) : null}
        </div>

        {!isFollowing && !normalizedQuery && transcript ? (
          <button
            type="button"
            onClick={() => setIsFollowing(true)}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:opacity-90"
          >
            ↓ К текущему месту
          </button>
        ) : null}
      </div>

      {selection ? (
        <TranscriptSelectionMenu
          selection={selection}
          concepts={concepts}
          onSearch={handleSearchSelection}
          onExplain={handleExplainSelection}
          onDismiss={clearSelection}
        />
      ) : null}
    </aside>
  );
}
