import { describe, expect, it } from 'vitest';
import type { UserRecord } from '../../../../hooks/useAllUsers';
import type { Group } from '../../../../types/groups';
import {
  DEFAULT_USER_FILTERS,
  buildAccessSources,
  buildAccessSummary,
  buildUserRows,
  buildUsersSummary,
  filterAndSortUsers,
  filterUsers,
  formatLastLogin,
  parseEmailList,
  plural,
  sortUsers,
  userDisplayName,
  userInitials,
} from '../utils';

const ts = (iso: string) => ({ toDate: () => new Date(iso) });

function user(partial: Partial<UserRecord> & { uid: string }): UserRecord {
  return {
    email: `${partial.uid}@example.com`,
    displayName: null,
    photoURL: null,
    role: null,
    createdAt: null,
    lastLoginAt: null,
    ...partial,
  } as UserRecord;
}

function group(partial: Partial<Group> & { id: string; name: string }): Group {
  return {
    memberIds: [],
    grantedCourses: [],
    announcementAdminIds: [],
    ...partial,
  } as Group;
}

const COURSE_IDS = ['development', 'clinical', 'general', 'external-x'];

const stream1 = group({
  id: 'stream-1',
  name: 'Поток 1',
  memberIds: ['maria', 'anna'],
  grantedCourses: ['development', 'clinical'],
  announcementAdminIds: ['anna'],
});
const everyone = group({
  id: 'everyone',
  name: 'Все',
  isSystem: true,
  memberIds: ['maria', 'ilya', 'anna'],
  grantedCourses: ['general'],
});

const USERS: UserRecord[] = [
  user({
    uid: 'maria',
    displayName: 'Мария Кузнецова',
    email: 'maria.k@example.com',
    courseAccess: { 'external-x': true },
    lastLoginAt: ts('2026-09-20T10:00:00Z'),
    createdAt: ts('2026-03-12T10:00:00Z'),
  }),
  user({
    uid: 'anna',
    displayName: 'Анна Лебедева',
    role: 'admin',
    adminEditableCourses: ['external-x', 'general'],
    lastLoginAt: ts('2026-09-21T09:00:00Z'),
  }),
  user({ uid: 'ilya', displayName: 'Илья Романов', lastLoginAt: ts('2026-09-18T09:00:00Z') }),
  user({ uid: 'olga', displayName: null, pendingRegistration: true }),
  user({ uid: 'super', displayName: 'Алексей', role: 'super-admin' }),
];

const rows = buildUserRows(USERS, [stream1, everyone], COURSE_IDS);
const rowFor = (uid: string) => rows.find((row) => row.user.uid === uid)!;

describe('buildUserRows', () => {
  it('считает эффективный доступ как объединение личного и потоков', () => {
    const maria = rowFor('maria');
    expect(Object.keys(maria.access.courses).sort()).toEqual([
      'clinical',
      'development',
      'external-x',
      'general',
    ]);
    expect(maria.displayRole).toBe('student');
    expect(maria.streams).toEqual([{ id: 'stream-1', name: 'Поток 1', curator: false }]);
  });

  it('системные группы не попадают в чипы потоков и не делают гостя студентом', () => {
    const ilya = rowFor('ilya');
    expect(ilya.streams).toEqual([]);
    expect(ilya.displayRole).toBe('guest');
    expect(Object.keys(ilya.access.courses)).toEqual(['general']);
  });

  it('куратор потока помечен в чипе', () => {
    expect(rowFor('anna').streams).toEqual([{ id: 'stream-1', name: 'Поток 1', curator: true }]);
  });
});

describe('buildAccessSources', () => {
  it('перечисляет потоки, системные группы и личные курсы', () => {
    expect(buildAccessSources(rowFor('maria').access)).toBe('Поток 1 · Все · 1 лично');
  });

  it('только системные группы — «только открытые всем»', () => {
    expect(buildAccessSources(rowFor('ilya').access)).toBe('только открытые всем');
  });

  it('без доступа — пустая строка', () => {
    expect(buildAccessSources(rowFor('olga').access)).toBe('');
  });
});

describe('buildAccessSummary', () => {
  it('студент: число курсов и источники', () => {
    expect(buildAccessSummary(rowFor('maria'))).toEqual({
      primary: '4 курса',
      secondary: 'Поток 1 · Все · 1 лично',
    });
  });

  it('администратор курса: редактируемые курсы + студенческий доступ', () => {
    expect(buildAccessSummary(rowFor('anna'))).toEqual({
      primary: 'Редактирует 2 курса',
      secondary: 'учится на 3 курсах · Поток 1 · Все',
    });
  });

  it('супер-админ: все курсы', () => {
    expect(buildAccessSummary(rowFor('super'))).toEqual({ primary: 'Все курсы', secondary: null });
  });

  it('приглашённый без доступа: подпись про первый вход', () => {
    expect(buildAccessSummary(rowFor('olga'))).toEqual({
      primary: 'Нет доступа',
      secondary: 'откроются при первом входе',
    });
  });
});

describe('фильтры и сортировка', () => {
  it('поиск по имени и email без учёта регистра', () => {
    expect(filterUsers(rows, { ...DEFAULT_USER_FILTERS, search: 'МАРИЯ' })).toHaveLength(1);
    expect(filterUsers(rows, { ...DEFAULT_USER_FILTERS, search: 'maria.k@' })).toHaveLength(1);
  });

  it('роль', () => {
    expect(
      filterUsers(rows, { ...DEFAULT_USER_FILTERS, role: 'guest' }).map((r) => r.user.uid)
    ).toEqual(['ilya', 'olga']);
    expect(
      filterUsers(rows, { ...DEFAULT_USER_FILTERS, role: 'admin' }).map((r) => r.user.uid)
    ).toEqual(['anna']);
  });

  it('поток — включая системный', () => {
    expect(
      filterUsers(rows, { ...DEFAULT_USER_FILTERS, groupId: 'stream-1' }).map((r) => r.user.uid)
    ).toEqual(['maria', 'anna']);
  });

  it('курс — по эффективному доступу и по редактируемым курсам админа', () => {
    const byClinical = filterUsers(rows, { ...DEFAULT_USER_FILTERS, courseId: 'clinical' });
    expect(byClinical.map((r) => r.user.uid)).toEqual(['maria', 'anna', 'super']);
    const byExternal = filterUsers(rows, { ...DEFAULT_USER_FILTERS, courseId: 'external-x' });
    expect(byExternal.map((r) => r.user.uid)).toEqual(['maria', 'anna', 'super']);
  });

  it('ожидают регистрации', () => {
    expect(
      filterUsers(rows, { ...DEFAULT_USER_FILTERS, pendingOnly: true }).map((r) => r.user.uid)
    ).toEqual(['olga']);
  });

  it('сортировка: последний вход по убыванию, «никогда» в конце', () => {
    expect(sortUsers(rows, 'lastLogin').map((r) => r.user.uid)).toEqual([
      'anna',
      'maria',
      'ilya',
      'olga',
      'super',
    ]);
  });

  it('сортировка по имени', () => {
    expect(sortUsers(rows, 'name').map((r) => r.user.uid)[0]).toBe('super');
  });

  it('filterAndSortUsers применяет и фильтр, и сортировку', () => {
    const result = filterAndSortUsers(rows, { ...DEFAULT_USER_FILTERS, role: 'guest', sort: 'name' });
    expect(result.map((r) => r.user.uid)).toEqual(['ilya', 'olga']);
  });
});

describe('форматирование', () => {
  const now = new Date('2026-09-21T12:00:00');

  it('последний вход', () => {
    expect(formatLastLogin(null, now)).toBe('никогда');
    expect(formatLastLogin(new Date('2026-09-21T01:00:00'), now)).toBe('сегодня');
    expect(formatLastLogin(new Date('2026-09-20T23:00:00'), now)).toBe('вчера');
    expect(formatLastLogin(new Date('2026-08-11T10:00:00'), now)).toBe('11.08.2026');
  });

  it('числительные', () => {
    expect(plural(1, 'курс', 'курса', 'курсов')).toBe('курс');
    expect(plural(3, 'курс', 'курса', 'курсов')).toBe('курса');
    expect(plural(11, 'курс', 'курса', 'курсов')).toBe('курсов');
    expect(plural(21, 'курс', 'курса', 'курсов')).toBe('курс');
  });

  it('имя и инициалы', () => {
    expect(userDisplayName(rowFor('olga').user)).toBe('Ожидает регистрации');
    expect(userInitials(rowFor('maria').user)).toBe('МК');
    expect(userInitials(rowFor('olga').user)).toBe('O');
  });

  it('сводка в подзаголовке', () => {
    expect(buildUsersSummary(rows)).toBe(
      '5 человек · 1 студент · 1 администратор курса · 2 гостя'
    );
  });
});

describe('parseEmailList', () => {
  it('разбирает запятые, точки с запятой и переводы строк', () => {
    expect(parseEmailList('a@b.ru, C@D.RU;\n e@f.ru').emails).toEqual([
      'a@b.ru',
      'c@d.ru',
      'e@f.ru',
    ]);
  });

  it('дедуплицирует и отделяет невалидные', () => {
    const result = parseEmailList('a@b.ru a@b.ru нет-почты x@y');
    expect(result.emails).toEqual(['a@b.ru']);
    expect(result.invalid).toEqual(['нет-почты', 'x@y']);
  });

  it('пустой ввод', () => {
    expect(parseEmailList('   ')).toEqual({ emails: [], invalid: [] });
  });
});
