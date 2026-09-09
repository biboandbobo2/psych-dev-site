import { describe, expect, it } from 'vitest';
import type { Note } from '../../types/notes';
import { generateNotesMarkdown, generateNotesText } from '../notesExport';

const base: Note = {
  id: 'n1',
  userId: 'u1',
  title: 'Мысли',
  content: 'Обычный текст',
  ageRange: null,
  periodId: 'smoke-dev-1',
  periodTitle: 'Младенчество',
  courseId: 'development',
  noteScope: 'manual',
  topicId: null,
  createdAt: new Date('2026-09-01T10:00:00Z'),
  updatedAt: new Date('2026-09-01T10:00:00Z'),
};

const lecture: Note = {
  ...base,
  id: 'n2',
  title: 'Лекция 1',
  noteScope: 'lecture',
  content: 'Тезис один\n\nТезис два',
  lectureSegments: [
    { id: 's1', startMs: 65000, text: 'Тезис один' },
    { id: 's2', startMs: null, text: 'Тезис два' },
  ],
};

describe('notesExport', () => {
  it('группирует по названию занятия, а не по id', () => {
    const md = generateNotesMarkdown([base]);
    expect(md).toContain('## Младенчество');
    expect(md).not.toContain('SMOKE-DEV-1');
    expect(generateNotesText([base])).toContain('[Младенчество]');
  });

  it('конспект лекции экспортируется с таймкодами', () => {
    const md = generateNotesMarkdown([lecture]);
    expect(md).toContain('[01:05] Тезис один');
    expect(md).toContain('\n\nТезис два');
  });
});
