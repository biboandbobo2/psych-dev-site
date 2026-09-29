import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { parseYouTubeEmbedConfig, isYouTubePausedState } from '../utils/youtubePlayer';
import { isNaturalPlaybackStep } from '../../../lib/courseProgress/watchSpans';

interface YouTubePlayerApi {
  Player: new (
    element: HTMLElement,
    options: {
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
      };
      height?: string;
      playerVars?: Record<string, number | string>;
      videoId: string;
      width?: string;
    }
  ) => {
    destroy: () => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    getIframe?: () => HTMLIFrameElement;
    getPlayerState: () => number;
    pauseVideo: () => void;
    seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  };
}

type YouTubeWindow = Window & typeof globalThis & {
  YT?: YouTubePlayerApi;
  onYouTubeIframeAPIReady?: () => void;
};

let youtubeIframeApiPromise: Promise<YouTubePlayerApi> | null = null;

const YT_STATE_ENDED = 0;
const YT_STATE_PLAYING = 1;
const YT_STATE_BUFFERING = 3;
/** Проигранный отрезок отдаётся наружу не реже, чем раз в столько мс. */
const PLAYED_SPAN_EMIT_MS = 10_000;

// Замедленный (не заблокированный) YouTube в РФ грузит скрипт бесконечно:
// без таймаута промис никогда не отклонится и fallback не покажется.
const YOUTUBE_IFRAME_API_TIMEOUT_MS = 10_000;

function hasReadyPlayerMethods(
  player: InstanceType<YouTubePlayerApi['Player']> | null
): player is InstanceType<YouTubePlayerApi['Player']> {
  return Boolean(
    player &&
      typeof player.getCurrentTime === 'function' &&
      typeof player.getDuration === 'function' &&
      typeof player.getPlayerState === 'function' &&
      typeof player.pauseVideo === 'function' &&
      typeof player.seekTo === 'function'
  );
}

function loadYouTubeIframeApi() {
  const youtubeWindow = window as YouTubeWindow;

  if (youtubeWindow.YT?.Player) {
    return Promise.resolve(youtubeWindow.YT);
  }

  if (youtubeIframeApiPromise) {
    return youtubeIframeApiPromise;
  }

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      youtubeIframeApiPromise = null;
      reject(new Error('YouTube IFrame API load timed out'));
    }, YOUTUBE_IFRAME_API_TIMEOUT_MS);

    const resolveIfReady = () => {
      if (!youtubeWindow.YT?.Player) {
        return false;
      }

      window.clearTimeout(timeoutId);
      resolve(youtubeWindow.YT);
      return true;
    };

    const handleLoadError = () => {
      window.clearTimeout(timeoutId);
      youtubeIframeApiPromise = null;
      reject(new Error('Failed to load YouTube IFrame API'));
    };

    if (resolveIfReady()) {
      return;
    }

    const existingReady = youtubeWindow.onYouTubeIframeAPIReady;
    youtubeWindow.onYouTubeIframeAPIReady = () => {
      existingReady?.();
      resolveIfReady();
    };

    const existingScript = document.getElementById(
      'youtube-iframe-api'
    ) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('error', handleLoadError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'youtube-iframe-api';
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = handleLoadError;
    document.head.appendChild(script);
  });

  return youtubeIframeApiPromise;
}

export interface StudyVideoPlaybackSnapshot {
  currentTimeMs: number | null;
  paused: boolean;
}

export interface StudyVideoPlayedSpan {
  startSec: number;
  endSec: number;
  durationSec: number;
}

export interface StudyVideoPlayerHandle {
  getPlaybackSnapshot: () => StudyVideoPlaybackSnapshot;
  pause: () => void;
  seekToMs: (ms: number) => void;
}

interface StudyVideoPlayerProps {
  embedUrl: string;
  initialSeekMs?: number | null;
  /** seekTo у YouTube запускает воспроизведение; true — вернуть паузу после initial seek */
  initialPaused?: boolean;
  title: string;
  /** Реально проигранный отрезок (перемотка не засчитывается). */
  onPlayedSpan?: (span: StudyVideoPlayedSpan) => void;
  /** Студент ушёл смотреть видео на YouTube (ссылка или кнопка в плеере). */
  onOpenedExternally?: () => void;
  onPlaybackProgressMs?: (currentTimeMs: number) => void;
}

export const StudyVideoPlayer = forwardRef<StudyVideoPlayerHandle, StudyVideoPlayerProps>(
  function StudyVideoPlayer(
    {
      embedUrl,
      initialSeekMs = null,
      initialPaused = false,
      title,
      onPlayedSpan,
      onOpenedExternally,
      onPlaybackProgressMs,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [playerLoadFailed, setPlayerLoadFailed] = useState(false);
    const playerRef = useRef<InstanceType<YouTubePlayerApi['Player']> | null>(null);
    const pendingSeekMsRef = useRef<number | null>(null);
    const progressIntervalRef = useRef<number | null>(null);
    // Текущий непрерывный отрезок воспроизведения (секунды видео + время стены).
    const playTrackRef = useRef<{
      spanStart: number;
      lastSec: number;
      lastWallMs: number;
      lastEmitWallMs: number;
    } | null>(null);
    const startedRef = useRef(false);
    const onPlayedSpanRef = useRef(onPlayedSpan);
    const onOpenedExternallyRef = useRef(onOpenedExternally);
    const onPlaybackProgressMsRef = useRef(onPlaybackProgressMs);
    const initialPausedRef = useRef(initialPaused);
    const initialSeekMsRef = useRef(initialSeekMs);
    const playerConfig = useMemo(() => parseYouTubeEmbedConfig(embedUrl), [embedUrl]);

    onPlayedSpanRef.current = onPlayedSpan;
    onOpenedExternallyRef.current = onOpenedExternally;
    onPlaybackProgressMsRef.current = onPlaybackProgressMs;
    initialPausedRef.current = initialPaused;
    initialSeekMsRef.current = initialSeekMs;

    const clearProgressInterval = () => {
      if (progressIntervalRef.current === null) return;
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    };

    const emitPlaybackProgress = () => {
      if (!onPlaybackProgressMsRef.current) return;
      if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;
      const currentTimeMs = Math.max(0, Math.floor(playerRef.current.getCurrentTime() * 1000));
      onPlaybackProgressMsRef.current(currentTimeMs);
    };

    useImperativeHandle(
      ref,
      () => ({
        getPlaybackSnapshot: () => {
          if (!hasReadyPlayerMethods(playerRef.current)) {
            return {
              currentTimeMs: null,
              paused: true,
            };
          }

          return {
            currentTimeMs: Math.max(0, Math.floor(playerRef.current.getCurrentTime() * 1000)),
            paused: isYouTubePausedState(playerRef.current.getPlayerState()),
          };
        },
        pause: () => {
          if (hasReadyPlayerMethods(playerRef.current)) {
            playerRef.current.pauseVideo();
          }
        },
        seekToMs: (ms: number) => {
          if (!hasReadyPlayerMethods(playerRef.current)) {
            pendingSeekMsRef.current = ms;
            return;
          }

          pendingSeekMsRef.current = null;
          playerRef.current.seekTo(Math.max(0, ms / 1000), true);
        },
      }),
      []
    );

    useEffect(() => {
      // На паузе позиция задаётся через playerVars.start при создании плеера:
      // seekTo у cued-видео запускает воспроизведение, а мгновенный pauseVideo
      // оставляет чёрный кадр без постера и контролов.
      if (initialSeekMs === null || initialPausedRef.current) {
        return;
      }

      pendingSeekMsRef.current = initialSeekMs;
      if (hasReadyPlayerMethods(playerRef.current)) {
        playerRef.current.seekTo(Math.max(0, initialSeekMs / 1000), true);
        pendingSeekMsRef.current = null;
      }
    }, [initialSeekMs]);

    useEffect(() => {
      playTrackRef.current = null;
      startedRef.current = false;
      setPlayerLoadFailed(false);
      clearProgressInterval();
    }, [embedUrl]);

    // «Смотреть на YouTube» и название ролика внутри плеера живут в чужом
    // iframe — клик по ним не виден. Косвенный признак: фокус в нашем iframe,
    // видео так и не запускалось, а страница скрылась (открылась вкладка
    // YouTube). Клик по YouTube посреди просмотра видео не останавливает, и он
    // неотличим от «слушаю в фоне» — такой переход не засчитывается.
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.visibilityState !== 'hidden' || startedRef.current) return;
        const iframe = playerRef.current?.getIframe?.();
        if (iframe && document.activeElement === iframe) {
          onOpenedExternallyRef.current?.();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => {
      if (!containerRef.current || !playerConfig) {
        return undefined;
      }

      let destroyed = false;

      const emitPlayedSpan = (startSec: number, endSec: number, durationSec: number) => {
        if (endSec - startSec < 1) return;
        onPlayedSpanRef.current?.({ startSec, endSec, durationSec });
      };

      /**
       * Шаг учёта просмотра: продлевает текущий отрезок, если позиция ушла вперёд
       * как при обычном воспроизведении, иначе (перемотка) закрывает его и
       * начинает новый. `final` — воспроизведение остановилось.
       */
      const trackPlayback = (final: boolean) => {
        const player = playerRef.current;
        if (!hasReadyPlayerMethods(player)) return;
        const current = player.getCurrentTime();
        const duration = player.getDuration();
        const now = Date.now();
        const track = playTrackRef.current;

        if (!track) {
          if (!final) {
            playTrackRef.current = {
              spanStart: current,
              lastSec: current,
              lastWallMs: now,
              lastEmitWallMs: now,
            };
          }
          return;
        }

        if (isNaturalPlaybackStep(current - track.lastSec, (now - track.lastWallMs) / 1000)) {
          track.lastSec = current;
        } else {
          emitPlayedSpan(track.spanStart, track.lastSec, duration);
          track.spanStart = current;
          track.lastSec = current;
          track.lastEmitWallMs = now;
        }
        track.lastWallMs = now;

        if (final || now - track.lastEmitWallMs >= PLAYED_SPAN_EMIT_MS) {
          emitPlayedSpan(track.spanStart, track.lastSec, duration);
          track.spanStart = track.lastSec;
          track.lastEmitWallMs = now;
        }
        if (final) {
          playTrackRef.current = null;
        }
      };


      const handlePlayingTick = () => {
        if (!hasReadyPlayerMethods(playerRef.current)) return;
        emitPlaybackProgress();
        trackPlayback(false);
      };

      void loadYouTubeIframeApi()
        .then((youtubeApi) => {
          if (!containerRef.current || destroyed) {
            return;
          }

          const cuedStartSeconds =
            initialPausedRef.current && initialSeekMsRef.current
              ? Math.floor(initialSeekMsRef.current / 1000)
              : 0;
          playerRef.current = new youtubeApi.Player(containerRef.current, {
            width: '100%',
            height: '100%',
            videoId: playerConfig.videoId,
            playerVars:
              cuedStartSeconds > 0
                ? { ...playerConfig.playerVars, start: cuedStartSeconds }
                : playerConfig.playerVars,
            events: {
              onReady: () => {
                // Отложенный seek здесь — только явный (deep-link или клик по
                // таймкоду до готовности), он и должен запустить воспроизведение.
                if (
                  pendingSeekMsRef.current !== null &&
                  hasReadyPlayerMethods(playerRef.current)
                ) {
                  const pendingSeekMs = pendingSeekMsRef.current;
                  pendingSeekMsRef.current = null;
                  playerRef.current.seekTo(Math.max(0, pendingSeekMs / 1000), true);
                }

                emitPlaybackProgress();
              },
              onStateChange: ({ data }) => {
                if (data === YT_STATE_PLAYING || data === YT_STATE_BUFFERING) {
                  startedRef.current = true;
                }

                if (data === YT_STATE_ENDED) {
                  emitPlaybackProgress();
                  trackPlayback(true);
                  clearProgressInterval();
                  return;
                }

                if (data === YT_STATE_PLAYING) {
                  clearProgressInterval();
                  handlePlayingTick();
                  progressIntervalRef.current = window.setInterval(() => {
                    handlePlayingTick();
                  }, 1000);
                  return;
                }

                emitPlaybackProgress();
                trackPlayback(true);
                clearProgressInterval();
              },
            },
          });
        })
        .catch(() => {
          playerRef.current = null;
          if (!destroyed) {
            setPlayerLoadFailed(true);
          }
        });

      return () => {
        destroyed = true;
        emitPlaybackProgress();
        trackPlayback(true);
        clearProgressInterval();
        playerRef.current?.destroy();
        playerRef.current = null;
      };
    }, [playerConfig]);

    if (playerLoadFailed && playerConfig) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-card2 px-6 text-center">
          <p className="text-sm leading-6 text-muted">
            Не удалось загрузить плеер: YouTube не отвечает. Если вы в России,
            YouTube может быть замедлен провайдером — включите VPN и обновите
            страницу.
          </p>
          <a
            className="text-sm font-semibold text-accent no-underline hover:no-underline focus-visible:no-underline"
            href={`https://www.youtube.com/watch?v=${playerConfig.videoId}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => onOpenedExternallyRef.current?.()}
          >
            Открыть видео на YouTube
          </a>
        </div>
      );
    }

    if (!playerConfig) {
      return (
        <iframe
          title={title}
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full"
        />
      );
    }

    return <div ref={containerRef} className="h-full w-full" aria-label={title} />;
  }
);
