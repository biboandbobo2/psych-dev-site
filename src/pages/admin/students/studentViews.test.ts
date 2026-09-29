import { describe, expect, it } from 'vitest';
import { buildStudentViews, lessonSquareTitle, studentViewsSummary } from './studentViews';

const LESSONS = [
  { id: 'intro', title: 'Введение', videoKeys: ['a', 'a2', 'a3'] },
  { id: 'infancy', title: 'Младенчество', videoKeys: ['b'] },
  { id: 'seminar', title: 'Семинар', videoKeys: [] },
];

describe('buildStudentViews', () => {
  it('квадратики: главная лекция, доп. видео и занятие без видео', () => {
    const views = buildStudentViews(LESSONS, {
      watchedLessonIds: new Set(),
      videoStats: {
        intro: { a: { watched: true }, a2: { openedExternally: true }, a3: { watched: true } },
        infancy: { b: { openedExternally: true, spans: [0, 10] } },
      },
    });

    expect(views.squares.map(({ main, extraSeen, hasVideo }) => ({ main, extraSeen, hasVideo })))
      .toEqual([
        { main: 'watched', extraSeen: 2, hasVideo: true },
        { main: 'opened', extraSeen: 0, hasVideo: true },
        { main: 'none', extraSeen: 0, hasVideo: false },
      ]);
    expect(views).toMatchObject({ mainWatched: 1, mainOpened: 1, videosWatched: 2, videosTotal: 4 });
    expect(studentViewsSummary(views)).toBe('Лекции 1/3 · YouTube 1 · Все видео 2/4 (50%)');
  });

  it('старая отметка занятия = просмотр главной лекции', () => {
    const views = buildStudentViews(LESSONS, {
      watchedLessonIds: new Set(['infancy']),
      videoStats: {},
    });
    expect(views.squares[1].main).toBe('watched');
    expect(views.videosWatched).toBe(1);
  });

  it('мусор в videoStats и отсутствие прогресса не ломают расчёт', () => {
    const broken = buildStudentViews(LESSONS, {
      watchedLessonIds: new Set(),
      videoStats: { intro: 'bad', infancy: { b: null } } as never,
    });
    expect(broken.mainWatched).toBe(0);
    expect(buildStudentViews(LESSONS, undefined).squares).toHaveLength(3);
  });
});

describe('lessonSquareTitle', () => {
  it('подсказка с номером, названием и доп. видео', () => {
    const [intro, , seminar] = buildStudentViews(LESSONS, undefined).squares;
    expect(lessonSquareTitle(intro, 0)).toBe(
      '1. Введение — главная лекция не просмотрена; доп. видео: 0 из 2'
    );
    expect(lessonSquareTitle(seminar, 2)).toBe('3. Семинар — в занятии нет видео');
  });
});
