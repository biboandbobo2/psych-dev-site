import { describe, expect, it } from 'vitest';
import type { IconSummary } from '../types';
import {
  centuryLabel, centuryOptions, displayPeriod, isPlaceholderFact, rankIcons, roman,
  searchIcons, sortIcons, subjectOptions, traditionGroup, traditionOptions,
} from './catalog';

/** Синтетический индекс: тексты записей меняются, проверяем поведение функций. */
function icon(over: Partial<IconSummary> & { id: string }): IconSummary {
  return {
    title: 'Без названия', tradition: 'Русская', region: '', period: '', centuries: [],
    subject: '', people: '', type: '', museum: '', tags: [],
    image: { width: 100, height: 150, widths: [320] },
    ...over,
  };
}

const sample = [
  icon({ id: 'a', title: 'Апостол Пётр', subject: 'Апостол', people: 'Пётр', centuries: [15], tradition: 'Русская' }),
  icon({ id: 'b', title: 'Чудо Георгия о змие', subject: 'Святой воин', people: 'Георгий', tags: ['пётр'], centuries: [14], tradition: 'Византийская / критская' }),
  icon({ id: 'c', title: 'Богоматерь Умиление', subject: 'Богоматерь с Младенцем', people: 'Мария', centuries: [12, 13], tradition: 'Византийская, Египет' }),
  icon({ id: 'd', title: 'Ахали-Шуамта', subject: 'Святитель', people: 'Пётр', centuries: [16], tradition: 'Грузинская' }),
];

describe('группы традиций', () => {
  it('сводит разные строки индекса к четырём учебным группам', () => {
    expect(traditionGroup('Византийская / критская')).toBe('Византийская');
    expect(traditionGroup('Византийская, Египет')).toBe('Византийская');
    expect(traditionGroup('Грузинская')).toBe('Грузинская');
    expect(traditionGroup('Коптская')).toBe('Коптская');
  });

  it('показывает только представленные группы в постоянном порядке и с количеством', () => {
    expect(traditionOptions(sample)).toEqual([
      { value: 'Русская', count: 1 },
      { value: 'Византийская', count: 2 },
      { value: 'Грузинская', count: 1 },
    ]);
  });

  it('фильтрует по группе и принимает прежнюю точную строку из ссылки', () => {
    expect(searchIcons(sample, '', 'Византийская').map((x) => x.id)).toEqual(['b', 'c']);
    expect(searchIcons(sample, '', 'Византийская, Египет').map((x) => x.id)).toEqual(['b', 'c']);
    expect(searchIcons(sample, '', 'Грузинская').map((x) => x.id)).toEqual(['d']);
  });
});

describe('фильтры сюжета и века', () => {
  it('собирает сюжеты по алфавиту с количеством', () => {
    expect(subjectOptions(sample)).toEqual([
      { value: 'Апостол', count: 1 },
      { value: 'Богоматерь с Младенцем', count: 1 },
      { value: 'Святитель', count: 1 },
      { value: 'Святой воин', count: 1 },
    ]);
  });

  it('отбирает записи одного сюжета и одного века', () => {
    expect(searchIcons(sample, '', '', '', 'Апостол').map((x) => x.id)).toEqual(['a']);
    expect(searchIcons(sample, '', '', '13').map((x) => x.id)).toEqual(['c']);
    expect(searchIcons(sample, '', '', '', 'Такого сюжета нет')).toEqual([]);
  });

  it('перечисляет века по возрастанию и подписывает их римскими цифрами', () => {
    expect(centuryOptions(sample)).toEqual([12, 13, 14, 15, 16]);
    expect(roman(18)).toBe('XVIII');
    expect(centuryLabel(6)).toBe('VI век');
  });
});

describe('ранжирование поиска', () => {
  it('ставит совпадение в названии выше совпадения в сюжете и теге', () => {
    const found = searchIcons(sample, 'Пётр');
    expect(found.map((x) => x.id).sort()).toEqual(['a', 'b', 'd']);
    expect(rankIcons(found, 'Пётр')[0].id).toBe('a');
    expect(rankIcons(found, 'Пётр').at(-1)!.id).toBe('b');
  });

  it('не меняет порядок без запроса и не теряет регистр и «ё»', () => {
    expect(rankIcons(sample, '   ')).toBe(sample);
    expect(searchIcons(sample, 'петр').map((x) => x.id)).toEqual(['a', 'b', 'd']);
  });
});

describe('порядок каталога', () => {
  it('по умолчанию идёт по первому веку, затем по названию', () => {
    expect(sortIcons(sample, 'century').map((x) => x.id)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('по названию сортирует по алфавиту, записи без века не уходят вперёд', () => {
    const withUnknown = [...sample, icon({ id: 'e', title: 'Ангел' })];
    expect(sortIcons(withUnknown, 'title').map((x) => x.id)).toEqual(['e', 'a', 'd', 'c', 'b']);
    expect(sortIcons(withUnknown, 'century').at(-1)!.id).toBe('e');
  });
});

describe('датировка в карточке', () => {
  it('оставляет выражение даты', () => {
    expect(displayPeriod({ period: 'Около 1425–1450', centuries: [15] })).toBe('Около 1425–1450');
    expect(displayPeriod({ period: 'IX век; позднейшие поновления до XVIII века', centuries: [9] })).toBe('IX век');
    expect(displayPeriod({ period: 'XIII век; датировка требует сверки', centuries: [13] })).toBe('XIII век');
  });

  it('заменяет редакторскую пометку веком из индекса', () => {
    expect(displayPeriod({ period: '1736 год — по записи репродукции', centuries: [18] })).toBe('XVIII век');
    expect(displayPeriod({ period: 'Середина XVIII века — по актуальной карточке Icon-art', centuries: [18] })).toBe('XVIII век');
    expect(displayPeriod({ period: 'Датировка требует сверки', centuries: [6, 7] })).toBe('VI–VII века');
  });

  it('без веков честно говорит, что датировка уточняется', () => {
    expect(displayPeriod({ period: 'Датировка требует сверки: записи расходятся', centuries: [] })).toBe('Датировка уточняется');
    expect(displayPeriod({ period: '', centuries: [] })).toBe('Датировка уточняется');
  });
});

describe('строки-заглушки в паспорте', () => {
  it('скрывает оговорку, занимающую всю строку', () => {
    expect(isPlaceholderFact('Не указан в доступном источнике')).toBe(true);
    expect(isPlaceholderFact('Собрание не уточнено в доступной записи')).toBe(true);
    expect(isPlaceholderFact('Место хранения отдельно не уточнено в записи репродукции')).toBe(true);
    expect(isPlaceholderFact('Не установлено по доступному источнику')).toBe(true);
    expect(isPlaceholderFact('  ')).toBe(true);
    expect(isPlaceholderFact(undefined)).toBe(true);
  });

  it('оставляет строку, если перед оговоркой есть сведения', () => {
    expect(isPlaceholderFact('Русь; центр не уточнён')).toBe(false);
    expect(isPlaceholderFact('Синай; место создания не установлено')).toBe(false);
    expect(isPlaceholderFact('Московские мастера; личное авторство не установлено')).toBe(false);
    expect(isPlaceholderFact('Государственный Эрмитаж')).toBe(false);
    expect(isPlaceholderFact('И-1234')).toBe(false);
  });
});
