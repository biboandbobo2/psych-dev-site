import type { EdgeT } from '../../types';
import { parseBulkEventsText, validateBulkEvents } from '../parseBulkEvents';

describe('parseBulkEventsText', () => {
  it('парсит валидные строки', () => {
    const text = `18, Поступил в университет\n22.5: Первая работа\n30; Переезд в другой город`;
    const entries = parseBulkEventsText(text);
    const validEntries = entries.filter((entry) => entry.error === null);

    expect(validEntries).toHaveLength(3);
    expect(validEntries[0]).toMatchObject({ age: 18, label: 'Поступил в университет' });
    expect(validEntries[1]).toMatchObject({ age: 22.5, label: 'Первая работа' });
    expect(validEntries[2]).toMatchObject({ age: 30, label: 'Переезд в другой город' });
  });

  it('проверяет обращения без разделителя', () => {
    const entries = parseBulkEventsText('10 Плохой формат');
    expect(entries).toHaveLength(1);
    expect(entries[0].error).toContain('Нет разделителя');
  });
});

describe('validateBulkEvents', () => {
  it('находит некорректный возраст вне диапазона', () => {
    const entries = parseBulkEventsText('18, Хорошо\n150, Слишком стар');
    const validEntries = entries.filter((entry) => entry.error === null);
    const validation = validateBulkEvents(validEntries, 100, null);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Строка 2: Возраст 150 должен быть между 0 и 100');
  });

  it('отмечает необходимость продления ветки', () => {
    const edge: EdgeT = { id: '1', x: 2000, startAge: 5, endAge: 15, color: '#000', nodeId: 'node' };
    const entries = parseBulkEventsText('10, На ветке\n20, За пределами ветки');
    const validEntries = entries.filter((entry) => entry.error === null);
    const validation = validateBulkEvents(validEntries, 40, edge);

    expect(validation.needsExtension).toBe(true);
    expect(validation.maxRequiredAge).toBe(20);
  });
});
