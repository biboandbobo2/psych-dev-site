import { useEffect, useMemo, useRef, useState } from 'react';
import { Section } from '../../../components/ui/Section';
import { cn } from '../../../lib/cn';
import { getYouTubeVideoId } from '../../../lib/videoTranscripts';
import type { LectureNoteSegment } from '../../../types/notes';
import { isUrlString, normalizeVideoEntry } from '../utils/media';
import { VideoResourceLinks } from './VideoResourceLinks';
import { VideoStudyOverlay } from './VideoStudyOverlay';

interface VideoSectionProps {
  slug: string;
  title: string;
  content: any[];
  deckUrl: string;
  defaultVideoTitle: string;
  courseId: string;
  periodId?: string;
  periodTitle: string;
  studyLaunch?: {
    requestedVideoId: string;
    initialPanel: 'notes' | 'transcript';
    initialSeekMs: number | null;
    initialQuery: string | null;
  } | null;
}

type VideoLayoutMode = 'embed' | 'study';

export function VideoSection({
  slug,
  title,
  content,
  deckUrl,
  defaultVideoTitle,
  courseId,
  periodId,
  periodTitle,
  studyLaunch,
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
            courseId={courseId}
            periodId={periodId}
            periodTitle={periodTitle}
            defaultVideoTitle={defaultVideoTitle}
            studyLaunch={studyLaunch}
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
  courseId: string;
  periodId?: string;
  periodTitle: string;
  defaultVideoTitle: string;
  studyLaunch?: VideoSectionProps['studyLaunch'];
}

function VideoSectionCard({
  videoTitle,
  embedUrl,
  originalUrl,
  isYoutube,
  deckUrl,
  audioUrl,
  showVideoHeading,
  courseId,
  periodId,
  periodTitle,
  defaultVideoTitle,
  studyLaunch,
}: VideoSectionCardProps) {
  const [mode, setMode] = useState<VideoLayoutMode>('embed');
  const [studyDraftSegments, setStudyDraftSegments] = useState<LectureNoteSegment[]>([]);
  const consumedStudyLaunchRef = useRef<string | null>(null);
  const effectiveVideoTitle = videoTitle?.trim() || defaultVideoTitle;
  const youtubeVideoId = useMemo(
    () => getYouTubeVideoId(originalUrl) ?? getYouTubeVideoId(embedUrl),
    [embedUrl, originalUrl]
  );
  const isStudyLaunchTarget =
    Boolean(studyLaunch?.requestedVideoId) &&
    youtubeVideoId === studyLaunch?.requestedVideoId;
  const studyLaunchKey = isStudyLaunchTarget
    ? `${studyLaunch?.requestedVideoId ?? ''}::${studyLaunch?.initialPanel ?? 'notes'}::${studyLaunch?.initialSeekMs ?? 'none'}`
    : null;
  const shouldAutoOpenStudy =
    mode !== 'study' &&
    Boolean(studyLaunchKey) &&
    consumedStudyLaunchRef.current !== studyLaunchKey;

  useEffect(() => {
    if (shouldAutoOpenStudy) {
      consumedStudyLaunchRef.current = studyLaunchKey;
      setMode('study');
    }
  }, [shouldAutoOpenStudy, studyLaunchKey]);

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
        <VideoResourceLinks
          audioUrl={audioUrl}
          deckUrl={deckUrl}
          originalUrl={originalUrl}
          isYoutube={isYoutube}
          className="flex flex-wrap items-center gap-3"
          deckLinkClassName="inline-block text-sm font-semibold italic text-[color:var(--accent)] no-underline hover:no-underline focus-visible:no-underline"
          audioLinkClassName="ml-auto inline-block text-sm font-semibold italic text-[color:var(--accent)] no-underline hover:no-underline focus-visible:no-underline"
          sourceTextClassName="w-full text-sm leading-6 text-muted"
          sourceLinkClassName="text-accent no-underline hover:no-underline focus-visible:no-underline"
        />
      </div>

      <VideoStudyOverlay
        audioUrl={audioUrl}
        deckUrl={deckUrl}
        draftSegments={studyDraftSegments}
        embedUrl={embedUrl}
        isOpen={mode === 'study'}
        isYoutube={isYoutube}
        onClose={() => setMode('embed')}
        onDraftSegmentsChange={setStudyDraftSegments}
        originalUrl={originalUrl}
        courseId={courseId}
        periodId={periodId}
        periodTitle={periodTitle}
        videoTitle={effectiveVideoTitle}
        initialPanel={isStudyLaunchTarget ? studyLaunch?.initialPanel ?? 'notes' : 'notes'}
        initialQuery={isStudyLaunchTarget ? studyLaunch?.initialQuery ?? null : null}
        initialSeekMs={isStudyLaunchTarget ? studyLaunch?.initialSeekMs ?? null : null}
        highlightedStartMs={isStudyLaunchTarget ? studyLaunch?.initialSeekMs ?? null : null}
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
