import type { Note } from '../types/notes';

const formatNoteDate = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const groupNotesByPeriod = (notes: Note[]) =>
  notes.reduce<Record<string, Note[]>>((acc, note) => {
    const key = note.periodId ?? note.ageRange ?? 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {});

export function generateNotesMarkdown(notes: Note[]): string {
  const date = formatNoteDate(new Date());
  let md = `# Мои заметки\n\n`;
  md += `**Экспортировано:** ${date}\n\n`;
  md += `**Всего заметок:** ${notes.length}\n\n---\n\n`;

  const grouped = groupNotesByPeriod(notes);
  for (const [periodId, periodNotes] of Object.entries(grouped)) {
    const title = periodId.toUpperCase();
    md += `## ${title}\n\n`;
    periodNotes.forEach((note) => {
      md += `### ${note.title || 'Без названия'}\n\n`;
      md += `**Дата создания:** ${formatNoteDate(note.createdAt)}\n\n`;
      if (note.topicTitle) md += `**Тема:** ${note.topicTitle}\n\n`;
      md += `${note.content || '_Описание отсутствует_'}\n\n`;
      md += `---\n\n`;
    });
  }

  md += `\n_Экспортировано из Psych Dev Site_\n`;
  return md;
}

export function generateNotesText(notes: Note[]): string {
  const date = formatNoteDate(new Date());
  let txt = `МОИ ЗАМЕТКИ ПО ДЕТСКОЙ ПСИХОЛОГИИ\n`;
  txt += `Экспортировано: ${date}\n`;
  txt += `Всего заметок: ${notes.length}\n\n`;
  txt += `${'='.repeat(60)}\n\n`;

  const grouped = groupNotesByPeriod(notes);
  for (const [periodId, periodNotes] of Object.entries(grouped)) {
    const title = periodId.toUpperCase();
    txt += `[${title}]\n\n`;
    periodNotes.forEach((note) => {
      txt += `Заголовок: ${note.title || 'Без названия'}\n`;
      txt += `Дата: ${formatNoteDate(note.createdAt)}\n`;
      if (note.topicTitle) txt += `Тема: ${note.topicTitle}\n`;
      txt += `\n${note.content || '(Описание отсутствует)'}\n\n`;
      txt += `${'='.repeat(60)}\n\n`;
    });
  }

  txt += `Экспортировано из Psych Dev Site\n`;
  return txt;
}

export function downloadPlainText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
