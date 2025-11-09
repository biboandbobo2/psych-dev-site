import { formatEventAsNote } from '../formatEventAsNote';

describe('formatEventAsNote', () => {
  it('форматирует события со всеми полями', () => {
    const event = {
      age: 18,
      title: 'Поступил в университет',
      notes: 'Факультет психологии',
      sphere: 'education' as const,
    };

    const result = formatEventAsNote(event);

    expect(result.title).toBe(event.title);
    expect(result.content).toContain('18 лет');
    expect(result.content).toContain('Образование');
    expect(result.content).toContain('Факультет психологии');
    expect(result.ageRange).toBe('adolescence');
  });

  it('не добавляет раздел "Подробности" если notes пустые', () => {
    const event = {
      age: 25,
      title: 'Событие без заметок',
      notes: '',
    };

    const result = formatEventAsNote(event);
    expect(result.content).not.toContain('Подробности');
  });
});
