import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getYouTubeVideoId } from '../../../lib/videoTranscripts';
import { isUrlString } from '../utils/media';
import { VideoStudyNotesPanel } from './VideoStudyNotesPanel';
import { VideoTranscriptPanel } from './VideoTranscriptPanel';
import { useVideoTranscript } from '../../../hooks';

interface VideoStudyOverlayProps {
  audioUrl: string;
  courseId: string;
  deckUrl: string;
  draftContent: string;
  embedUrl: string;
  isOpen: boolean;
  isYoutube: boolean;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  originalUrl: string;
  periodId?: string;
  periodTitle: string;
  videoTitle: string;
}

type SidebarMode = 'notes' | 'transcript';

export function VideoStudyOverlay({
  audioUrl,
  courseId,
  deckUrl,
  draftContent,
  embedUrl,
  isOpen,
  isYoutube,
  onClose,
  onDraftChange,
  originalUrl,
  periodId,
  periodTitle,
  videoTitle,
}: VideoStudyOverlayProps) {
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('notes');
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
    }
  }, [isOpen]);

  useEffect(() => {
    if (!transcriptState.hasTranscript && sidebarMode === 'transcript') {
      setSidebarMode('notes');
    }
  }, [sidebarMode, transcriptState.hasTranscript]);

  if (typeof document === 'undefined' || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-[#05070a] text-white"
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
                <iframe
                  title={`${videoTitle} fullscreen`}
                  src={embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="h-full w-full"
                />
              </div>
            </div>

            {deckUrl || audioUrl || (!isYoutube && isUrlString(originalUrl)) ? (
              <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-4 py-3 text-white/75 md:px-5">
                {deckUrl ? (
                  <a
                    className="inline-block text-sm font-semibold italic text-white/85 no-underline hover:text-white hover:no-underline focus-visible:no-underline"
                    href={deckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Скачать презентацию
                  </a>
                ) : null}
                {audioUrl ? (
                  <a
                    className="inline-block text-sm font-semibold italic text-white/85 no-underline hover:text-white hover:no-underline focus-visible:no-underline lg:ml-auto"
                    href={audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Слушать аудио
                  </a>
                ) : null}
                {!isYoutube && isUrlString(originalUrl) ? (
                  <p className="w-full text-sm leading-6 text-white/60">
                    Ссылка не похожа на YouTube. Проверить источник:{' '}
                    <a
                      className="text-white no-underline hover:no-underline focus-visible:no-underline"
                      href={originalUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {originalUrl}
                    </a>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="flex h-[42vh] min-h-[20rem] shrink-0 flex-col border-t border-white/10 bg-white/[0.03] backdrop-blur lg:h-full lg:w-[24rem] lg:border-l lg:border-t-0 xl:w-[26rem]">
          {isTranscriptMode ? (
            <VideoTranscriptPanel
              error={transcriptState.error}
              isChecking={transcriptState.isChecking}
              isLoading={transcriptState.isLoading}
              transcript={transcriptState.transcript}
            />
          ) : (
            <VideoStudyNotesPanel
              courseId={courseId}
              draftContent={draftContent}
              lectureResourceId={lectureResourceId}
              onDraftChange={onDraftChange}
              periodId={periodId}
              periodTitle={periodTitle}
              videoTitle={videoTitle}
            />
          )}
        </aside>
      </div>
    </div>,
    document.body
  );
}
