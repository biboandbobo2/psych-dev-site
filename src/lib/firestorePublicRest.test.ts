import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  decodeFirestoreFields,
  isPublicRestAvailable,
  restGetPublicDoc,
  restListPublicCollection,
} from './firestorePublicRest';

function mockFetch(response: { status?: number; json?: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: (response.status ?? 200) < 400,
    status: response.status ?? 200,
    json: () => Promise.resolve(response.json ?? {}),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('decodeFirestoreFields', () => {
  it('декодирует типизированные значения REST-формата, включая вложенные map/array', () => {
    const decoded = decodeFirestoreFields({
      title: { stringValue: 'Курс' },
      order: { integerValue: '7' },
      rating: { doubleValue: 4.5 },
      published: { booleanValue: true },
      removedAt: { nullValue: null },
      updatedAt: { timestampValue: '2026-08-23T00:00:00Z' },
      items: {
        arrayValue: {
          values: [
            {
              mapValue: {
                fields: {
                  id: { stringValue: 'lesson-1' },
                  order: { integerValue: '0' },
                },
              },
            },
          ],
        },
      },
    });

    expect(decoded).toEqual({
      title: 'Курс',
      order: 7,
      rating: 4.5,
      published: true,
      removedAt: null,
      updatedAt: '2026-08-23T00:00:00Z',
      items: [{ id: 'lesson-1', order: 0 }],
    });
  });
});

describe('restGetPublicDoc', () => {
  it('возвращает декодированные поля дока', async () => {
    mockFetch({
      json: {
        name: 'projects/p/databases/(default)/documents/courseNavIndex/dev',
        fields: { v: { integerValue: '1' }, courseOpen: { booleanValue: false } },
      },
    });

    await expect(restGetPublicDoc('courseNavIndex/dev')).resolves.toEqual({
      v: 1,
      courseOpen: false,
    });
  });

  it('404 (дока нет) → null', async () => {
    mockFetch({ status: 404 });
    await expect(restGetPublicDoc('courseNavIndex/missing')).resolves.toBeNull();
  });

  it('HTTP-ошибка → reject (вызывающий уходит в SDK-fallback)', async () => {
    mockFetch({ status: 403 });
    await expect(restGetPublicDoc('courseNavIndex/dev')).rejects.toThrow('HTTP 403');
  });
});

describe('restListPublicCollection', () => {
  it('маппит documents в {id, data}', async () => {
    mockFetch({
      json: {
        documents: [
          {
            name: 'projects/p/databases/(default)/documents/courses/my-course',
            fields: { name: { stringValue: 'Мой курс' }, order: { integerValue: '10' } },
          },
        ],
      },
    });

    await expect(restListPublicCollection('courses')).resolves.toEqual([
      { id: 'my-course', data: { name: 'Мой курс', order: 10 } },
    ]);
  });

  it('пустая коллекция (нет поля documents) → []', async () => {
    mockFetch({ json: {} });
    await expect(restListPublicCollection('courses')).resolves.toEqual([]);
  });
});

describe('isPublicRestAvailable', () => {
  it('в тестовом окружении выключен — хуки не ходят в сеть', () => {
    expect(isPublicRestAvailable()).toBe(false);
  });
});
