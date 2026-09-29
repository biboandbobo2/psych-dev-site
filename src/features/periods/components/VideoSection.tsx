import { useEffect, useMemo, useRef, useState } from 'react';
import { Section } from '../../../components/ui/Section';
import { cn } from '../../../lib/cn';
import { getYouTubeVideoId } from '../../../lib/videoTranscripts';
import { EMPTY_LECTURE_NOTE_DRAFT, type LectureNoteDraft } from '../../../types/notes';
import { isUrlString, normalizeVideoEntry } from '../utils/media';
import { getLessonVideoKey } from '../utils/lessonVideos';
import { VideoResourceLinks } from './VideoResourceLinks';
import { VideoStudyOverlay } from './VideoStudyOverlay';
import {
  isLessonWatched,
  markLessonWatched,
} from '../../../lib/courseWatchedLessons';
import {
  StudyVideoPlayer,
  type StudyVideoPlaybackSnapshot,
  type StudyVideoPlayedSpan,
  type StudyVideoPlayerHandle,
} from './StudyVideoPlayer';
import {
  getVideoStat,
  recordVideoOpenedExternally,
  recordVideoPlayback,
} from '../../../lib/courseVideoStats';
import { saveCourseVideoResumePoint } from '../../../lib/courseVideoResume';
import { trackFeatureEvent } from '../../../lib/telemetry';

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
  /** Понятия урока для поисковых чипов при выделении в транскрипте */
  concepts?: string[];
  /** Ключ главной (первой) лекции занятия — по ней занятие отмечается просмотренным. */
  mainVideoKey?: string | null;
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
  concepts,
  mainVideoKey = null,
}: VideoSectionProps) {
  const videos = content.map((entry, index) => {
    const normalized = normalizeVideoEntry(entry);
    const effectiveDeckUrl = normalized.deckUrl || deckUrl;
    return {
      ...normalized,
      deckUrl: effectiveDeckUrl,
      key: `${slug}-video-${index}`,
      videoKey: getLessonVideoKey(entry),
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
        {videos.map(({ key, videoKey, title: videoTitle, embedUrl, originalUrl, isYoutube, deckUrl: videoDeckUrl, audioUrl }) => (
          <VideoSectionCard
            key={key}
            videoKey={videoKey}
            isMainVideo={videoKey !== null && videoKey === mainVideoKey}
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
            concepts={concepts}
          />
        ))}
      </div>
    </Section>
  );
}

/**
 * Видео просмотрено по своей статистике; у главной лекции — ещё и по старой
 * отметке занятия (до учёта по видео отмечалось всё занятие целиком).
 */
function readVideoWatched(
  courseId: string,
  periodId: string | undefined,
  videoKey: string | null,
  isMainVideo: boolean
): boolean {
  if (!courseId || !periodId || !videoKey) return false;
  return (
    getVideoStat(courseId, periodId, videoKey).watched === true ||
    (isMainVideo && isLessonWatched(courseId, periodId))
  );
}

interface VideoSectionCardProps {
  videoKey: string | null;
  isMainVideo: boolean;
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
  concepts?: string[];
}

function VideoSectionCard({
  videoKey,
  isMainVideo,
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
  concepts,
}: VideoSectionCardProps) {
  const [mode, setMode] = useState<VideoLayoutMode>('embed');
  const [studyDraft, setStudyDraft] = useState<LectureNoteDraft>(EMPTY_LECTURE_NOTE_DRAFT);
  // Позиция inline-плеера в момент входа в конспект: оверлей продолжает с неё.
  const [studyEntry, setStudyEntry] = useState<StudyVideoPlaybackSnapshot | null>(null);
  const inlinePlayerRef = useRef<StudyVideoPlayerHandle | null>(null);
  const consumedStudyLaunchRef = useRef<string | null>(null);
  const lastSavedPlaybackMsRef = useRef<number | null>(null);
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
  // Режим конспекта требует periodId: без него заметка не привязывается
  // к занятию (см. buildLectureNoteDocumentId). На всех реальных маршрутах
  // periodId присутствует.
  const canUseStudyMode = Boolean(courseId && periodId);
  const shouldAutoOpenStudy =
    canUseStudyMode &&
    mode !== 'study' &&
    Boolean(studyLaunchKey) &&
    consumedStudyLaunchRef.current !== studyLaunchKey;
  const canTrackWatched = Boolean(courseId && periodId && videoKey);
  const [isWatched, setIsWatched] = useState(() =>
    readVideoWatched(courseId, periodId, videoKey, isMainVideo)
  );

  useEffect(() => {
    if (shouldAutoOpenStudy) {
      consumedStudyLaunchRef.current = studyLaunchKey;
      inlinePlayerRef.current?.pause();
      setStudyEntry(null);
      setMode('study');
    }
  }, [shouldAutoOpenStudy, studyLaunchKey]);

  // null-entry — открытие пришло из deep-link'а (studyLaunch), а не вручную:
  // только тогда оверлей получает seek/panel/query из URL.
  const openedFromLaunch = studyEntry === null && isStudyLaunchTarget;

  const openStudyMode = () => {
    const snapshot = inlinePlayerRef.current?.getPlaybackSnapshot() ?? {
      currentTimeMs: null,
      paused: true,
    };
    inlinePlayerRef.current?.pause();
    setStudyEntry(snapshot);
    setMode('study');
  };

  const closeStudyMode = (snapshot?: StudyVideoPlaybackSnapshot) => {
    // Inline-плеер возвращается на позицию оверлея и остаётся на паузе:
    // авто-воспроизведение под страницей после выхода не нужно. Если видео
    // так и не запускали (0), не трогаем — seekTo+pause на cued-плеере
    // оставляет чёрный кадр вместо постера.
    if (snapshot && snapshot.currentTimeMs) {
      inlinePlayerRef.current?.seekToMs(snapshot.currentTimeMs);
      inlinePlayerRef.current?.pause();
    }
    setMode('embed');
  };

  useEffect(() => {
    if (mode === 'study') {
      trackFeatureEvent('study_mode_opened', { courseId, periodId });
    }
  }, [mode, courseId, periodId]);

  useEffect(() => {
    setIsWatched(readVideoWatched(courseId, periodId, videoKey, isMainVideo));
  }, [courseId, periodId, videoKey, isMainVideo]);

  const handlePlayedSpan = (span: StudyVideoPlayedSpan) => {
    if (!canTrackWatched) return;
    const lessonId = periodId as string;
    const stat = recordVideoPlayback(courseId, lessonId, videoKey as string, span);
    if (!stat.watched) return;
    setIsWatched(true);
    if (isMainVideo) {
      markLessonWatched(courseId, lessonId);
    }
  };

  const handleOpenedExternally = () => {
    if (!canTrackWatched) return;
    recordVideoOpenedExternally(courseId, periodId as string, videoKey as string);
  };

  const handlePlaybackProgress = (currentTimeMs: number) => {
    if (!courseId || !periodId || !youtubeVideoId) return;
    if (!Number.isFinite(currentTimeMs) || currentTimeMs < 1000) return;

    const lastSavedMs = lastSavedPlaybackMsRef.current;
    if (lastSavedMs !== null && Math.abs(currentTimeMs - lastSavedMs) < 5000) {
      return;
    }

    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (!path) return;

    saveCourseVideoResumePoint({
      courseId,
      path,
      videoId: youtubeVideoId,
      timeMs: currentTimeMs,
      lessonLabel: periodTitle,
      videoTitle: effectiveVideoTitle,
    });
    lastSavedPlaybackMsRef.current = currentTimeMs;
  };

  if (!embedUrl) {
    const isPlaylist = isUrlString(originalUrl) && originalUrl.includes('list=');
    return (
      <div className="space-y-3">
        <p className="text-lg leading-8 text-muted">
          {isPlaylist ? (
            <>
              Это плейлист YouTube — встраивание недоступно.{' '}
              <a className="text-accent no-underline hover:no-underline focus-visible:no-underline" href={originalUrl} target="_blank" rel="noreferrer" onClick={handleOpenedExternally}>
                Открыть плейлист на YouTube
              </a>
            </>
          ) : (
            <>
              Видео недоступно для встраивания.{' '}
              {isUrlString(originalUrl) ? (
                <a className="text-accent no-underline hover:no-underline focus-visible:no-underline" href={originalUrl} target="_blank" rel="noreferrer" onClick={handleOpenedExternally}>
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
        <div className="flex items-center gap-2">
          {canTrackWatched ? (
            <span
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold',
                isWatched
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 bg-slate-50 text-slate-400'
              )}
              title={isWatched ? 'Лекция просмотрена' : 'Лекция не отмечена как просмотренная'}
              aria-label={isWatched ? 'Лекция просмотрена' : 'Лекция не просмотрена'}
            >
              ✓
            </span>
          ) : null}
          {canUseStudyMode ? (
            <VideoModeButton
              label={mode === 'study' ? 'Скрыть конспект' : 'Открыть конспект'}
              isActive={mode === 'study'}
              onClick={() => (mode === 'study' ? closeStudyMode() : openStudyMode())}
              controlsId={`${effectiveVideoTitle}-study-panel`}
            />
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border shadow-brand">
          <StudyVideoPlayer
            ref={inlinePlayerRef}
            title={effectiveVideoTitle}
            embedUrl={embedUrl}
            onPlayedSpan={handlePlayedSpan}
            onOpenedExternally={handleOpenedExternally}
            onPlaybackProgressMs={handlePlaybackProgress}
          />
        </div>
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
          onSourceLinkClick={handleOpenedExternally}
        />
      </div>

      {canUseStudyMode && periodId ? (
        <VideoStudyOverlay
          draft={studyDraft}
          embedUrl={embedUrl}
          isOpen={mode === 'study'}
          onClose={closeStudyMode}
          onDraftChange={setStudyDraft}
          originalUrl={originalUrl}
          courseId={courseId}
          periodId={periodId}
          periodTitle={periodTitle}
          videoTitle={effectiveVideoTitle}
          initialPanel={openedFromLaunch ? studyLaunch?.initialPanel ?? 'notes' : 'notes'}
          initialQuery={openedFromLaunch ? studyLaunch?.initialQuery ?? null : null}
          initialSeekMs={
            openedFromLaunch
              ? studyLaunch?.initialSeekMs ?? null
              : studyEntry?.currentTimeMs ?? null
          }
          initialPaused={openedFromLaunch ? false : studyEntry?.paused ?? false}
          highlightedStartMs={openedFromLaunch ? studyLaunch?.initialSeekMs ?? null : null}
          concepts={concepts}
          onPlayedSpan={handlePlayedSpan}
          onOpenedExternally={handleOpenedExternally}
          onPlaybackProgressMs={handlePlaybackProgress}
        />
      ) : null}
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
