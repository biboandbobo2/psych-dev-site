import { describe, expect, it } from 'vitest';
import {
  buildLectureContentFromSegments,
  buildLectureSegmentsFromContent,
  buildTimestampedLectureContent,
  formatLectureTimestamp,
  normalizeAgeRange,
  normalizeLectureNoteSegments,
} from './notes';

describe('normalizeAgeRange', () => {
  it('нормализует legacy alias school', () => {
    expect(normalizeAgeRange('school')).toBe('primary-school');
  });

  it('нормализует early-childhood к infancy', () => {
    expect(normalizeAgeRange('early-childhood')).toBe('infancy');
  });

  it('возвращает null для неизвестного периода', () => {
    expect(normalizeAgeRange('unknown-period')).toBeNull();
  });
});

describe('lecture note helpers', () => {
  it('форматирует таймкод в mm:ss', () => {
    expect(formatLectureTimestamp(317000)).toBe('05:17');
  });

  it('собирает обычный текст конспекта из сегментов', () => {
    expect(
      buildLectureContentFromSegments([
        { id: '1', startMs: 1000, text: 'Первый тезис' },
        { id: '2', startMs: 2000, text: 'Второй тезис' },
      ])
    ).toBe('Первый тезис\n\nВторой тезис');
  });

  it('собирает текст с таймкодами из сегментов', () => {
    expect(
      buildTimestampedLectureContent([
        { id: '1', startMs: 65_000, text: 'Первый тезис' },
        { id: '2', startMs: null, text: 'Второй тезис' },
      ])
    ).toBe('[01:05] Первый тезис\n\nВторой тезис');
  });

  it('нормализует legacy lecture note в один сегмент без таймкода', () => {
    expect(normalizeLectureNoteSegments(undefined, 'Старый конспект')).toEqual([
      {
        id: 'segment_legacy',
        startMs: null,
        text: 'Старый конспект',
      },
    ]);
  });
});

describe('buildLectureSegmentsFromContent', () => {
  const previous = [
    { id: 'a', startMs: 1000, text: 'Первый' },
    { id: 'b', startMs: 2000, text: 'Второй' },
  ];

  it('переносит id и таймкоды прежних сегментов по порядку абзацев', () => {
    expect(buildLectureSegmentsFromContent('Первый (правка)\n\nВторой', previous)).toEqual([
      { id: 'a', startMs: 1000, text: 'Первый (правка)' },
      { id: 'b', startMs: 2000, text: 'Второй' },
    ]);
  });

  it('новый абзац получает свой id без таймкода, лишние прежние отбрасываются', () => {
    const result = buildLectureSegmentsFromContent('Первый\n\n\nВторой\n\nТретий', previous);
    expect(result).toHaveLength(3);
    expect(result[2]).toMatchObject({ startMs: null, text: 'Третий' });
    expect(result[2].id).not.toBe('a');

    expect(buildLectureSegmentsFromContent('Только первый', previous)).toEqual([
      { id: 'a', startMs: 1000, text: 'Только первый' },
    ]);
  });

  it('пустой текст даёт пустой список сегментов', () => {
    expect(buildLectureSegmentsFromContent('  \n\n ', previous)).toEqual([]);
  });
});
