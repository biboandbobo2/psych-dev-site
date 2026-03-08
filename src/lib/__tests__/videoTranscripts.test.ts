import { describe, expect, it } from 'vitest';
import {
  buildTranscriptFullText,
  buildTranscriptPreview,
  buildVideoTranscriptStoragePath,
  getTranscriptDurationMs,
  getYouTubeVideoId,
} from '../videoTranscripts';

describe('videoTranscripts helpers', () => {
  it('извлекает youtube video id из разных форматов ссылок', () => {
    expect(getYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeVideoId('https://example.com/video')).toBeNull();
  });

  it('строит storage path и агрегирует transcript metadata', () => {
    const segments = [
      { index: 0, startMs: 0, endMs: 1400, durationMs: 1400, text: 'Первая строка' },
      { index: 1, startMs: 1400, endMs: 3200, durationMs: 1800, text: '  вторая строка ' },
    ];

    expect(buildVideoTranscriptStoragePath('dQw4w9WgXcQ')).toBe(
      'video-transcripts/dQw4w9WgXcQ/transcript.v1.json'
    );
    expect(buildTranscriptFullText(segments)).toBe('Первая строка вторая строка');
    expect(getTranscriptDurationMs(segments)).toBe(3200);
    expect(buildTranscriptPreview('a'.repeat(20), 10)).toBe('aaaaaaaaa…');
  });
});
