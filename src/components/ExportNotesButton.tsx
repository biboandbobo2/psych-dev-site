import { useCallback, useMemo, useRef, useState } from 'react';
import type { Note } from '../types/notes';
import { generateNotesMarkdown, generateNotesText, downloadPlainText } from '../utils/notesExport';
import { useClickOutside } from '../hooks/useClickOutside';

interface ExportNotesButtonProps {
  notes: Note[];
}

export function ExportNotesButton({ notes }: ExportNotesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => setIsOpen(false), []);
  useClickOutside(dropdownRef, closeDropdown, isOpen);

  const filenameBase = useMemo(() => new Date().toISOString().split('T')[0], []);

  const handleExport = (format: 'markdown' | 'txt') => {
    const content = format === 'markdown' ? generateNotesMarkdown(notes) : generateNotesText(notes);
    const filename = `notes-${filenameBase}.${format === 'markdown' ? 'md' : 'txt'}`;
    downloadPlainText(content, filename);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={!notes.length}
        title={notes.length ? undefined : 'Нет заметок для экспорта'}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-fg shadow-sm transition hover:bg-card2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span>💾</span>
        <span>Экспорт</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`h-4 w-4 text-muted transition ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8l4 4 4-4" />
        </svg>
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
