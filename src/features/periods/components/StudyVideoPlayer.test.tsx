import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudyVideoPlayer } from './StudyVideoPlayer';

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
});
