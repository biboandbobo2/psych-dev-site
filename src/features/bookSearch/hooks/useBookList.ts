/**
 * Хук для загрузки списка доступных книг
 */
import { useState, useEffect, useCallback } from 'react';
import { debugLog, debugError } from '../../../lib/debug';

export interface BookListItem {
  id: string;
  title: string;
  authors: string[];
  language: string;
  year: number | null;
  tags: string[];
}

interface UseBookListReturn {
  books: BookListItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBookList(): UseBookListReturn {
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/books/list');
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to load books');
      }

      setBooks(data.books);
      debugLog('[useBookList] Loaded', data.books.length, 'books');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load books';
      setError(msg);
      debugError('[useBookList] Error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { books, loading, error, refresh };
}
