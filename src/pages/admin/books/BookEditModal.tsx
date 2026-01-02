/**
 * Модальное окно редактирования книги
 */
import { useState, useEffect, type FormEvent } from 'react';
import { debugLog, debugError } from '../../../lib/debug';
import { BOOK_LANGUAGE_LABELS, BOOK_TAG_LABELS } from '../../../constants/books';
import type { BookLanguage, BookTag } from '../../../types/books';
import type { BookListItem } from './types';
import { apiCall } from './api';

interface BookEditModalProps {
  book: BookListItem;
  onSaved: (updates: Partial<BookListItem>) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export function BookEditModal({ book, onSaved, onCancel, onError }: BookEditModalProps) {
  const [title, setTitle] = useState(book.title);
  const [authors, setAuthors] = useState(book.authors.join(', '));
  const [year, setYear] = useState(book.year?.toString() || '');
  const [language, setLanguage] = useState<BookLanguage>(book.language as BookLanguage);
  const [tags, setTags] = useState<BookTag[]>(book.tags as BookTag[]);
  const [saving, setSaving] = useState(false);

  // Reset form when book changes
  useEffect(() => {
    setTitle(book.title);
    setAuthors(book.authors.join(', '));
    setYear(book.year?.toString() || '');
    setLanguage(book.language as BookLanguage);
    setTags(book.tags as BookTag[]);
  }, [book]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);

    try {
      const authorsList = authors
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      if (authorsList.length === 0) {
        throw new Error('Укажите хотя бы одного автора');
      }

      await apiCall('/api/admin/books', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update',
          bookId: book.id,
          title: title.trim(),
          authors: authorsList,
          year: year ? parseInt(year, 10) : null,
          language,
          tags,
        }),
      });

      debugLog('[BookEditModal] Book updated:', book.id);

      onSaved({
        title: title.trim(),
        authors: authorsList,
        year: year ? parseInt(year, 10) : null,
        language,
        tags,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update book';
      onError(msg);
      debugError('[BookEditModal] Error:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg mx-4 rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xl"
      >
        <h2 className="text-lg font-semibold">Редактирование книги</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Авторы * (через запятую)</label>
            <input
              type="text"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Год издания</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min="1800"
                max={new Date().getFullYear() + 1}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Язык</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as BookLanguage)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card"
              >
                {Object.entries(BOOK_LANGUAGE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Теги</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(BOOK_TAG_LABELS) as [BookTag, string][]).map(([tag, label]) => (
                <label
                  key={tag}
                  className={`px-3 py-1 rounded-full text-sm cursor-pointer transition ${
                    tags.includes(tag)
                      ? 'bg-accent text-white'
                      : 'bg-card2 text-muted hover:bg-card2/80'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={tags.includes(tag)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTags([...tags, tag]);
                      } else {
                        setTags(tags.filter((t) => t !== tag));
                      }
                    }}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-border rounded-lg hover:bg-card2"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim() || !authors.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}
