import { describe, expect, it } from 'vitest';
import {
  accessRequestDate,
  accessRequestInitials,
  accessRequestLabel,
  formatAccessRequestDate,
  sortAccessRequests,
  type AccessRequest,
} from './accessRequests';

const stamp = (iso: string) =>
  ({ toDate: () => new Date(iso) }) as unknown as AccessRequest['createdAt'];

function request(overrides: Partial<AccessRequest> & { id: string }): AccessRequest {
  return {
    uid: 'u1',
    email: null,
    displayName: null,
    courseId: null,
    message: '',
    status: 'new',
    createdAt: null,
    ...overrides,
  };
}

describe('accessRequestDate', () => {
  it('разворачивает Timestamp в Date', () => {
    const date = accessRequestDate(request({ id: 'r1', createdAt: stamp('2026-09-21T10:00:00Z') }));
    expect(date?.toISOString()).toBe('2026-09-21T10:00:00.000Z');
  });

  it('ещё не подтверждённый serverTimestamp отдаёт null', () => {
    expect(accessRequestDate(request({ id: 'r1' }))).toBeNull();
  });

  it('битое значение не роняет вызов', () => {
    const broken = { toDate: () => new Date('не дата') } as unknown as AccessRequest['createdAt'];
    expect(accessRequestDate(request({ id: 'r1', createdAt: broken }))).toBeNull();
  });
});

describe('accessRequestLabel', () => {
  it('имя → почта → uid', () => {
    expect(accessRequestLabel(request({ id: 'r1', displayName: 'Иван Петров' }))).toBe(
      'Иван Петров'
    );
    expect(accessRequestLabel(request({ id: 'r1', email: 'ivan@example.com' }))).toBe(
      'ivan@example.com'
    );
    expect(accessRequestLabel(request({ id: 'r1', uid: 'u-42' }))).toBe('u-42');
  });

  it('имя из одних пробелов не побеждает почту', () => {
    expect(
      accessRequestLabel(request({ id: 'r1', displayName: '   ', email: 'a@b.c' }))
    ).toBe('a@b.c');
  });
});

describe('accessRequestInitials', () => {
  it('берёт до двух букв имени', () => {
    expect(accessRequestInitials(request({ id: 'r1', displayName: 'Иван Петров' }))).toBe('ИП');
    expect(accessRequestInitials(request({ id: 'r1', displayName: 'Иван' }))).toBe('И');
  });

  it('из почты берёт первую букву, пунктуацию игнорирует', () => {
    expect(accessRequestInitials(request({ id: 'r1', email: 'ivan.petrov@mail.ru' }))).toBe('IP');
  });

  it('без имени и почты отдаёт заглушку', () => {
    expect(accessRequestInitials(request({ id: 'r1', uid: '-' }))).toBe('?');
  });
});

describe('sortAccessRequests', () => {
  it('свежие сверху, только что отправленные — в начало', () => {
    const older = request({ id: 'older', createdAt: stamp('2026-09-01T10:00:00Z') });
    const newer = request({ id: 'newer', createdAt: stamp('2026-09-20T10:00:00Z') });
    const pending = request({ id: 'pending' });

    expect(sortAccessRequests([older, newer, pending]).map((item) => item.id)).toEqual([
      'pending',
      'newer',
      'older',
    ]);
  });

  it('не мутирует вход', () => {
    const input = [
      request({ id: 'a', createdAt: stamp('2026-09-01T10:00:00Z') }),
      request({ id: 'b', createdAt: stamp('2026-09-20T10:00:00Z') }),
    ];
    sortAccessRequests(input);
    expect(input.map((item) => item.id)).toEqual(['a', 'b']);
  });
});

describe('formatAccessRequestDate', () => {
  it('дополняет день и месяц нулями', () => {
    expect(formatAccessRequestDate(new Date(2026, 8, 7))).toBe('07.09.2026');
    expect(formatAccessRequestDate(new Date(2026, 8, 7), false)).toBe('07.09');
  });

  it('без даты — пустая строка', () => {
    expect(formatAccessRequestDate(null)).toBe('');
  });
});
