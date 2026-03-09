import { describe, expect, it } from 'vitest';
import { isYouTubePausedState, parseYouTubeEmbedConfig } from './youtubePlayer';

describe('parseYouTubeEmbedConfig', () => {
  it('парсит videoId и start из youtube embed url', () => {
    expect(
      parseYouTubeEmbedConfig('https://www.youtube.com/embed/dQw4w9WgXcQ?start=65&rel=0')
    ).toEqual({
      videoId: 'dQw4w9WgXcQ',
      playerVars: {
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        start: 65,
      },
    });
  });

  it('возвращает null для не-embed url', () => {
    expect(parseYouTubeEmbedConfig('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
});

describe('isYouTubePausedState', () => {
  it('считает playing только состояние 1', () => {
    expect(isYouTubePausedState(1)).toBe(false);
    expect(isYouTubePausedState(2)).toBe(true);
    expect(isYouTubePausedState(0)).toBe(true);
  });
});
