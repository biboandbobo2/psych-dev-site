import { useState } from 'react';
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

      <div
        className={cn(
          mode === 'study'
            ? 'overflow-hidden rounded-[2rem] border border-slate-950/90 bg-[#05070a] shadow-[0_28px_80px_rgba(5,7,10,0.24)]'
            : 'space-y-4'
        )}
      >
        <div
          className={cn(
            mode === 'study'
              ? 'grid lg:min-h-[calc(100vh-16rem)] lg:grid-cols-[minmax(0,1fr)_23rem] xl:grid-cols-[minmax(0,1fr)_25rem]'
              : 'space-y-4'
          )}
        >
          <div
            className={cn(
              mode === 'study'
                ? 'flex min-h-[22rem] flex-col bg-[#05070a] lg:min-h-[calc(100vh-16rem)]'
                : 'space-y-4'
            )}
          >
            <div className={cn(mode === 'study' ? 'flex-1 p-3 md:p-4 xl:p-5' : undefined)}>
              <div
                className={cn(
                  mode === 'study'
                    ? 'flex h-full min-h-[22rem] items-center justify-center overflow-hidden rounded-[1.5rem] bg-black ring-1 ring-white/10'
                    : undefined
                )}
              >
                <iframe
                  title={effectiveVideoTitle}
                  src={embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className={cn(
                    mode === 'study'
                      ? 'h-full min-h-[22rem] w-full lg:min-h-[calc(100vh-22rem)]'
                      : 'aspect-video w-full rounded-2xl border border-border shadow-brand'
                  )}
                />
              </div>
            </div>

            {(deckUrl || audioUrl || (!isYoutube && isUrlString(originalUrl))) ? (
              <div
                className={cn(
                  'flex flex-wrap items-center gap-3',
                  mode === 'study'
                    ? 'border-t border-white/10 px-4 py-3 text-white/70 md:px-5'
                    : undefined
                )}
              >
                {deckUrl ? (
                  <a
                    className={cn(
                      'inline-block text-sm font-semibold italic no-underline hover:no-underline focus-visible:no-underline',
                      mode === 'study' ? 'text-white/80 hover:text-white' : 'text-[color:var(--accent)]'
                    )}
                    href={deckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Скачать презентацию
                  </a>
                ) : null}
                {audioUrl ? (
                  <a
                    className={cn(
                      'inline-block text-sm font-semibold italic no-underline hover:no-underline focus-visible:no-underline',
                      mode === 'study'
                        ? 'text-white/80 hover:text-white lg:ml-auto'
                        : 'text-[color:var(--accent)] lg:ml-auto'
                    )}
                    href={audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Слушать аудио
                  </a>
                ) : null}
                {!isYoutube && isUrlString(originalUrl) ? (
                  <p className={cn('text-sm leading-6', mode === 'study' ? 'w-full text-white/60' : 'text-muted')}>
                    Ссылка не похожа на YouTube. Проверить источник:{' '}
                    <a
                      className={cn(
                        'no-underline hover:no-underline focus-visible:no-underline',
                        mode === 'study' ? 'text-white' : 'text-accent'
                      )}
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

          <div
            id={`${effectiveVideoTitle}-study-panel`}
            className={cn(
              mode === 'study'
                ? 'border-t border-white/10 bg-white/[0.03] lg:border-l lg:border-t-0'
                : 'hidden'
            )}
          >
            <VideoStudyNotesPanel
              periodId={periodId}
              periodTitle={periodTitle}
              videoTitle={effectiveVideoTitle}
            />
          </div>
        </div>
      </div>
    </div>
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
