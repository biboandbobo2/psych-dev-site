import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudyVideoPlayer, type StudyVideoPlayerHandle } from './StudyVideoPlayer';

describe('StudyVideoPlayer', () => {
  afterEach(() => {
    document.getElementById('youtube-iframe-api')?.remove();
    delete (window as typeof window & { YT?: unknown }).YT;
    delete (window as typeof window & { onYouTubeIframeAPIReady?: unknown })
      .onYouTubeIframeAPIReady;
  });

  it('инициализирует плеер, если iframe api script уже есть в документе', async () => {
    const existingScript = document.createElement('script');
    existingScript.id = 'youtube-iframe-api';
    document.head.appendChild(existingScript);

    const playerMock = vi.fn(function Player() {
      return {
        destroy: vi.fn(),
        getCurrentTime: vi.fn(() => 0),
        getDuration: vi.fn(() => 120),
        getPlayerState: vi.fn(() => 2),
        pauseVideo: vi.fn(),
        seekTo: vi.fn(),
      };
    });

    render(
      <StudyVideoPlayer
        embedUrl="https://www.youtube.com/embed/video-1?si=test"
        title="Тестовое видео"
      />
    );

    (window as typeof window & { YT?: unknown }).YT = {
      Player: playerMock,
    };
    (window as typeof window & { onYouTubeIframeAPIReady?: (() => void) | undefined })
      .onYouTubeIframeAPIReady?.();

    await waitFor(() => {
      expect(playerMock).toHaveBeenCalledTimes(1);
    });
  });

  it('сохраняет seek до готовности youtube player', async () => {
    const seekToMock = vi.fn();
    const playerMock = vi.fn(function Player(
      _element: HTMLElement,
      options: { events?: { onReady?: () => void } }
    ) {
      queueMicrotask(() => options.events?.onReady?.());
      return {
        destroy: vi.fn(),
        getCurrentTime: vi.fn(() => 0),
        getDuration: vi.fn(() => 120),
        getPlayerState: vi.fn(() => 2),
        pauseVideo: vi.fn(),
        seekTo: seekToMock,
      };
    });

    (window as typeof window & { YT?: unknown }).YT = {
      Player: playerMock,
    };

    render(
      <StudyVideoPlayer
        embedUrl="https://www.youtube.com/embed/video-1?si=test"
        initialSeekMs={65_000}
        title="Тестовое видео"
      />
    );

    await waitFor(() => {
      expect(seekToMock).toHaveBeenCalledWith(65, true);
    });
  });

  it('initialPaused: после initial seek ставит видео на паузу (seekTo у YouTube запускает воспроизведение)', async () => {
    const seekToMock = vi.fn();
    const pauseVideoMock = vi.fn();
    const playerMock = vi.fn(function Player(
      _element: HTMLElement,
      options: { events?: { onReady?: () => void } }
    ) {
      queueMicrotask(() => options.events?.onReady?.());
      return {
        destroy: vi.fn(),
        getCurrentTime: vi.fn(() => 0),
        getDuration: vi.fn(() => 120),
        getPlayerState: vi.fn(() => 2),
        pauseVideo: pauseVideoMock,
        seekTo: seekToMock,
      };
    });

    (window as typeof window & { YT?: unknown }).YT = {
      Player: playerMock,
    };

    render(
      <StudyVideoPlayer
        embedUrl="https://www.youtube.com/embed/video-1?si=test"
        initialSeekMs={65_000}
        initialPaused
        title="Тестовое видео"
      />
    );

    await waitFor(() => {
      expect(seekToMock).toHaveBeenCalledWith(65, true);
      expect(pauseVideoMock).toHaveBeenCalledTimes(1);
    });
  });

  it('pause() из handle ставит видео на паузу', async () => {
    const pauseVideoMock = vi.fn();
    const playerMock = vi.fn(function Player(
      _element: HTMLElement,
      options: { events?: { onReady?: () => void } }
    ) {
      queueMicrotask(() => options.events?.onReady?.());
      return {
        destroy: vi.fn(),
        getCurrentTime: vi.fn(() => 42),
        getDuration: vi.fn(() => 120),
        getPlayerState: vi.fn(() => 1),
        pauseVideo: pauseVideoMock,
        seekTo: vi.fn(),
      };
    });

    (window as typeof window & { YT?: unknown }).YT = {
      Player: playerMock,
    };

    const ref = createRef<StudyVideoPlayerHandle>();

    render(
      <StudyVideoPlayer
        ref={ref}
        embedUrl="https://www.youtube.com/embed/video-1?si=test"
        title="Тестовое видео"
      />
    );

    await waitFor(() => {
      expect(playerMock).toHaveBeenCalledTimes(1);
    });

    ref.current?.pause();
    expect(pauseVideoMock).toHaveBeenCalledTimes(1);
  });

  it('безопасно отдаёт playback snapshot, если player ещё не предоставляет youtube методы', async () => {
    const playerMock = vi.fn(function Player(
      _element: HTMLElement,
      options: { events?: { onReady?: () => void } }
    ) {
      queueMicrotask(() => options.events?.onReady?.());
      return {
        destroy: vi.fn(),
      };
    });

    (window as typeof window & { YT?: unknown }).YT = {
      Player: playerMock,
    };

    const ref = createRef<StudyVideoPlayerHandle>();

    render(
      <StudyVideoPlayer
        ref={ref}
        embedUrl="https://www.youtube.com/embed/video-1?si=test"
        title="Тестовое видео"
      />
    );

    await waitFor(() => {
      expect(playerMock).toHaveBeenCalledTimes(1);
    });

    expect(ref.current?.getPlaybackSnapshot()).toEqual({
      currentTimeMs: null,
      paused: true,
    });
  });

  it('показывает сообщение о недоступном YouTube, если iframe api не загрузился', async () => {
    // Свежий модуль: кэш промиса загрузки api живёт на уровне модуля
    // и после предыдущих тестов уже resolved.
    vi.resetModules();
    const { StudyVideoPlayer: FreshStudyVideoPlayer } = await import('./StudyVideoPlayer');

    render(
      <FreshStudyVideoPlayer
        embedUrl="https://www.youtube.com/embed/video-1?si=test"
        title="Тестовое видео"
      />
    );

    const script = document.getElementById('youtube-iframe-api');
    expect(script).not.toBeNull();
    script?.dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(screen.getByText(/YouTube не отвечает/)).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: 'Открыть видео на YouTube' });
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=video-1');
  });
});
