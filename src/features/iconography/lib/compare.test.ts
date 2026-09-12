import { describe, expect, it } from 'vitest';
import type { IconRecord, IconSummary } from '../types';
import { compareRows, compareTask, defaultRight, pickClues } from './compare';

/** Синтетический индекс: проверяем правила подбора, а не содержание каталога. */
function summary(over: Partial<IconSummary> & { id: string }): IconSummary {
  return {
    title: 'Без названия', tradition: 'Русская', region: '', period: '', centuries: [15],
    subject: '', people: '', type: '', museum: '', tags: [],
    image: { width: 100, height: 150, widths: [320] },
    ...over,
  };
}

function record(over: Partial<IconRecord> & { id: string }): IconRecord {
  return {
    ...summary(over), attribution: '', material: 'Живопись на доске', inventory: '', description: '',
    clues: [], caution: '', sources: [],
    rights: { label: '', url: '', credit: '', original: '', checked: '' },
    originalMetadata: { title: '', date: '', culture: '', attribution: '', material: '' },
    questions: [],
    ...over,
  };
}

describe('правая икона по умолчанию', () => {
  const icons = [
    summary({ id: 'ru-1', subject: 'Благовещение', recognitionGroup: 'annunciation', tradition: 'Русская' }),
    summary({ id: 'ru-2', subject: 'Благовещение', recognitionGroup: 'annunciation', tradition: 'Русская' }),
    summary({ id: 'by-1', subject: 'Благовещение', recognitionGroup: 'annunciation', tradition: 'Византийская' }),
    summary({ id: 'ru-3', subject: 'Распятие', recognitionGroup: 'crucifixion', tradition: 'Русская' }),
    summary({ id: 'ge-1', subject: 'Святитель', tradition: 'Грузинская' }),
    summary({ id: 'ge-2', subject: 'Святитель', tradition: 'Грузинская' }),
  ];

  it('берёт икону той же группы узнавания и предпочитает другую традицию', () => {
    expect(defaultRight(icons, 'ru-1')).toBe('by-1');
  });

  it('остаётся в группе, если другой традиции в ней нет', () => {
    expect(defaultRight(icons, 'by-1')).toBe('ru-1');
  });

  it('без группы берёт ту же традицию с тем же сюжетом', () => {
    expect(defaultRight(icons, 'ge-1')).toBe('ge-2');
  });

  it('в одиночной группе без общего сюжета берёт первую отличную запись', () => {
    expect(defaultRight(icons, 'ru-3')).toBe('ru-1');
  });

  it('не подставляет саму себя и переживает неизвестный id', () => {
    expect(defaultRight(icons, 'ru-1')).not.toBe('ru-1');
    expect(defaultRight(icons, 'нет-такой')).toBe('ru-1');
    expect(defaultRight([], 'ru-1')).toBeUndefined();
  });
});

describe('таблица «Что сравнить»', () => {
  const left = record({
    id: 'a', subject: 'Богоматерь с Младенцем', type: 'Одигитрия', people: 'Мария и Христос',
    tradition: 'Русская', centuries: [15], material: 'Живопись на доске; техника по записи источника',
  });
  const right = record({
    id: 'b', subject: 'Богоматерь с Младенцем', type: 'Умиление', people: 'Мария и Христос',
    tradition: 'Византийская', centuries: [12, 13], material: 'Живопись на доске',
  });

  it('помечает совпадение и оставляет различия раздельными', () => {
    const rows = compareRows(left, right);
    expect(rows.map((row) => [row.label, row.same])).toEqual([
      ['Сюжет', true], ['Тип', false], ['Персонажи', true], ['Традиция и век', false], ['Материал', true],
    ]);
    expect(rows[1]).toMatchObject({ left: 'Одигитрия', right: 'Умиление' });
  });

  it('сводит датировку к векам и отбрасывает редакторское пояснение о материале', () => {
    const rows = compareRows(left, right);
    expect(rows[3].left).toBe('Русская · XV век');
    expect(rows[3].right).toBe('Византийская · XII–XIII века');
    expect(rows[4].left).toBe('Живопись на доске');
  });

  it('пустое поле не считает совпадением', () => {
    const rows = compareRows(record({ id: 'c' }), record({ id: 'd' }));
    expect(rows[0]).toMatchObject({ left: '—', same: false });
  });
});

describe('пара наблюдений', () => {
  const left = record({
    id: 'a', subject: 'Распятие', type: 'Створка складня',
    clues: [
      { title: 'Металлический оклад', text: 'Поля закрыты тиснёным серебром.' },
      { title: 'Тело на кресте', text: 'Фигура распята, руки раскинуты вдоль перекладины.' },
    ],
  });
  const right = record({
    id: 'b', subject: 'Распятие', type: 'Рельеф',
    clues: [
      { title: 'Зелёный позём', text: 'Полоса земли внизу.' },
      { title: 'Крест и предстоящие', text: 'Тело распято на кресте, по сторонам перекладины стоят двое.' },
    ],
  });

  it('выбирает наблюдения с общими значимыми словами, а не первые подряд', () => {
    const [a, b] = pickClues(left, right);
    expect(a?.title).toBe('Тело на кресте');
    expect(b?.title).toBe('Крест и предстоящие');
  });

  it('сравнивает слова без учёта ё, регистра и окончаний', () => {
    const [a, b] = pickClues(
      record({ id: 'a', clues: [{ title: 'Три ангела', text: 'Слева отмечен ЗЕЛЁНЫЙ позём.' }] }),
      record({ id: 'b', clues: [{ title: 'Фон', text: 'Внизу зеленого позема нет.' }] }),
    );
    expect(a?.title).toBe('Три ангела');
    expect(b?.title).toBe('Фон');
  });

  it('без общих слов берёт наблюдение про тип или сюжет своей иконы', () => {
    const [a] = pickClues(
      record({
        id: 'a', subject: 'Богоматерь с Младенцем', type: 'Одигитрия',
        clues: [
          { title: 'Красные сапожки', text: 'Обувь стоит на полосе земли.' },
          { title: 'Жест Одигитрии', text: 'Правая рука обращена к Младенцу.' },
        ],
      }),
      record({ id: 'b', clues: [{ title: 'Ковчег', text: 'Углубление доски заметно по краю.' }] }),
    );
    expect(a?.title).toBe('Жест Одигитрии');
  });

  it('переживает паспорт без наблюдений', () => {
    expect(pickClues(record({ id: 'a' }), record({ id: 'b' }))).toEqual([undefined, undefined]);
  });
});

describe('задание под пару', () => {
  const make = (subject: string, type: string) => record({ id: subject + type, subject, type });

  it('различает общий сюжет, общий тип и разные образы', () => {
    expect(compareTask(make('Распятие', 'Створка складня'), make('Распятие', 'Рельеф')))
      .toMatch(/^Один сюжет/);
    expect(compareTask(make('Распятие', 'Икона праздничного чина'), make('Благовещение', 'Икона праздничного чина')))
      .toMatch(/^Один тип/);
    expect(compareTask(make('Распятие', 'Створка складня'), make('Архангел', 'Деисусный образ')))
      .toMatch(/^Разные образы/);
  });

  it('пустые поля не считает общим сюжетом', () => {
    expect(compareTask(record({ id: 'a' }), record({ id: 'b' }))).toMatch(/^Разные образы/);
  });
});
