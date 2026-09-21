import { describe, expect, it } from 'vitest';
import type { CourseStudent } from '../../../types/courseStudents';
import {
  averageWatched,
  formatLastLogin,
  groupSubtitle,
  matchesQuery,
  plural,
  sortRows,
  studentInitials,
  type StudentRow,
} from './courseStudentsHelpers';

function student(overrides: Partial<CourseStudent> = {}): CourseStudent {
  return {
    uid: 'u1',
    displayName: 'Мария Кузнецова',
    email: 'maria.k@example.com',
    photoURL: null,
    lastLoginAt: null,
    pendingRegistration: false,
    disabled: false,
    ...overrides,
  };
}

const row = (overrides: Partial<CourseStudent>, watched: number): StudentRow => ({
  student: student(overrides),
  watched,
});

describe('plural', () => {
  it('склоняет по последней цифре', () => {
    const forms: [string, string, string] = ['студент', 'студента', 'студентов'];
    expect(plural(1, forms)).toBe('студент');
    expect(plural(3, forms)).toBe('студента');
    expect(plural(7, forms)).toBe('студентов');
    expect(plural(21, forms)).toBe('студент');
    expect(plural(0, forms)).toBe('студентов');
  });

  it('вторая десятка — всегда родительный множественного', () => {
    const forms: [string, string, string] = ['студент', 'студента', 'студентов'];
    expect(plural(11, forms)).toBe('студентов');
    expect(plural(13, forms)).toBe('студентов');
  });
});

describe('matchesQuery', () => {
  it('пустой запрос пропускает всех', () => {
    expect(matchesQuery(student(), '   ')).toBe(true);
  });

  it('ищет по имени и по почте без учёта регистра', () => {
    expect(matchesQuery(student(), 'кузнец')).toBe(true);
    expect(matchesQuery(student(), 'MARIA.K@')).toBe(true);
    expect(matchesQuery(student(), 'орлов')).toBe(false);
  });

  it('безымянный студент находится по почте', () => {
    expect(matchesQuery(student({ displayName: null }), 'maria')).toBe(true);
  });
});

describe('sortRows', () => {
  const rows: StudentRow[] = [
    row({ uid: 'a', displayName: 'Борис', lastLoginAt: '2026-09-01T10:00:00.000Z' }, 3),
    row({ uid: 'b', displayName: 'Анна', lastLoginAt: '2026-09-20T10:00:00.000Z' }, 3),
    row({ uid: 'c', displayName: 'Виктор', lastLoginAt: null }, 9),
  ];

  it('не мутирует вход', () => {
    const sorted = sortRows(rows, 'name');
    expect(sorted).not.toBe(rows);
    expect(rows[0].student.uid).toBe('a');
  });

  it('по прогрессу — от большего, при равенстве по имени', () => {
    expect(sortRows(rows, 'progress').map((item) => item.student.uid)).toEqual(['c', 'b', 'a']);
  });

  it('по имени — ru-локаль', () => {
    expect(sortRows(rows, 'name').map((item) => item.student.uid)).toEqual(['b', 'a', 'c']);
  });

  it('по последнему входу — свежие первыми, «никогда» в конце', () => {
    expect(sortRows(rows, 'lastLogin').map((item) => item.student.uid)).toEqual(['b', 'a', 'c']);
  });
});

describe('averageWatched', () => {
  it('пустая секция даёт ноль, а не NaN', () => {
    expect(averageWatched([])).toBe(0);
  });

  it('округляет среднее до целого', () => {
    expect(averageWatched([row({ uid: 'a' }, 1), row({ uid: 'b' }, 2)])).toBe(2);
    expect(averageWatched([row({ uid: 'a' }, 0), row({ uid: 'b' }, 7)])).toBe(4);
  });
});

describe('groupSubtitle', () => {
  it('без опубликованных занятий среднее не показывает', () => {
    expect(groupSubtitle(3, 0, 0)).toBe('3 студента');
  });

  it('собирает подпись потока', () => {
    expect(groupSubtitle(16, 7, 12)).toBe('16 студентов · в среднем 7 из 12 занятий');
  });
});

describe('formatLastLogin', () => {
  const now = new Date('2026-09-21T12:00:00.000Z');

  it('null и мусор — «никогда»', () => {
    expect(formatLastLogin(null, now)).toBe('никогда');
    expect(formatLastLogin('не дата', now)).toBe('никогда');
  });

  // Полдень по UTC: граница суток не переезжает ни в одной реальной таймзоне.
  it('сегодня и вчера — словами', () => {
    expect(formatLastLogin('2026-09-21T11:00:00.000Z', now)).toBe('сегодня');
    expect(formatLastLogin('2026-09-20T12:00:00.000Z', now)).toBe('вчера');
  });

  it('в пределах месяца — дата', () => {
    expect(formatLastLogin('2026-09-12T10:00:00.000Z', now)).toBe('12.09.2026');
  });

  it('старше месяца — без точной даты', () => {
    expect(formatLastLogin('2026-07-01T10:00:00.000Z', now)).toBe('больше месяца назад');
  });
});

describe('studentInitials', () => {
  it('берёт две буквы имени', () => {
    expect(studentInitials(student())).toBe('МК');
  });

  it('без имени опирается на почту', () => {
    expect(studentInitials(student({ displayName: null }))).toBe('MK');
  });

  it('без имени и почты — uid', () => {
    expect(studentInitials(student({ displayName: null, email: null, uid: 'pending_x' }))).toBe(
      'PX'
    );
  });
});
