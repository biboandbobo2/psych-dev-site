import { describe, expect, it } from 'vitest';
import { buildQueryVariants } from '../queryVariants';
import { extractLabelsAndAliases } from '../wikidata';

describe('buildQueryVariants', () => {
  it('всегда включает исходный запрос и ограничивает количество', () => {
    const variants = buildQueryVariants({
      q: 'привязанность',
      detectedLang: 'ru',
      wikidataVariants: [
        { qid: 'Q1', lang: 'en', value: 'attachment theory', kind: 'label' },
        { qid: 'Q1', lang: 'de', value: 'Bindung Theorie', kind: 'label' },
        { qid: 'Q1', lang: 'fr', value: 'théorie de l’attachement', kind: 'label' },
      ],
      langsRequested: ['ru', 'en', 'de', 'fr'],
      mode: 'drawer',
    });

    expect(variants[0]).toBe('привязанность');
    // drawer mode: maxTotal = 4 (original query + up to 3 variants)
    expect(variants.length).toBeLessThanOrEqual(4);
  });
});

describe('extractLabelsAndAliases', () => {
  it('извлекает label/alias по языкам', () => {
    const entities = {
      Q1: {
        id: 'Q1',
        labels: { en: { value: 'Attachment theory' }, ru: { value: 'Теория привязанности' } },
        aliases: { en: [{ value: 'attachment' }] },
      },
    } as any;

    const variants = extractLabelsAndAliases(entities, ['en', 'ru']);
    const labels = variants.filter((v) => v.kind === 'label').map((v) => v.value);
    expect(labels).toContain('Attachment theory');
    expect(labels).toContain('Теория привязанности');
  });
});
