/**
 * Форма создания новой книги
 */
import { useState, type FormEvent } from 'react';
import { debugLog, debugError } from '../../../lib/debug';
import { BOOK_LANGUAGE_LABELS, BOOK_TAG_LABELS } from '../../../constants/books';
import type { BookLanguage, BookTag } from '../../../types/books';
import { apiCall } from './api';

interface BookCreateFormProps {
  onCreated: () => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export function BookCreateForm({ onCreated, onCancel, onError }: BookCreateFormProps) {
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [language, setLanguage] = useState<BookLanguage>('ru');
  const [year, setYear] = useState('');
  const [tags, setTags] = useState<BookTag[]>([]);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (creating) return;

    setCreating(true);

    try {
      const authorsList = authors
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      if (authorsList.length === 0) {
        throw new Error('Укажите хотя бы одного автора');
      }

      const data = await apiCall<{ bookId: string }>('/api/admin/books', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          title: title.trim(),
          authors: authorsList,
          language,
          year: year ? parseInt(year, 10) : undefined,
          tags,
        }),
      });

      debugLog('[BookCreateForm] Book created:', data.bookId);

      // Reset form
      setTitle('');
      setAuthors('');
      setLanguage('ru');
      setYear('');
      setTags([]);

      onCreated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create book';
      onError(msg);
      debugError('[BookCreateForm] Error:', e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-5 space-y-4"
    >
      <h2 className="text-lg font-semibold">Новая книга</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Название *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-accent/30"
            placeholder="Психология развития"
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
            placeholder="Выготский Л.С., Леонтьев А.Н."
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

        <div>
          <label className="block text-sm font-medium mb-1">Год издания</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            min="1800"
            max={new Date().getFullYear() + 1}
            className="w-full px-3 py-2 border border-border rounded-lg bg-card"
            placeholder="2020"
          />
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
          disabled={creating || !title.trim() || !authors.trim()}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {creating ? 'Создание...' : 'Создать'}
        </button>
      </div>
    </form>
  );
}
