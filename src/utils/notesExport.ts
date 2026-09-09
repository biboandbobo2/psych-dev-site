import { buildTimestampedLectureContent, type Note } from '../types/notes';

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
    const key = note.periodTitle ?? note.periodId ?? note.ageRange ?? 'Без занятия';
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {});

/** Конспект лекции экспортируется с таймкодами, обычная заметка — как есть. */
const getExportContent = (note: Note) =>
  note.noteScope === 'lecture' && note.lectureSegments?.length
    ? buildTimestampedLectureContent(note.lectureSegments)
    : note.content;

export function generateNotesMarkdown(notes: Note[]): string {
  const date = formatNoteDate(new Date());
  let md = `# Мои заметки\n\n`;
  md += `**Экспортировано:** ${date}\n\n`;
  md += `**Всего заметок:** ${notes.length}\n\n---\n\n`;

  const grouped = groupNotesByPeriod(notes);
  for (const [title, periodNotes] of Object.entries(grouped)) {
    md += `## ${title}\n\n`;
    periodNotes.forEach((note) => {
      md += `### ${note.title || 'Без названия'}\n\n`;
      md += `**Дата создания:** ${formatNoteDate(note.createdAt)}\n\n`;
      if (note.topicTitle) md += `**Тема:** ${note.topicTitle}\n\n`;
      md += `${getExportContent(note) || '_Описание отсутствует_'}\n\n`;
      md += `---\n\n`;
    });
  }

  md += `\n_Экспортировано из DOM Academy_\n`;
  return md;
}

export function generateNotesText(notes: Note[]): string {
  const date = formatNoteDate(new Date());
  let txt = `МОИ ЗАМЕТКИ ПО ДЕТСКОЙ ПСИХОЛОГИИ\n`;
  txt += `Экспортировано: ${date}\n`;
  txt += `Всего заметок: ${notes.length}\n\n`;
  txt += `${'='.repeat(60)}\n\n`;

  const grouped = groupNotesByPeriod(notes);
  for (const [title, periodNotes] of Object.entries(grouped)) {
    txt += `[${title}]\n\n`;
    periodNotes.forEach((note) => {
      txt += `Заголовок: ${note.title || 'Без названия'}\n`;
      txt += `Дата: ${formatNoteDate(note.createdAt)}\n`;
      if (note.topicTitle) txt += `Тема: ${note.topicTitle}\n`;
      txt += `\n${getExportContent(note) || '(Описание отсутствует)'}\n\n`;
      txt += `${'='.repeat(60)}\n\n`;
    });
  }

  txt += `Экспортировано из DOM Academy\n`;
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
