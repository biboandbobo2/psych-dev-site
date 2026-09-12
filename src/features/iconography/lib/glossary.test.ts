import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { GlossaryTerm, IconSummary } from '../types';
import { markTerms } from './glossary';

const glossary: GlossaryTerm[] = JSON.parse(readFileSync('public/iconography/glossary.json', 'utf8'));
const icons: IconSummary[] = JSON.parse(readFileSync('public/iconography/catalog.json', 'utf8'));

const term = (id: string, forms: string[]): GlossaryTerm =>
  ({ id, term: forms[0], forms, definition: `Пояснение ${id}.` });

const marked = (text: string, terms: GlossaryTerm[]) =>
  markTerms(text, terms).filter((segment) => segment.term).map((segment) => segment.text);

describe('поиск терминов в тексте', () => {
  const terms = [term('pozyom', ['позём', 'позёма']), term('lik', ['лик', 'лика'])];

  it('не различает ё/е и регистр', () => {
    expect(marked('Позем виден внизу', terms)).toEqual(['Позем']);
    expect(marked('Ступни стоят на позёме', [term('pozyom', ['позёме'])])).toEqual(['позёме']);
  });

  it('берёт только целые слова', () => {
    expect(marked('Великий святой не поземельный', terms)).toEqual([]);
    expect(marked('У него светлый лик, а не великан', terms)).toEqual(['лик']);
  });

  it('помечает только первое вхождение термина в одном тексте', () => {
    expect(marked('Позём внизу; на позёме стоят ноги; позёма нет наверху', terms)).toEqual(['Позём']);
  });

  it('предпочитает самую длинную форму', () => {
    const rows = [term('deisus', ['деисусный', 'деисус']), term('ryady', ['деисусный ряд'])];
    expect(marked('Это деисусный ряд иконостаса', rows)).toEqual(['деисусный ряд']);
  });

  it('сохраняет исходный текст по отрезкам', () => {
    const segments = markTerms('Ступни стоят на позёме доски', terms);
    expect(segments.map((segment) => segment.text).join('')).toBe('Ступни стоят на позёме доски');
  });

  it('без терминов возвращает текст одним отрезком', () => {
    expect(markTerms('Обычный текст', [])).toEqual([{ text: 'Обычный текст' }]);
  });
});

describe('данные глоссария', () => {
  it('содержит 35–60 терминов с уникальными id и непересекающимися формами', () => {
    expect(glossary.length).toBeGreaterThanOrEqual(35);
    expect(glossary.length).toBeLessThanOrEqual(60);
    expect(new Set(glossary.map((x) => x.id)).size).toBe(glossary.length);
    const forms = glossary.flatMap((x) => x.forms.map((form) => form.toLowerCase().replaceAll('ё', 'е')));
    expect(new Set(forms).size).toBe(forms.length);
  });

  it('ссылается только на существующие иконы коллекции', () => {
    const known = new Set(icons.map((icon) => icon.id));
    for (const item of glossary) {
      if (item.example) expect(known).toContain(item.example.iconId);
    }
  });

  it('находит термины в реальном тексте паспорта', () => {
    expect(marked('Хитон с накинутым поверх гиматием и золотой нимб', glossary))
      .toEqual(['Хитон', 'гиматием', 'нимб']);
  });
});
