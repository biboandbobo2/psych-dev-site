import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getYouTubeVideoId } from '../../../lib/videoTranscripts';
import type { LectureNoteDraft } from '../../../types/notes';
import { VideoStudyNotesPanel } from './VideoStudyNotesPanel';
import { AskLectureQuestionModal } from './AskLectureQuestionModal';
import { VideoResourceLinks } from './VideoResourceLinks';
import { StudyVideoPlayer, type StudyVideoPlayerHandle } from './StudyVideoPlayer';
import { VideoTranscriptPanel } from './VideoTranscriptPanel';
import { useVideoTranscript } from '../../../hooks';

interface VideoStudyOverlayProps {
  audioUrl: string;
  courseId: string;
  deckUrl: string;
  draft: LectureNoteDraft;
  embedUrl: string;
  isOpen: boolean;
  isYoutube: boolean;
  onClose: () => void;
  onDraftChange: (draft: LectureNoteDraft) => void;
  originalUrl: string;
  periodId: string;
  periodTitle: string;
  videoTitle: string;
  initialPanel?: SidebarMode;
  initialSeekMs?: number | null;
  initialQuery?: string | null;
  highlightedStartMs?: number | null;
}

type SidebarMode = 'notes' | 'transcript';

export function VideoStudyOverlay({
  audioUrl,
  courseId,
  deckUrl,
  draft,
  embedUrl,
  isOpen,
  isYoutube,
  onClose,
  onDraftChange,
  originalUrl,
  periodId,
  periodTitle,
  videoTitle,
  initialPanel = 'notes',
  initialSeekMs = null,
  initialQuery = null,
  highlightedStartMs = null,
}: VideoStudyOverlayProps) {
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(initialPanel);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [questionState, setQuestionState] = useState<{ isOpen: boolean; startMs: number | null }>({
    isOpen: false,
    startMs: null,
  });
  const [transcriptFocusMs, setTranscriptFocusMs] = useState<number | null>(
    initialSeekMs ?? highlightedStartMs
  );
  const playerRef = useRef<StudyVideoPlayerHandle | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const youtubeVideoId = useMemo(
    () => getYouTubeVideoId(originalUrl) ?? getYouTubeVideoId(embedUrl),
    [embedUrl, originalUrl]
  );
  const lectureResourceId = (youtubeVideoId ?? originalUrl) || embedUrl;
  const isTranscriptMode = sidebarMode === 'transcript';
  const transcriptState = useVideoTranscript(youtubeVideoId, isOpen, isTranscriptMode);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSidebarMode('notes');
      setIsPanelExpanded(false);
    }
  }, [isOpen]);

  // Перенос фокуса в диалог при открытии и возврат туда, откуда пришли.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();

    return () => {
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSidebarMode(initialPanel);
  }, [initialPanel, isOpen]);

  useEffect(() => {
    if (
      sidebarMode === 'transcript' &&
      !transcriptState.isChecking &&
      !transcriptState.isLoading &&
      !transcriptState.hasTranscript
    ) {
      setSidebarMode('notes');
    }
  }, [
    sidebarMode,
    transcriptState.hasTranscript,
    transcriptState.isChecking,
    transcriptState.isLoading,
  ]);

  useEffect(() => {
    if (!isOpen || sidebarMode !== 'transcript') {
      return;
    }

    const snapshot = playerRef.current?.getPlaybackSnapshot();
    setTranscriptFocusMs(
      snapshot?.currentTimeMs ?? highlightedStartMs ?? initialSeekMs ?? null
    );
  }, [highlightedStartMs, initialSeekMs, isOpen, sidebarMode]);

  if (typeof document === 'undefined' || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[120] bg-[#05070a] text-white outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Режим конспекта: ${videoTitle}`}
    >
      <div className="flex h-full flex-col lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 md:px-5">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                Режим конспекта
              </p>
              <h3 className="truncate pt-1 text-lg font-semibold text-white md:text-xl">{videoTitle}</h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setQuestionState({
                    isOpen: true,
                    startMs: playerRef.current?.getPlaybackSnapshot().currentTimeMs ?? null,
                  })
                }
                className="shrink-0 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Задать вопрос
              </button>
              {transcriptState.hasTranscript ? (
                <button
                  type="button"
                  onClick={() => setSidebarMode((current) => (current === 'transcript' ? 'notes' : 'transcript'))}
                  className="shrink-0 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  {isTranscriptMode ? 'Показать конспект' : 'Показать транскрипт'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Скрыть конспект
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 p-3 md:p-5">
              <div className="h-full min-h-[16rem] overflow-hidden rounded-[1.6rem] bg-black ring-1 ring-white/10">
                <StudyVideoPlayer
                  ref={playerRef}
                  title={`${videoTitle} fullscreen`}
                  embedUrl={embedUrl}
                  initialSeekMs={initialSeekMs}
                />
              </div>
            </div>

            <VideoResourceLinks
              audioUrl={audioUrl}
              deckUrl={deckUrl}
              originalUrl={originalUrl}
              isYoutube={isYoutube}
              className="flex flex-wrap items-center gap-3 border-t border-white/10 px-4 py-3 text-white/75 md:px-5"
              deckLinkClassName="inline-block text-sm font-semibold italic text-white/85 no-underline hover:text-white hover:no-underline focus-visible:no-underline"
              audioLinkClassName="inline-block text-sm font-semibold italic text-white/85 no-underline hover:text-white hover:no-underline focus-visible:no-underline lg:ml-auto"
              sourceTextClassName="w-full text-sm leading-6 text-white/60"
              sourceLinkClassName="text-white no-underline hover:no-underline focus-visible:no-underline"
            />
          </div>
        </div>

        <aside
          className={`flex min-h-[20rem] shrink-0 flex-col border-t border-white/10 bg-white/[0.03] backdrop-blur lg:h-full lg:w-[24rem] lg:border-l lg:border-t-0 xl:w-[26rem] ${
            isPanelExpanded ? 'h-[72vh]' : 'h-[42vh]'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsPanelExpanded((current) => !current)}
            aria-expanded={isPanelExpanded}
            aria-label={isPanelExpanded ? 'Свернуть панель конспекта' : 'Растянуть панель конспекта'}
            className="flex shrink-0 items-center justify-center py-2 lg:hidden"
          >
            <span className="h-1 w-10 rounded-full bg-white/25 transition hover:bg-white/40" />
          </button>
          {isTranscriptMode ? (
            <VideoTranscriptPanel
              error={transcriptState.error}
              focusTimeMs={transcriptFocusMs}
              highlightedStartMs={highlightedStartMs}
              isChecking={transcriptState.isChecking}
              isLoading={transcriptState.isLoading}
              onTimestampClick={(startMs) => playerRef.current?.seekToMs(startMs)}
              query={initialQuery}
              transcript={transcriptState.transcript}
            />
          ) : (
            <VideoStudyNotesPanel
              courseId={courseId}
              draft={draft}
              getPlaybackSnapshot={() =>
                playerRef.current?.getPlaybackSnapshot() ?? {
                  currentTimeMs: null,
                  paused: true,
                }
              }
              lectureResourceId={lectureResourceId}
              onDraftChange={onDraftChange}
              onTimestampClick={(startMs) => playerRef.current?.seekToMs(startMs)}
              periodId={periodId}
              periodTitle={periodTitle}
              videoTitle={videoTitle}
            />
          )}
        </aside>
      </div>

      <AskLectureQuestionModal
        isOpen={questionState.isOpen}
        onClose={() => setQuestionState({ isOpen: false, startMs: null })}
        courseId={courseId}
        periodId={periodId}
        periodTitle={periodTitle.trim() || videoTitle}
        lectureTitle={videoTitle}
        videoId={youtubeVideoId}
        startMs={questionState.startMs}
      />
    </div>,
    document.body
  );
}
