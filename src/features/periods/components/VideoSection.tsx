import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Section } from '../../../components/ui/Section';
import { cn } from '../../../lib/cn';
import { isUrlString, normalizeVideoEntry } from '../utils/media';
import { VideoStudyNotesPanel } from './VideoStudyNotesPanel';

interface VideoSectionProps {
  slug: string;
  title: string;
  content: any[];
  deckUrl: string;
  defaultVideoTitle: string;
  periodId?: string;
  periodTitle: string;
}

type VideoLayoutMode = 'embed' | 'study';

export function VideoSection({
  slug,
  title,
  content,
  deckUrl,
  defaultVideoTitle,
  periodId,
  periodTitle,
}: VideoSectionProps) {
  const videos = content.map((entry, index) => {
    const normalized = normalizeVideoEntry(entry);
    const effectiveDeckUrl = normalized.deckUrl || deckUrl;
    return {
      ...normalized,
      deckUrl: effectiveDeckUrl,
      key: `${slug}-video-${index}`,
    };
  });

  const showVideoHeadings =
    videos.length > 1 ||
    videos.some(
      (video) =>
        video.title &&
        video.title.trim().length > 0 &&
        video.title.trim().toLowerCase() !== defaultVideoTitle.toLowerCase()
    );

  if (!videos.length) {
    return null;
  }

  return (
    <Section key={slug} title={title} contentClassName="max-w-none">
      <div className="space-y-6">
        {videos.map(({ key, title: videoTitle, embedUrl, originalUrl, isYoutube, deckUrl: videoDeckUrl, audioUrl }) => (
          <VideoSectionCard
            key={key}
            videoTitle={videoTitle}
            embedUrl={embedUrl}
            originalUrl={originalUrl}
            isYoutube={isYoutube}
            deckUrl={videoDeckUrl}
            audioUrl={audioUrl}
            showVideoHeading={showVideoHeadings}
            periodId={periodId}
            periodTitle={periodTitle}
            defaultVideoTitle={defaultVideoTitle}
          />
        ))}
      </div>
    </Section>
  );
}

interface VideoSectionCardProps {
  videoTitle: string;
  embedUrl: string;
  originalUrl: string;
  isYoutube: boolean;
  deckUrl: string;
  audioUrl: string;
  showVideoHeading: boolean;
  periodId?: string;
  periodTitle: string;
  defaultVideoTitle: string;
}

function VideoSectionCard({
  videoTitle,
  embedUrl,
  originalUrl,
  isYoutube,
  deckUrl,
  audioUrl,
  showVideoHeading,
  periodId,
  periodTitle,
  defaultVideoTitle,
}: VideoSectionCardProps) {
  const [mode, setMode] = useState<VideoLayoutMode>('embed');
  const [studyDraft, setStudyDraft] = useState('');
  const effectiveVideoTitle = videoTitle?.trim() || defaultVideoTitle;

  if (!embedUrl) {
    const isPlaylist = isUrlString(originalUrl) && originalUrl.includes('list=');
    return (
      <div className="space-y-3">
        <p className="text-lg leading-8 text-muted">
          {isPlaylist ? (
            <>
              Это плейлист YouTube — встраивание недоступно.{' '}
              <a className="text-accent no-underline hover:no-underline focus-visible:no-underline" href={originalUrl} target="_blank" rel="noreferrer">
                Открыть плейлист на YouTube
              </a>
            </>
          ) : (
            <>
              Видео недоступно для встраивания.{' '}
              {isUrlString(originalUrl) ? (
                <a className="text-accent no-underline hover:no-underline focus-visible:no-underline" href={originalUrl} target="_blank" rel="noreferrer">
                  Открыть на YouTube
                </a>
              ) : (
                'Проверьте URL.'
              )}
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          {showVideoHeading && effectiveVideoTitle ? (
            <h3 className="text-2xl font-semibold leading-tight text-fg">{effectiveVideoTitle}</h3>
          ) : null}
        </div>
        <VideoModeButton
          label={mode === 'study' ? 'Скрыть конспект' : 'Открыть конспект'}
          isActive={mode === 'study'}
          onClick={() => setMode((current) => (current === 'study' ? 'embed' : 'study'))}
          controlsId={`${effectiveVideoTitle}-study-panel`}
        />
      </div>

      <div className="space-y-4">
        <iframe
          title={effectiveVideoTitle}
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="aspect-video w-full rounded-2xl border border-border shadow-brand"
        />
        {deckUrl || audioUrl ? (
          <div className="flex flex-wrap items-center gap-3">
            {deckUrl ? (
              <a
                className="inline-block text-sm font-semibold italic text-[color:var(--accent)] no-underline hover:no-underline focus-visible:no-underline"
                href={deckUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Скачать презентацию
              </a>
            ) : null}
            {audioUrl ? (
              <a
                className="ml-auto inline-block text-sm font-semibold italic text-[color:var(--accent)] no-underline hover:no-underline focus-visible:no-underline"
                href={audioUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Слушать аудио
              </a>
            ) : null}
          </div>
        ) : null}
        {!isYoutube && isUrlString(originalUrl) ? (
          <p className="text-sm leading-6 text-muted">
            Ссылка не похожа на YouTube. Проверить источник:{' '}
            <a className="text-accent no-underline hover:no-underline focus-visible:no-underline" href={originalUrl} target="_blank" rel="noreferrer">
              {originalUrl}
            </a>
          </p>
        ) : null}
      </div>

      <VideoStudyOverlay
        audioUrl={audioUrl}
        deckUrl={deckUrl}
        draftContent={studyDraft}
        embedUrl={embedUrl}
        isOpen={mode === 'study'}
        isYoutube={isYoutube}
        onClose={() => setMode('embed')}
        onDraftChange={setStudyDraft}
        originalUrl={originalUrl}
        periodId={periodId}
        periodTitle={periodTitle}
        videoTitle={effectiveVideoTitle}
      />
    </div>
  );
}

interface VideoStudyOverlayProps {
  audioUrl: string;
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

function VideoStudyOverlay({
  audioUrl,
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
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Скрыть конспект
            </button>
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

            {(deckUrl || audioUrl || (!isYoutube && isUrlString(originalUrl))) ? (
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
          <VideoStudyNotesPanel
            draftContent={draftContent}
            onDraftChange={onDraftChange}
            periodId={periodId}
            periodTitle={periodTitle}
            videoTitle={videoTitle}
          />
        </aside>
      </div>
    </div>,
    document.body
  );
}

function VideoModeButton({
  label,
  isActive,
  onClick,
  controlsId,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  controlsId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-2 text-sm font-medium transition',
        isActive
          ? 'border-[color:var(--accent)] bg-[color:var(--accent)] text-white shadow-sm'
          : 'border-border/70 bg-card2 text-fg hover:bg-card'
      )}
      aria-expanded={isActive}
      aria-controls={controlsId}
    >
      {label}
    </button>
  );
}
