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
        <div className="space-y-2">
          {showVideoHeading && effectiveVideoTitle ? (
            <h3 className="text-2xl font-semibold leading-tight text-fg">{effectiveVideoTitle}</h3>
          ) : null}
          <p className="text-sm leading-6 text-muted">
            Можно смотреть во встроенном режиме или открыть режим конспекта и писать заметки параллельно.
          </p>
        </div>
        <div
          className="inline-flex rounded-full border border-border/70 bg-card2 p-1"
          role="tablist"
          aria-label={`Режим отображения для ${effectiveVideoTitle}`}
        >
          <VideoModeButton
            label="Только видео"
            isActive={mode === 'embed'}
            onClick={() => setMode('embed')}
          />
          <VideoModeButton
            label="Видео + заметки"
            isActive={mode === 'study'}
            onClick={() => setMode('study')}
          />
        </div>
      </div>

      <div
        className={cn(
          'gap-6',
          mode === 'study' ? 'grid xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)] xl:items-start' : 'space-y-4'
        )}
      >
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

        {mode === 'study' ? (
          <VideoStudyNotesPanel
            periodId={periodId}
            periodTitle={periodTitle}
            videoTitle={effectiveVideoTitle}
          />
        ) : null}
      </div>
    </div>
  );
}

function VideoModeButton({
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
      className={cn(
        'rounded-full px-4 py-2 text-sm font-medium transition',
        isActive ? 'bg-accent text-white shadow-sm' : 'text-fg hover:bg-card'
      )}
      aria-pressed={isActive}
    >
      {label}
    </button>
  );
}
