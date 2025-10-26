import { useEffect, useMemo, useRef, useState } from 'react';
import type { Note } from '../types/notes';
import { PERIOD_CONFIG } from '../utils/periodConfig';

interface ExportNotesButtonProps {
  notes: Note[];
}

const formatNoteDate = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const groupNotesByPeriod = (notes: Note[]) => {
  return notes.reduce<Record<string, Note[]>>((acc, note) => {
    const key = note.periodId ?? note.ageRange ?? 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {});
};

const generateMarkdown = (notes: Note[]): string => {
  const date = formatNoteDate(new Date());
  let md = `# Мои заметки\n\n`;
  md += `**Экспортировано:** ${date}\n\n`;
  md += `**Всего заметок:** ${notes.length}\n\n---\n\n`;

  const grouped = groupNotesByPeriod(notes);
  for (const [periodId, periodNotes] of Object.entries(grouped)) {
    const meta = PERIOD_CONFIG[periodId as keyof typeof PERIOD_CONFIG] ?? PERIOD_CONFIG.other;
    md += `## ${meta.icon} ${meta.title}\n\n`;
    periodNotes.forEach((note) => {
      md += `### ${note.title || 'Без названия'}\n\n`;
      md += `**Дата создания:** ${formatNoteDate(note.createdAt)}\n\n`;
      if (note.topicTitle) {
        md += `**Тема:** ${note.topicTitle}\n\n`;
      }
      md += `${note.content || '_Описание отсутствует_'}\n\n`;
      md += `---\n\n`;
    });
  }

  md += `\n_Экспортировано из Psych Dev Site_\n`;
  return md;
};

const generateTxt = (notes: Note[]): string => {
  const date = formatNoteDate(new Date());
  let txt = `МОИ ЗАМЕТКИ ПО ДЕТСКОЙ ПСИХОЛОГИИ\n`;
  txt += `Экспортировано: ${date}\n`;
  txt += `Всего заметок: ${notes.length}\n\n`;
  txt += `${'='.repeat(60)}\n\n`;

  const grouped = groupNotesByPeriod(notes);
  for (const [periodId, periodNotes] of Object.entries(grouped)) {
    const meta = PERIOD_CONFIG[periodId as keyof typeof PERIOD_CONFIG] ?? PERIOD_CONFIG.other;
    txt += `[${meta.title?.toUpperCase()}]\n\n`;
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
};

const downloadFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export function ExportNotesButton({ notes }: ExportNotesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const filenameBase = useMemo(() => new Date().toISOString().split('T')[0], []);

  const handleExport = (format: 'markdown' | 'txt') => {
    if (!notes.length) {
      alert('Нет заметок для экспорта');
      return;
    }

    const content = format === 'markdown' ? generateMarkdown(notes) : generateTxt(notes);
    const filename = `notes-${filenameBase}.${format === 'markdown' ? 'md' : 'txt'}`;
    downloadFile(content, filename);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-fg shadow-sm transition hover:bg-card2"
      >
        <span>💾</span>
        <span className="hidden sm:inline">Экспорт</span>
        <span className="text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-30 mt-2 w-full min-w-[14rem] rounded-xl border border-border bg-card shadow-xl">
          <div className="p-3 text-sm text-muted">
            Экспорт заметок ({notes.length})
          </div>
          <div className="divide-y">
            <button
              onClick={() => handleExport('markdown')}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-card2"
            >
              <span className="text-lg">📝</span>
              <div>
                <p className="font-medium text-fg">Markdown (.md)</p>
                <p className="text-xs text-muted">Файл с форматированием</p>
              </div>
            </button>
            <button
              onClick={() => handleExport('txt')}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-card2"
            >
              <span className="text-lg">📄</span>
              <div>
                <p className="font-medium text-fg">Текст (.txt)</p>
                <p className="text-xs text-muted">Простой текстовый файл</p>
              </div>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
