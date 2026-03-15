import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWikipediaPlainExtract } from '../../server/api/timelineBiographyWikipedia.js';
import { MAX_WIKIPEDIA_PROMPT_EXTRACT_CHARS } from '../../server/api/timelineBiographyTypes.js';

describe('timelineBiographyWikipedia', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('сохраняет полный extract и собирает сбалансированный promptExtract для длинной статьи', async () => {
    const longExtract = [
      'Начало жизни. '.repeat(1500),
      'Средний период жизни. '.repeat(1500),
      'Поздний период жизни. '.repeat(1500),
    ].join('\n\n');

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          pages: [
            {
              title: 'Толстой, Лев Николаевич',
              extract: longExtract,
              fullurl: 'https://ru.wikipedia.org/wiki/Толстой,_Лев_Николаевич',
            },
          ],
        },
      }),
    });

    const result = await fetchWikipediaPlainExtract('https://ru.wikipedia.org/wiki/Толстой,_Лев_Николаевич');

    expect(result.extract.length).toBe(longExtract.trim().length);
    expect(result.promptExtract.length).toBeLessThanOrEqual(MAX_WIKIPEDIA_PROMPT_EXTRACT_CHARS);
    expect(result.promptExtract).toContain('Начало жизни');
    expect(result.promptExtract).toContain('Средний период жизни');
    expect(result.promptExtract).toContain('Поздний период жизни');
  });

  it('отбрасывает небииографические section blocks из biographyExtract', async () => {
    const extract = [
      'Лев Толстой родился в 1828 году.',
      '',
      'Биография',
      'В 1852 году опубликовал «Детство».',
      '',
      'Болезнь и смерть',
      'В 1910 году умер на станции Астапово.',
      '',
      'Дети от брака с Софьей Андреевной:',
      'Михаил (1879—1944). В 1920 году эмигрировал.',
      '',
      'Мировое признание. Память',
      'В 1951 году вышло собрание сочинений.',
    ].join('\n');

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          pages: [
            {
              title: 'Толстой, Лев Николаевич',
              extract,
              fullurl: 'https://ru.wikipedia.org/wiki/Толстой,_Лев_Николаевич',
            },
          ],
        },
      }),
    });

    const result = await fetchWikipediaPlainExtract('https://ru.wikipedia.org/wiki/Толстой,_Лев_Николаевич');

    expect(result.biographyExtract).toContain('опубликовал «Детство»');
    expect(result.biographyExtract).toContain('умер на станции Астапово');
    expect(result.biographyExtract).not.toContain('эмигрировал');
    expect(result.biographyExtract).not.toContain('собрание сочинений');
    expect(result.promptExtract).not.toContain('эмигрировал');
  });
});
