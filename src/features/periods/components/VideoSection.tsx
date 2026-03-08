import { useState } from 'react';
import { Section } from '../../../components/ui/Section';
import { cn } from '../../../lib/cn';
import { isUrlString, normalizeVideoEntry } from '../utils/media';
import { VideoStudyOverlay } from './VideoStudyOverlay';

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
