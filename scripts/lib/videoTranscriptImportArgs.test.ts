import { describe, expect, it } from 'vitest';
import { parseTranscriptImportArgs } from './videoTranscriptImportArgs';

describe('parseTranscriptImportArgs', () => {
  it('парсит флаги и значения', () => {
    expect(
      parseTranscriptImportArgs([
        '--dry-run',
        '--force',
        '--langs=ru,en,de',
        '--limit=15',
        '--video=https://youtu.be/dQw4w9WgXcQ',
      ])
    ).toEqual({
      dryRun: true,
      force: true,
      langs: ['ru', 'en', 'de'],
      limit: 15,
      video: 'https://youtu.be/dQw4w9WgXcQ',
    });
  });

  it('возвращает дефолты при пустом argv', () => {
    expect(parseTranscriptImportArgs([])).toEqual({
      dryRun: false,
      force: false,
      langs: ['ru', 'en'],
      limit: null,
      video: null,
    });
  });
});
