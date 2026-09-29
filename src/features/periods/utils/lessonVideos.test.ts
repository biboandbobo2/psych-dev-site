import { describe, expect, it } from 'vitest';
import {
  collectLessonDocVideoKeys,
  collectLessonVideoKeys,
  getLessonVideoKey,
} from './lessonVideos';

const YT_A = 'https://www.youtube.com/watch?v=aaaaaaaaaaa';
const YT_B = 'https://youtu.be/bbbbbbbbbbb';
const YT_C = 'https://www.youtube.com/watch?v=ccccccccccc';

describe('getLessonVideoKey', () => {
  it('id YouTube из ссылки и из объекта с url', () => {
    expect(getLessonVideoKey(YT_A)).toBe('aaaaaaaaaaa');
    expect(getLessonVideoKey({ url: YT_B, title: 'Лекция' })).toBe('bbbbbbbbbbb');
  });

  it('не-YouTube ссылка — стабильный хэш без точек и слешей', () => {
    const key = getLessonVideoKey('https://vk.com/video-1_2');
    expect(key).toMatch(/^url-[0-9a-z]+$/);
    expect(getLessonVideoKey('https://vk.com/video-1_2')).toBe(key);
  });

  it('пустая запись — без ключа', () => {
    expect(getLessonVideoKey('')).toBeNull();
    expect(getLessonVideoKey(null)).toBeNull();
  });
});

describe('collectLessonVideoKeys', () => {
  it('главная лекция — первое видео основной секции; доп. видео не считаются', () => {
    const keys = collectLessonVideoKeys({
      extra_videos: { title: 'Дополнительные видео и лекции', content: [YT_C] },
      video: { title: 'Видео-лекция', content: [YT_A, { url: YT_B }] },
    });
    expect(keys).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
  });

  it('секции в порядке показа: video раньше video_section, повторы схлопываются', () => {
    const keys = collectLessonVideoKeys({
      video_section: { title: 'Видео', content: [YT_B, YT_A] },
      video: { title: 'Видео-лекция', content: [YT_A] },
    });
    expect(keys).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
  });

  it('без секций — пусто', () => {
    expect(collectLessonVideoKeys(undefined)).toEqual([]);
  });
});

describe('collectLessonDocVideoKeys', () => {
  it('документ с секциями', () => {
    expect(
      collectLessonDocVideoKeys({
        sections: { video: { title: 'Видео-лекция', content: [YT_A] } },
      } as never)
    ).toEqual(['aaaaaaaaaaa']);
  });

  it('старый документ: video_playlist, иначе video_url', () => {
    expect(collectLessonDocVideoKeys({ video_playlist: [{ url: YT_B }] } as never)).toEqual([
      'bbbbbbbbbbb',
    ]);
    expect(collectLessonDocVideoKeys({ video_url: YT_C } as never)).toEqual(['ccccccccccc']);
  });
});
