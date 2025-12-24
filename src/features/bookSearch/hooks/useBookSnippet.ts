/**
 * Хук для загрузки длинной цитаты
 */
import { useState, useCallback } from 'react';
import { debugLog, debugError } from '../../../lib/debug';

export interface SnippetData {
  text: string;
  bookTitle: string;
  pageStart: number;
  pageEnd: number;
  chapterTitle?: string;
}

interface UseBookSnippetReturn {
  loading: boolean;
  data: SnippetData | null;
  error: string | null;
  loadSnippet: (chunkId: string, maxChars?: number) => Promise<void>;
  clear: () => void;
}

export function useBookSnippet(): UseBookSnippetReturn {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SnippetData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSnippet = useCallback(async (chunkId: string, maxChars: number = 5000) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/books?action=snippet&chunkId=${chunkId}&maxChars=${maxChars}`);
      const result = await res.json();

      if (!result.ok) {
        throw new Error(result.error || 'Failed to load snippet');
      }

      setData({
        text: result.text,
        bookTitle: result.bookTitle,
        pageStart: result.pageStart,
        pageEnd: result.pageEnd,
        chapterTitle: result.chapterTitle,
      });

      debugLog('[useBookSnippet] Loaded snippet:', result.text.length, 'chars');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load snippet';
      setError(msg);
      debugError('[useBookSnippet] Error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { loading, data, error, loadSnippet, clear };
}
