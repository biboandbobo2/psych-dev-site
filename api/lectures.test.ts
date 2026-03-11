import { describe, expect, it } from 'vitest';
import {
  LECTURE_COLLECTIONS,
  LECTURE_SEARCH_CONFIG,
  buildLectureAiUnavailableMessage,
  buildLectureDeepLink,
  computeLexicalScore,
  groupLectureSourcesByCourse,
  validateLectureScope,
} from './lectures';

describe('LECTURE_COLLECTIONS', () => {
  it('содержит коллекцию sources', () => {
    expect(LECTURE_COLLECTIONS.sources).toBe('lecture_sources');
  });

  it('содержит коллекцию chunks', () => {
    expect(LECTURE_COLLECTIONS.chunks).toBe('lecture_chunks');
  });
});

describe('LECTURE_SEARCH_CONFIG', () => {
  it('ограничивает число лекций в выборке', () => {
    expect(LECTURE_SEARCH_CONFIG.maxLectureSelections).toBe(24);
  });

  it('использует gemini-embedding-001', () => {
    expect(LECTURE_SEARCH_CONFIG.embeddingModel).toBe('gemini-embedding-001');
  });
});

describe('computeLexicalScore', () => {
  it('возвращает 1 при полном совпадении терминов', () => {
    expect(
      computeLexicalScore('когнитивное развитие', 'когнитивное развитие и обучение')
    ).toBe(1);
  });

  it('возвращает 0 при отсутствии совпадений', () => {
    expect(
      computeLexicalScore('память', 'эмоции и мотивация')
    ).toBe(0);
  });
});

describe('buildLectureDeepLink', () => {
  it('строит deep-link на core курс', () => {
    const link = buildLectureDeepLink('general', 'general-5', 'video123', 125000);
    expect(link).toContain('/general/5?');
    expect(link).toContain('study=1');
    expect(link).toContain('panel=transcript');
    expect(link).toContain('video=video123');
    expect(link).toContain('t=125');
  });

  it('строит deep-link на dynamic курс', () => {
    const link = buildLectureDeepLink('course-x', 'lesson-1', 'video123', 0);
    expect(link).toContain('/course/course-x/lesson-1?');
  });
});

describe('groupLectureSourcesByCourse', () => {
  it('группирует лекции по курсу и сортирует внутри курса', () => {
    const groups = groupLectureSourcesByCourse([
      {
        lectureKey: 'general::2::v2',
        youtubeVideoId: 'v2',
        courseId: 'general',
        periodId: 'general-2',
        periodTitle: 'Методологические проблемы',
        lectureTitle: 'Вторая лекция',
        chunkCount: 2,
        durationMs: 1000,
      },
      {
        lectureKey: 'general::1::v1',
        youtubeVideoId: 'v1',
        courseId: 'general',
        periodId: 'general-1',
        periodTitle: 'История психологии и методы',
        lectureTitle: 'Первая лекция',
        chunkCount: 3,
        durationMs: 1000,
      },
      {
        lectureKey: 'clinical::1::v3',
        youtubeVideoId: 'v3',
        courseId: 'clinical',
        periodId: 'clinical-1',
        periodTitle: 'Предмет, методы патопсихологии',
        lectureTitle: 'Клиническая лекция',
        chunkCount: 3,
        durationMs: 1000,
      },
    ]);

    expect(groups[0].courseId).toBe('clinical');
    expect(groups[1].courseId).toBe('general');
    expect(groups[1].lectures[0].periodId).toBe('general-1');
  });

  it('ставит более ранние лекции курса выше поздних', () => {
    const groups = groupLectureSourcesByCourse([
      {
        lectureKey: 'development::lateAdult::v2',
        youtubeVideoId: 'v2',
        courseId: 'development',
        periodId: 'lateAdult',
        periodTitle: 'Пожилой возраст (65–80 лет)',
        lectureTitle: 'Поздняя лекция',
        chunkCount: 2,
        durationMs: 1000,
      },
      {
        lectureKey: 'development::intro::v1',
        youtubeVideoId: 'v1',
        courseId: 'development',
        periodId: 'intro',
        periodTitle: 'Введение',
        lectureTitle: 'Вводная лекция',
        chunkCount: 3,
        durationMs: 1000,
      },
      {
        lectureKey: 'development::prenatal::v3',
        youtubeVideoId: 'v3',
        courseId: 'development',
        periodId: 'prenatal',
        periodTitle: 'Пренатальный период',
        lectureTitle: 'Пренатальная лекция',
        chunkCount: 4,
        durationMs: 1000,
      },
    ]);

    expect(groups[0].lectures.map((lecture) => lecture.periodId)).toEqual([
      'intro',
      'prenatal',
      'lateAdult',
    ]);
  });
});

describe('validateLectureScope', () => {
  it('принимает курс без точечного списка лекций', () => {
    const result = validateLectureScope({
      query: 'что такое рабочая память',
      courseId: 'general',
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.value.lectureKeys).toEqual([]);
    }
  });

  it('ограничивает число lectureKeys', () => {
    const lectureKeys = Array.from({ length: 40 }, (_, index) => `lecture-${index}`);
    const result = validateLectureScope({
      query: 'рабочая память',
      courseId: 'general',
      lectureKeys,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.value.lectureKeys).toHaveLength(LECTURE_SEARCH_CONFIG.maxLectureSelections);
    }
  });

  it('возвращает ошибку без courseId', () => {
    const result = validateLectureScope({
      query: 'рабочая память',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('buildLectureAiUnavailableMessage', () => {
  it('возвращает понятный fallback-текст для неподготовленных lecture chunks', () => {
    expect(buildLectureAiUnavailableMessage()).toContain('ещё не подготовлены данные');
  });
});
