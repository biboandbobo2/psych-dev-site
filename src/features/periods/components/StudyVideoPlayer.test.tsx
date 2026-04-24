import { createRef } from 'react';
import { render, waitFor } from '@testing-library/react';
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
});
