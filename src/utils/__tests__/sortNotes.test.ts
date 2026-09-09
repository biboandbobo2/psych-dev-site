import { describe, expect, it } from 'vitest';
import type { Note } from '../../types/notes';
import { getEffectivePeriodKey, sortNotes } from '../sortNotes';

function note(id: string, overrides: Partial<Note>): Note {
  return {
    id,
    userId: 'u',
    title: id,
    content: '',
    ageRange: null,
    topicId: null,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
    ...overrides,
  };
}

const lessonOrder = ['development::intro', 'development::infancy', 'development::toddler'];

describe('sortNotes', () => {
  it('«сначала новые» — по дате последней правки, а не создания', () => {
    const old = note('old', {
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-09-05T00:00:00Z'),
    });
    const fresh = note('fresh', {
      createdAt: new Date('2026-09-02T00:00:00Z'),
      updatedAt: new Date('2026-09-02T00:00:00Z'),
    });
    expect(sortNotes([fresh, old], 'date-new').map((n) => n.id)).toEqual(['old', 'fresh']);
    expect(sortNotes([fresh, old], 'date-old').map((n) => n.id)).toEqual(['fresh', 'old']);
  });

  it('«по занятиям» — в порядке занятий курса, без занятия в конце', () => {
    const toddler = note('toddler', { periodKey: 'development::toddler' });
    const intro = note('intro', { periodKey: 'development::intro' });
    const unknown = note('unknown', { periodKey: 'development::nowhere' });
    const legacy = note('legacy', { periodKey: null, courseId: null, ageRange: 'infancy' });
    const none = note('none', {});

    expect(
      sortNotes([toddler, none, unknown, legacy, intro], 'period', lessonOrder).map((n) => n.id)
    ).toEqual(['intro', 'legacy', 'toddler', 'none', 'unknown']);
  });

  it('getEffectivePeriodKey собирает ключ для легаси-заметок', () => {
    expect(getEffectivePeriodKey(note('a', { periodKey: 'clinical::x' }))).toBe('clinical::x');
    expect(getEffectivePeriodKey(note('b', { courseId: 'clinical', periodId: 'x' }))).toBe('clinical::x');
    expect(getEffectivePeriodKey(note('c', { ageRange: 'infancy' }))).toBe('development::infancy');
    expect(getEffectivePeriodKey(note('d', {}))).toBeNull();
  });
});
