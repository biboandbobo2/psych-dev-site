import { describe, expect, it } from 'vitest';
import type { Period } from '../types/content';
import { isCourseOpen } from './courseOpenness';

function makeLesson(overrides: Partial<Period> = {}): Period {
  return {
    period: 'stub',
    title: 'Stub',
    subtitle: '',
    concepts: [],
    authors: [],
    core_literature: [],
    extra_literature: [],
    extra_videos: [],
    accent: '',
    accent100: '',
    published: true,
    ...overrides,
  } as Period;
}

describe('isCourseOpen', () => {
  it('returns false when there are no lessons', () => {
    expect(isCourseOpen([])).toBe(false);
  });

  it('returns false when lesson has no videos', () => {
    expect(isCourseOpen([makeLesson({ video_playlist: [] })])).toBe(false);
    expect(isCourseOpen([makeLesson({ video_playlist: undefined })])).toBe(false);
  });

  it('returns false when at least one video is not public', () => {
    expect(
      isCourseOpen([
        makeLesson({
          video_playlist: [
            { url: 'a', isPublic: true },
            { url: 'b', isPublic: false },
          ],
        }),
      ])
    ).toBe(false);
  });

  it('returns false when isPublic flag is missing on a video', () => {
    expect(
      isCourseOpen([
        makeLesson({ video_playlist: [{ url: 'a', isPublic: true }, { url: 'b' }] }),
      ])
    ).toBe(false);
  });

  it('returns true when every video in every published lesson is public', () => {
    expect(
      isCourseOpen([
        makeLesson({ video_playlist: [{ url: 'a', isPublic: true }] }),
        makeLesson({
          video_playlist: [
            { url: 'b', isPublic: true },
            { url: 'c', isPublic: true },
          ],
        }),
      ])
    ).toBe(true);
  });

  it('ignores unpublished lessons when evaluating openness', () => {
    expect(
      isCourseOpen([
        makeLesson({ video_playlist: [{ url: 'a', isPublic: true }] }),
        makeLesson({ published: false, video_playlist: [{ url: 'b', isPublic: false }] }),
      ])
    ).toBe(true);
  });

  it('returns false when all lessons are unpublished', () => {
    expect(
      isCourseOpen([
        makeLesson({ published: false, video_playlist: [{ url: 'a', isPublic: true }] }),
      ])
    ).toBe(false);
  });

  it('returns false when a lesson with public videos coexists with a lesson without videos', () => {
    expect(
      isCourseOpen([
        makeLesson({ video_playlist: [{ url: 'a', isPublic: true }] }),
        makeLesson({ video_playlist: [] }),
      ])
    ).toBe(false);
  });

  it('reads videos from sections.video_section.content (modern lesson schema)', () => {
    expect(
      isCourseOpen([
        makeLesson({
          sections: {
            video_section: {
              title: 'Видео',
              content: [{ url: 'a', isPublic: true }],
            },
          },
        }),
      ])
    ).toBe(true);
  });

  it('returns false when section video has no isPublic flag', () => {
    expect(
      isCourseOpen([
        makeLesson({
          sections: {
            video_section: {
              title: 'Видео',
              content: [{ url: 'a' }],
            },
          },
        }),
      ])
    ).toBe(false);
  });

  it('combines videos from both schemas — all must be public', () => {
    expect(
      isCourseOpen([
        makeLesson({
          video_playlist: [{ url: 'a', isPublic: true }],
          sections: {
            video_section: {
              title: 'Видео',
              content: [{ url: 'b', isPublic: false }],
            },
          },
        }),
      ])
    ).toBe(false);
  });
});
