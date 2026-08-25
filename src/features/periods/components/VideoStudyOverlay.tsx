import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getYouTubeVideoId } from '../../../lib/videoTranscripts';
import type { LectureNoteDraft } from '../../../types/notes';
import { VideoStudyNotesPanel, type LectureNoteSaveStatus } from './VideoStudyNotesPanel';
import { VideoStudyQuestionsPanel } from './VideoStudyQuestionsPanel';
import {
  StudyVideoPlayer,
  type StudyVideoPlaybackSnapshot,
  type StudyVideoPlayerHandle,
} from './StudyVideoPlayer';
import { VideoTranscriptPanel } from './VideoTranscriptPanel';
import { TranscriptExplainCard } from './TranscriptExplainCard';
import { useLectureExplain } from '../hooks/useLectureExplain';
import { useVideoTranscript } from '../../../hooks';
import { trackFeatureEvent } from '../../../lib/telemetry';

interface VideoStudyOverlayProps {
  courseId: string;
  draft: LectureNoteDraft;
  embedUrl: string;
  isOpen: boolean;
  /** Снапшот позиции передаётся, чтобы вернуть inline-плеер на место остановки. */
  onClose: (snapshot?: StudyVideoPlaybackSnapshot) => void;
  onDraftChange: (draft: LectureNoteDraft) => void;
  originalUrl: string;
  periodId: string;
  periodTitle: string;
  videoTitle: string;
  initialPanel?: SidebarMode;
  initialSeekMs?: number | null;
  initialPaused?: boolean;
  initialQuery?: string | null;
  highlightedStartMs?: number | null;
  /** Понятия урока для поисковых чипов при выделении в транскрипте */
  concepts?: string[];
  watchThreshold?: number;
  onWatchThresholdReached?: () => void;
  onPlaybackProgressMs?: (currentTimeMs: number) => void;
}

type SidebarMode = 'notes' | 'transcript' | 'questions';

export function VideoStudyOverlay({
  courseId,
  draft,
  embedUrl,
  isOpen,
  onClose,
  onDraftChange,
  originalUrl,
  periodId,
  periodTitle,
  videoTitle,
  initialPanel = 'notes',
  initialSeekMs = null,
  initialPaused = false,
  initialQuery = null,
  highlightedStartMs = null,
  concepts = [],
  watchThreshold,
  onWatchThresholdReached,
  onPlaybackProgressMs,
}: VideoStudyOverlayProps) {
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(initialPanel);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [transcriptFocusMs, setTranscriptFocusMs] = useState<number | null>(
    initialSeekMs ?? highlightedStartMs
  );
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [noteSaveStatus, setNoteSaveStatus] = useState<LectureNoteSaveStatus>('idle');
  const playerRef = useRef<StudyVideoPlayerHandle | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const youtubeVideoId = useMemo(
    () => getYouTubeVideoId(originalUrl) ?? getYouTubeVideoId(embedUrl),
    [embedUrl, originalUrl]
  );
  const lectureResourceId = (youtubeVideoId ?? originalUrl) || embedUrl;
  const isTranscriptMode = sidebarMode === 'transcript';
  const transcriptState = useVideoTranscript(youtubeVideoId, isOpen, isTranscriptMode);
  // Формат ключа — как в shared/lectureRag/chunker.ts (buildLectureKey);
  // если lecture sources под этим ключом нет, /api/lectures деградирует до fallback
  const lectureKey =
    periodId && youtubeVideoId ? `${courseId}::${periodId}::${youtubeVideoId}` : null;
  const lectureExplain = useLectureExplain(courseId, lectureKey);
  const clearExplain = lectureExplain.clear;
  const handleClose = useCallback(() => {
    onClose(playerRef.current?.getPlaybackSnapshot());
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      clearExplain();
    }
  }, [isOpen, clearExplain]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    // Вложенные слои (модалки, selection-меню) гасят Escape в capture-фазе;
    // defaultPrevented — страховка от bubble-обработчиков.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        handleClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!isOpen) {
      setSidebarMode('notes');
      setIsPanelExpanded(false);
      setIsSettingsOpen(false);
      setShowTimestamps(false);
    }
  }, [isOpen]);

  // Поповер настроек закрывается по клику мимо и по Esc; Esc гасится
  // в capture-фазе, чтобы не закрыть весь режим конспекта (см. Esc-иерархию).
  useEffect(() => {
    if (!isSettingsOpen) {
      return undefined;
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isSettingsOpen]);

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
    if (isOpen && sidebarMode === 'transcript') {
      trackFeatureEvent('transcript_opened', { courseId, periodId });
    }
  }, [isOpen, sidebarMode, courseId, periodId]);

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

  // Подсветка транскрипта следует за воспроизведением, пока вкладка открыта.
  useEffect(() => {
    if (!isOpen || sidebarMode !== 'transcript') {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      // Обновляем и на паузе — перемотка в паузе тоже должна двигать рамку;
      // при неизменном времени setState с тем же значением не рендерит.
      const snapshot = playerRef.current?.getPlaybackSnapshot();
      if (snapshot && snapshot.currentTimeMs !== null) {
        setTranscriptFocusMs(snapshot.currentTimeMs);
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isOpen, sidebarMode]);

  if (typeof document === 'undefined' || !isOpen) {
    return null;
  }

  const saveStatusLabel =
    noteSaveStatus === 'signed-out'
      ? 'Войдите, чтобы сохранять конспект'
      : noteSaveStatus === 'saving'
      ? 'Автосохранение...'
      : noteSaveStatus === 'error'
      ? 'Ошибка сохранения'
      : noteSaveStatus === 'dirty'
      ? 'Есть несохранённые изменения'
      : noteSaveStatus === 'saved'
      ? 'Конспект сохранён'
      : 'Автосохранение включено';

  const saveIndicatorClassName =
    noteSaveStatus === 'signed-out'
      ? 'bg-white/20 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]'
      : noteSaveStatus === 'saving'
      ? 'bg-amber-300 shadow-[0_0_0_4px_rgba(252,211,77,0.15)]'
      : noteSaveStatus === 'error'
      ? 'bg-rose-400 shadow-[0_0_0_4px_rgba(251,113,133,0.15)]'
      : noteSaveStatus === 'saved'
      ? 'bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.15)]'
      : 'bg-white/35 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]';

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
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Выйти из режима конспекта"
            title="Выйти из режима конспекта (Esc)"
            className="absolute left-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-lg text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-black/80"
          >
            ←
          </button>

          <div className="flex-1 p-3 md:p-5">
            <div className="h-full min-h-[16rem] overflow-hidden rounded-[1.6rem] bg-black ring-1 ring-white/10">
              <StudyVideoPlayer
                ref={playerRef}
                title={`${videoTitle} fullscreen`}
                embedUrl={embedUrl}
                initialSeekMs={initialSeekMs}
                initialPaused={initialPaused}
                watchThreshold={watchThreshold}
                onWatchThresholdReached={onWatchThresholdReached}
                onPlaybackProgressMs={onPlaybackProgressMs}
              />
            </div>
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

          <div className="flex shrink-0 items-center gap-1 border-b border-white/10 px-3 py-2 lg:px-4">
            <SidebarTab
              label="Конспект"
              isActive={sidebarMode === 'notes'}
              onClick={() => setSidebarMode('notes')}
            />
            {transcriptState.hasTranscript ? (
              <SidebarTab
                label="Транскрипт"
                isActive={sidebarMode === 'transcript'}
                onClick={() => setSidebarMode('transcript')}
              />
            ) : null}
            <SidebarTab
              label="Чат"
              isActive={sidebarMode === 'questions'}
              onClick={() => setSidebarMode('questions')}
            />

            <div className="ml-auto flex items-center gap-1">
              <div className="group relative">
                <button
                  type="button"
                  aria-label={saveStatusLabel}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${saveIndicatorClassName}`} />
                </button>
                <div className="pointer-events-none absolute right-0 top-full z-30 mt-1 max-w-[12rem] translate-y-1 whitespace-nowrap rounded-xl border border-white/10 bg-[#11161d]/95 px-3 py-2 text-xs leading-5 text-white/80 opacity-0 shadow-2xl transition duration-150 group-hover:translate-y-0 group-hover:opacity-100">
                  {saveStatusLabel}
                </div>
              </div>

              <div ref={settingsRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen((current) => !current)}
                  aria-label="Настройки конспекта"
                  aria-expanded={isSettingsOpen}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] ${
                    isSettingsOpen ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white'
                  }`}
                >
                  ⚙
                </button>
                {isSettingsOpen ? (
                  <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl border border-white/10 bg-[#11161d]/95 p-3 shadow-2xl">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-white/80">Таймкоды в конспекте</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={showTimestamps}
                        aria-label="Таймкоды в конспекте"
                        onClick={() => setShowTimestamps((current) => !current)}
                        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                          showTimestamps ? 'bg-[color:var(--accent)]' : 'bg-white/15'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                            showTimestamps ? 'left-[1.1rem]' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {sidebarMode === 'transcript' ? (
            <>
              <VideoTranscriptPanel
                error={transcriptState.error}
                focusTimeMs={transcriptFocusMs}
                highlightedStartMs={highlightedStartMs}
                isChecking={transcriptState.isChecking}
                isLoading={transcriptState.isLoading}
                onTimestampClick={(startMs) => playerRef.current?.seekToMs(startMs)}
                query={initialQuery}
                transcript={transcriptState.transcript}
                concepts={concepts}
                onExplainSelection={lectureExplain.explain}
              />
              <TranscriptExplainCard
                state={lectureExplain.state}
                onClose={clearExplain}
                onCitationClick={(startMs) => playerRef.current?.seekToMs(startMs)}
              />
            </>
          ) : sidebarMode === 'questions' ? (
            <VideoStudyQuestionsPanel
              courseId={courseId}
              periodId={periodId}
              periodTitle={periodTitle.trim() || videoTitle}
              lectureTitle={videoTitle}
              videoId={youtubeVideoId}
              noteSegments={draft.segments}
              getPlaybackSnapshot={() =>
                playerRef.current?.getPlaybackSnapshot() ?? {
                  currentTimeMs: null,
                  paused: true,
                }
              }
              onTimestampClick={(startMs) => playerRef.current?.seekToMs(startMs)}
            />
          ) : null}

          {/* Панель конспекта не размонтируется при смене вкладки: автосейв
              продолжает работать, а индикатор ● в строке вкладок отражает
              реальное состояние, а не последнее перед размонтированием. */}
          <div className={sidebarMode === 'notes' ? 'min-h-0 flex-1' : 'hidden'}>
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
              onSaveStatusChange={setNoteSaveStatus}
              onTimestampClick={(startMs) => playerRef.current?.seekToMs(startMs)}
              periodId={periodId}
              periodTitle={periodTitle}
              showTimestamps={showTimestamps}
              videoTitle={videoTitle}
            />
          </div>
        </aside>
      </div>
    </div>,
    document.body
  );
}

function SidebarTab({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
        isActive ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}
