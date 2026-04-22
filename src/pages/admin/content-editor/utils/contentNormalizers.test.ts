import { describe, expect, it } from 'vitest';
import { normalizeAuthors, normalizeConcepts, normalizeLiterature, normalizeLinkedResources } from './contentNormalizers';

describe('contentNormalizers', () => {
  it('normalizes legacy title-based concepts into name-based items', () => {
    expect(
      normalizeConcepts([
        { title: 'Внимание', url: 'https://example.com' },
        { name: 'Память' },
      ])
    ).toEqual([
      { name: 'Внимание', url: 'https://example.com' },
      { name: 'Память' },
    ]);
  });

  it('normalizes legacy title-based authors into name-based items', () => {
    expect(
      normalizeAuthors([
        { title: 'Выготский', url: 'https://example.com' },
        { name: 'Лурия' },
      ])
    ).toEqual([
      { name: 'Выготский', url: 'https://example.com' },
      { name: 'Лурия' },
    ]);
  });

  it('keeps literature items when only the title is provided', () => {
    expect(
      normalizeLiterature([
        { title: 'Рубинштейн С. Л. "Основы общей психологии"' },
        { title: 'Лурия А. Р.', url: 'https://example.com/luria' },
      ])
    ).toEqual([
      { title: 'Рубинштейн С. Л. "Основы общей психологии"' },
      { title: 'Лурия А. Р.', url: 'https://example.com/luria' },
    ]);
  });

  it('requires URLs for linked resources such as extra videos', () => {
    expect(
      normalizeLinkedResources([
        { title: 'Видео без ссылки' },
        { title: 'Видео со ссылкой', url: 'https://example.com/video' },
      ])
    ).toEqual([
      { title: 'Видео со ссылкой', url: 'https://example.com/video' },
    ]);
  });
});
