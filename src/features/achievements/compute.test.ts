import { describe, expect, it } from 'vitest';
import {
  computeAchievements,
  hasLongBreak,
  longestWeekStreak,
  resolveAchievementSet,
  type AchievementInput,
} from './compute';

const base: AchievementInput = {
  set: 'P',
  accessibleCourseIds: [],
  courses: [],
  watchedVideos: 0,
  tests: [],
  notes: [],
  questionDates: [],
  foundNotFound: false,
};

const at = (iso: string) => new Date(iso);
const byId = (result: ReturnType<typeof computeAchievements>, id: string) =>
  result.items.find((i) => i.def.id === id);

describe('computeAchievements', () => {
  it('новичок без активности: ничего не получено, XP 0, уровень 1', () => {
    const r = computeAchievements(base);
    expect(r.gotCount).toBe(0);
    expect(r.xp).toBe(0);
    expect(r.level).toBe(1);
    expect(r.latest).toBeNull();
  });

  it('занятия и курс: 3 занятия, курс пройден, прогресс к 10 занятиям', () => {
    const r = computeAchievements({
      ...base,
      accessibleCourseIds: ['general', 'development'],
      courses: [
        { id: 'general', totalLessons: 3, doneLessons: 3 },
        { id: 'development', totalLessons: 16, doneLessons: 2 },
      ],
    });
    expect(byId(r, 'first-lecture')?.status).toBe('got');
    expect(byId(r, 'lessons-3')?.status).toBe('got');
    expect(byId(r, 'lessons-10')?.progress).toEqual({ done: 5, total: 10, unit: ' зан.' });
    expect(byId(r, 'course-general')?.status).toBe('got');
    expect(byId(r, 'course-development')?.progress).toEqual({ done: 2, total: 16, unit: ' зан.' });
    expect(r.xp).toBe(5 * 20 + 200);
  });

  it('курсовая наклейка видна только при доступе к курсу; 2-й поток даёт ту же наклейку', () => {
    const r = computeAchievements({
      ...base,
      accessibleCourseIds: ['osnovy-patopsihologii-2y-potok'],
      courses: [{ id: 'osnovy-patopsihologii-2y-potok', totalLessons: 1, doneLessons: 1 }],
    });
    expect(byId(r, 'course-pathopsychology')?.status).toBe('got');
    expect(byId(r, 'course-general')).toBeUndefined();
  });

  it('набор «Старт» не видит программные и тестовые наклейки', () => {
    const r = computeAchievements({ ...base, set: 'S' });
    expect(byId(r, 'three-courses')).toBeUndefined();
    expect(byId(r, 'first-test')).toBeUndefined();
    expect(byId(r, 'first-note')).toBeDefined();
  });

  it('тесты: порог, 100%, улучшение при повторе, цепочка уровней', () => {
    const r = computeAchievements({
      ...base,
      tests: [
        { testId: 'a', requiredPercentage: 70, attempts: [{ percentage: 50, at: at('2026-09-01T10:00:00') }, { percentage: 100, at: at('2026-09-02T10:00:00') }] },
        { testId: 'b', requiredPercentage: 70, prerequisiteTestId: 'a', attempts: [{ percentage: 80, at: at('2026-09-03T10:00:00') }] },
        { testId: 'c', requiredPercentage: 70, prerequisiteTestId: 'b', attempts: [] },
      ],
    });
    expect(byId(r, 'first-test')?.status).toBe('got');
    expect(byId(r, 'first-test')?.earnedAt).toEqual(at('2026-09-02T10:00:00'));
    expect(byId(r, 'bullseye')?.status).toBe('got');
    expect(byId(r, 'mistakes-work')?.status).toBe('got');
    expect(byId(r, 'deep-dive')?.status).toBe('locked');
    expect(byId(r, 'deep-dive')?.progress).toEqual({ done: 2, total: 3, unit: ' ур.' });
    expect(r.xp).toBe(2 * 20 + 10);
  });

  it('конспекты: к разным занятиям, «Щедрость» за открытый конспект', () => {
    const r = computeAchievements({
      ...base,
      notes: [
        { lessonKey: 'general::1', isLecture: true, shared: true, at: at('2026-09-01T12:00:00') },
        { lessonKey: 'general::1', isLecture: false, shared: false, at: at('2026-09-02T12:00:00') },
        { lessonKey: 'general::2', isLecture: false, shared: false, at: null },
      ],
    });
    expect(byId(r, 'first-note')?.status).toBe('got');
    expect(byId(r, 'notes-5')?.progress).toEqual({ done: 2, total: 5, unit: ' зан.' });
    expect(byId(r, 'generosity')?.status).toBe('got');
  });

  it('регулярность и секретные: ночь, утро, сова и жаворонок, возвращение', () => {
    const r = computeAchievements({
      ...base,
      questionDates: [at('2026-06-01T02:00:00'), at('2026-09-01T06:30:00')],
      foundNotFound: true,
    });
    expect(byId(r, 'night-shift')?.status).toBe('got');
    expect(byId(r, 'early-bird')?.status).toBe('got');
    expect(byId(r, 'owl-lark')?.status).toBe('got');
    expect(byId(r, 'welcome-back')?.status).toBe('got');
    expect(byId(r, 'not-here')?.status).toBe('got');
    expect(byId(r, 'first-question')?.status).toBe('got');
  });

  it('программа: «Экватор» и «С трёх сторон» по курсам переподготовки', () => {
    const r = computeAchievements({
      ...base,
      accessibleCourseIds: ['general', 'development', 'clinical'],
      courses: [
        { id: 'general', totalLessons: 10, doneLessons: 10 },
        { id: 'development', totalLessons: 10, doneLessons: 10 },
        { id: 'clinical', totalLessons: 10, doneLessons: 0 },
      ],
    });
    expect(byId(r, 'equator')?.status).toBe('got');
    expect(byId(r, 'three-courses')?.progress).toEqual({ done: 2, total: 3, unit: ' курс.' });
    expect(byId(r, 'seen-all')?.progress).toEqual({ done: 2, total: 3, unit: ' курс.' });
  });

  it('«скоро» у наклеек без данных; «Ближе всего» — по доле прогресса', () => {
    const r = computeAchievements({
      ...base,
      accessibleCourseIds: ['general'],
      courses: [{ id: 'general', totalLessons: 15, doneLessons: 2 }],
    });
    expect(byId(r, 'understand')?.status).toBe('soon');
    expect(r.nearest[0]?.def.id).toBe('lessons-3');
  });
});

describe('resolveAchievementSet', () => {
  const open = new Set(['gruppovaya-psihoterapiya']);
  it('поток с курсами программы → P', () => {
    expect(resolveAchievementSet({ groups: [{ grantedCourses: ['general', 'clinical'] }], accessibleCourseIds: ['general'], openCourseIds: open })).toBe('P');
  });
  it('группа с одним курсом и закрытый курс → K', () => {
    expect(resolveAchievementSet({ groups: [{ grantedCourses: ['development'] }], accessibleCourseIds: ['development'], openCourseIds: open })).toBe('K');
  });
  it('системная группа и только открытые курсы → S', () => {
    expect(resolveAchievementSet({ groups: [{ isSystem: true, grantedCourses: ['general', 'clinical'] }], accessibleCourseIds: ['gruppovaya-psihoterapiya'], openCourseIds: open })).toBe('S');
  });
});

describe('helpers', () => {
  it('longestWeekStreak считает недели подряд', () => {
    expect(longestWeekStreak([at('2026-09-01T10:00:00'), at('2026-09-08T10:00:00'), at('2026-09-15T10:00:00'), at('2026-10-01T10:00:00')])).toBe(3);
  });
  it('hasLongBreak — перерыв больше 30 дней', () => {
    expect(hasLongBreak([at('2026-09-01T10:00:00'), at('2026-09-20T10:00:00')])).toBe(false);
    expect(hasLongBreak([at('2026-07-01T10:00:00'), at('2026-09-20T10:00:00')])).toBe(true);
  });
});
