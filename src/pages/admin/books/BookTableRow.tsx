/**
 * Строка таблицы книг
 */
import { type ChangeEvent } from 'react';
import { BOOK_STATUS_LABELS } from '../../../constants/books';
import type { BookListItem } from './types';

interface BookTableRowProps {
  book: BookListItem;
  // Upload
  uploadBookId: string | null;
  uploadProgress: number;
  onFileSelect: (bookId: string, e: ChangeEvent<HTMLInputElement>) => void;
  // Actions
  onStartIngestion: (bookId: string) => void;
  onToggleActive: (bookId: string) => void;
  onEdit: (book: BookListItem) => void;
  onDelete: (bookId: string) => void;
  // Loading states
  togglingBookId: string | null;
  deletingBookId: string | null;
}

export function BookTableRow({
  book,
  uploadBookId,
  uploadProgress,
  onFileSelect,
  onStartIngestion,
  onToggleActive,
  onEdit,
  onDelete,
  togglingBookId,
  deletingBookId,
}: BookTableRowProps) {
  return (
    <tr className="border-t border-border hover:bg-card2/50">
      <td className="px-4 py-3">
        <div className="font-medium">{book.title}</div>
        <div className="text-xs text-muted">
          {book.language.toUpperCase()}
          {book.year && ` • ${book.year}`}
        </div>
      </td>
      <td className="px-4 py-3 text-muted">
        {book.authors.slice(0, 2).join(', ')}
        {book.authors.length > 2 && ` +${book.authors.length - 2}`}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
            book.status === 'ready'
              ? 'bg-emerald-100 text-emerald-800'
              : book.status === 'processing'
                ? 'bg-amber-100 text-amber-800'
                : book.status === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
          }`}
        >
          {BOOK_STATUS_LABELS[book.status] || book.status}
        </span>
      </td>
      <td className="px-4 py-3 text-muted">{book.chunksCount ?? '—'}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          {/* Draft: show upload */}
          {book.status === 'draft' && (
            <label className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs cursor-pointer hover:bg-blue-200">
              {uploadBookId === book.id ? `${uploadProgress}%` : 'Загрузить PDF'}
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => onFileSelect(book.id, e)}
                className="sr-only"
                disabled={uploadBookId === book.id}
              />
            </label>
          )}

          {/* Uploaded: show start ingestion */}
          {book.status === 'uploaded' && (
            <button
              onClick={() => onStartIngestion(book.id)}
              className="px-3 py-1 bg-amber-100 text-amber-800 rounded text-xs hover:bg-amber-200"
            >
              Обработать
            </button>
          )}

          {/* Processing: show spinner */}
          {book.status === 'processing' && (
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded text-xs">
              Обработка...
            </span>
          )}

          {/* Error: show retry */}
          {book.status === 'error' && (
            <label className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs cursor-pointer hover:bg-blue-200">
              Загрузить снова
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => onFileSelect(book.id, e)}
                className="sr-only"
              />
            </label>
          )}

          {/* Ready: show active toggle */}
          {book.status === 'ready' && (
            <button
              onClick={() => onToggleActive(book.id)}
              disabled={togglingBookId === book.id}
              className={`px-3 py-1 rounded text-xs hover:opacity-80 transition disabled:opacity-50 ${
                book.active
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
              title={book.active ? 'Скрыть из поиска' : 'Показать в поиске'}
            >
              {togglingBookId === book.id ? '...' : book.active ? 'Активна' : 'Скрыта'}
            </button>
          )}

          {/* Edit button */}
          <button
            onClick={() => onEdit(book)}
            className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-xs hover:bg-slate-200"
            title="Редактировать метаданные"
          >
            Ред.
          </button>

          {/* Delete button */}
          <button
            onClick={() => onDelete(book.id)}
            disabled={deletingBookId === book.id}
            className="px-3 py-1 bg-red-100 text-red-800 rounded text-xs hover:bg-red-200 disabled:opacity-50"
            title="Удалить книгу и все данные"
          >
            {deletingBookId === book.id ? '...' : 'Удалить'}
          </button>
        </div>
      </td>
    </tr>
  );
}
