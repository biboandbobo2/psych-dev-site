/**
 * Компонент выбора книг для поиска
 */
import { useBookList, type BookListItem } from '../hooks/useBookList';
import { BOOK_LANGUAGE_LABELS } from '../../../constants/books';
import type { BookLanguage } from '../../../types/books';

interface BookSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxBooks: number;
}

export function BookSelector({ selectedIds, onChange, maxBooks }: BookSelectorProps) {
  const { books, loading, error } = useBookList();

  const handleToggle = (bookId: string) => {
    if (selectedIds.includes(bookId)) {
      onChange(selectedIds.filter((id) => id !== bookId));
    } else if (selectedIds.length < maxBooks) {
      onChange([...selectedIds, bookId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === books.length) {
      onChange([]);
    } else {
      onChange(books.slice(0, maxBooks).map((b) => b.id));
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-muted py-2">
        Загрузка списка книг...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 py-2">
        Ошибка: {error}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="text-sm text-muted py-2">
        Нет доступных книг для поиска
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Выбрано: {selectedIds.length}/{maxBooks}
        </span>
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-xs text-accent hover:underline"
        >
          {selectedIds.length === books.length ? 'Снять всё' : 'Выбрать все'}
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border p-2 bg-card">
        {books.map((book) => (
          <BookItem
            key={book.id}
            book={book}
            selected={selectedIds.includes(book.id)}
            disabled={!selectedIds.includes(book.id) && selectedIds.length >= maxBooks}
            onToggle={() => handleToggle(book.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface BookItemProps {
  book: BookListItem;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function BookItem({ book, selected, disabled, onToggle }: BookItemProps) {
  return (
    <label
      className={`flex items-start gap-2 p-2 rounded cursor-pointer transition ${
        selected
          ? 'bg-emerald-50 border border-emerald-200'
          : disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-card2'
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={disabled}
        onChange={onToggle}
        className="mt-1 rounded border-border text-emerald-600 focus:ring-emerald-500"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{book.title}</div>
        <div className="text-xs text-muted truncate">
          {book.authors.slice(0, 2).join(', ')}
          {book.authors.length > 2 && ` +${book.authors.length - 2}`}
          {book.year && ` (${book.year})`}
        </div>
      </div>
      <span className="text-xs text-muted uppercase">
        {BOOK_LANGUAGE_LABELS[book.language as BookLanguage] || book.language}
      </span>
    </label>
  );
}
