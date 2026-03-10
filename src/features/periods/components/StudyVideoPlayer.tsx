import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { parseYouTubeEmbedConfig, isYouTubePausedState } from '../utils/youtubePlayer';

interface YouTubePlayerApi {
  Player: new (
    element: HTMLElement,
    options: {
      events?: {
        onReady?: () => void;
      };
      height?: string;
      playerVars?: Record<string, number | string>;
      videoId: string;
      width?: string;
    }
  ) => {
    destroy: () => void;
    getCurrentTime: () => number;
    getPlayerState: () => number;
    seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  };
}

type YouTubeWindow = Window & typeof globalThis & {
  YT?: YouTubePlayerApi;
  onYouTubeIframeAPIReady?: () => void;
};

let youtubeIframeApiPromise: Promise<YouTubePlayerApi> | null = null;

function hasReadyPlayerMethods(
  player: InstanceType<YouTubePlayerApi['Player']> | null
): player is InstanceType<YouTubePlayerApi['Player']> {
  return Boolean(
    player &&
      typeof player.getCurrentTime === 'function' &&
      typeof player.getPlayerState === 'function' &&
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
    const resolveIfReady = () => {
      if (!youtubeWindow.YT?.Player) {
        return false;
      }

      resolve(youtubeWindow.YT);
      return true;
    };

    const handleLoadError = () => {
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

export interface StudyVideoPlayerHandle {
  getPlaybackSnapshot: () => StudyVideoPlaybackSnapshot;
  seekToMs: (ms: number) => void;
}

interface StudyVideoPlayerProps {
  embedUrl: string;
  initialSeekMs?: number | null;
  title: string;
}

export const StudyVideoPlayer = forwardRef<StudyVideoPlayerHandle, StudyVideoPlayerProps>(
  function StudyVideoPlayer({ embedUrl, initialSeekMs = null, title }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<InstanceType<YouTubePlayerApi['Player']> | null>(null);
    const pendingSeekMsRef = useRef<number | null>(null);
    const playerConfig = useMemo(() => parseYouTubeEmbedConfig(embedUrl), [embedUrl]);

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
      if (initialSeekMs === null) {
        return;
      }

      pendingSeekMsRef.current = initialSeekMs;
      if (hasReadyPlayerMethods(playerRef.current)) {
        playerRef.current.seekTo(Math.max(0, initialSeekMs / 1000), true);
        pendingSeekMsRef.current = null;
      }
    }, [initialSeekMs]);

    useEffect(() => {
      if (!containerRef.current || !playerConfig) {
        return undefined;
      }

      let destroyed = false;

      void loadYouTubeIframeApi()
        .then((youtubeApi) => {
          if (!containerRef.current || destroyed) {
            return;
          }

          playerRef.current = new youtubeApi.Player(containerRef.current, {
            width: '100%',
            height: '100%',
            videoId: playerConfig.videoId,
            playerVars: playerConfig.playerVars,
            events: {
              onReady: () => {
                if (
                  pendingSeekMsRef.current === null ||
                  !hasReadyPlayerMethods(playerRef.current)
                ) {
                  return;
                }

                const pendingSeekMs = pendingSeekMsRef.current;
                pendingSeekMsRef.current = null;
                playerRef.current.seekTo(Math.max(0, pendingSeekMs / 1000), true);
              },
            },
          });
        })
        .catch(() => {
          playerRef.current = null;
        });

      return () => {
        destroyed = true;
        playerRef.current?.destroy();
        playerRef.current = null;
      };
    }, [playerConfig]);

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
