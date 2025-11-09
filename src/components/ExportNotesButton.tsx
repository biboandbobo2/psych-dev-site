import { useEffect, useMemo, useRef, useState } from 'react';
import type { Note } from '../types/notes';
import { generateNotesMarkdown, generateNotesText, downloadPlainText } from '../utils/notesExport';

interface ExportNotesButtonProps {
  notes: Note[];
}

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

    const content = format === 'markdown' ? generateNotesMarkdown(notes) : generateNotesText(notes);
    const filename = `notes-${filenameBase}.${format === 'markdown' ? 'md' : 'txt'}`;
    downloadPlainText(content, filename);
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
