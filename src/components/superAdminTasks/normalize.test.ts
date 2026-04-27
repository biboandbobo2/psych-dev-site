import { describe, expect, it } from 'vitest';
import { createId, normalizeArchive, normalizeRoles } from './normalize';

describe('createId', () => {
  it('возвращает непустую строку', () => {
    expect(createId()).toMatch(/.+/);
  });

  it('генерирует уникальные ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createId()));
    expect(ids.size).toBe(50);
  });
});

describe('normalizeRoles', () => {
  it('возвращает [] если вход не массив', () => {
    expect(normalizeRoles(null)).toEqual([]);
    expect(normalizeRoles(undefined)).toEqual([]);
    expect(normalizeRoles({})).toEqual([]);
    expect(normalizeRoles('foo')).toEqual([]);
  });

  it('сохраняет id и title', () => {
    const result = normalizeRoles([{ id: 'r1', title: 'Контент', tasks: [], order: 0 }]);
    expect(result[0].id).toBe('r1');
    expect(result[0].title).toBe('Контент');
  });

  it('подставляет fallback title "Роль N" для пустого title', () => {
    const result = normalizeRoles([{ id: 'r1', title: '   ', order: 0 }]);
    expect(result[0].title).toBe('Роль 1');
  });

  it('генерирует id если он отсутствует или пустой', () => {
    const result = normalizeRoles([{ title: 'X', order: 0 }, { id: '', title: 'Y', order: 1 }]);
    expect(result[0].id).toMatch(/.+/);
    expect(result[1].id).toMatch(/.+/);
    expect(result[0].id).not.toBe(result[1].id);
  });

  it('парсит string-задачи (legacy) в TaskItem', () => {
    const result = normalizeRoles([
      { id: 'r1', title: 'X', tasks: ['Купить молока', '  Полить цветы  ', '  '], order: 0 },
    ]);
    expect(result[0].tasks).toHaveLength(2);
    expect(result[0].tasks[0].text).toBe('Купить молока');
    expect(result[0].tasks[1].text).toBe('Полить цветы');
  });

  it('парсит object-задачи и игнорирует пустые', () => {
    const result = normalizeRoles([
      {
        id: 'r1',
        title: 'X',
        tasks: [{ id: 't1', text: 'Done' }, { text: '   ' }, { text: 'No id' }],
        order: 0,
      },
    ]);
    expect(result[0].tasks).toHaveLength(2);
    expect(result[0].tasks[0]).toEqual({ id: 't1', text: 'Done' });
    expect(result[0].tasks[1].text).toBe('No id');
  });

  it('сортирует по order', () => {
    const result = normalizeRoles([
      { id: 'a', title: 'A', order: 2 },
      { id: 'b', title: 'B', order: 0 },
      { id: 'c', title: 'C', order: 1 },
    ]);
    expect(result.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('использует index как fallback order', () => {
    const result = normalizeRoles([
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
    ]);
    expect(result.map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('normalizeArchive', () => {
  it('возвращает [] если вход не массив', () => {
    expect(normalizeArchive(null)).toEqual([]);
    expect(normalizeArchive({})).toEqual([]);
  });

  it('фильтрует записи без text или roleTitle', () => {
    expect(
      normalizeArchive([
        { id: 'a', text: '', roleTitle: 'X', doneAt: '2024-01-01T00:00:00Z' },
        { id: 'b', text: 'Y', roleTitle: '', doneAt: '2024-01-01T00:00:00Z' },
        { id: 'c', text: 'Z', roleTitle: 'X', doneAt: '2024-01-01T00:00:00Z' },
      ]),
    ).toHaveLength(1);
  });

  it('заменяет невалидную doneAt на now (ISO string)', () => {
    const before = Date.now();
    const result = normalizeArchive([{ text: 'X', roleTitle: 'R', doneAt: 'garbage' }]);
    const ts = Date.parse(result[0].doneAt);
    expect(ts).toBeGreaterThanOrEqual(before);
  });

  it('сортирует по doneAt desc (свежие сверху)', () => {
    const result = normalizeArchive([
      { id: 'old', text: 'A', roleTitle: 'R', doneAt: '2020-01-01T00:00:00Z' },
      { id: 'new', text: 'B', roleTitle: 'R', doneAt: '2025-01-01T00:00:00Z' },
      { id: 'mid', text: 'C', roleTitle: 'R', doneAt: '2023-01-01T00:00:00Z' },
    ]);
    expect(result.map((r) => r.id)).toEqual(['new', 'mid', 'old']);
  });
});
