import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthProvider';
import { debugLog, debugError } from '../lib/debug';

// === ТИПЫ ===
export type SearchHistoryType = 'content' | 'research' | 'ai_chat' | 'book_rag';

// Упрощённый результат поиска для хранения в истории
export interface SearchResultItem {
  title: string;
  url?: string;
  year?: number | null;
  authors?: string;
}

export interface SearchHistoryEntry {
  id: string;
  userId: string;
  type: SearchHistoryType;
  query: string;
  createdAt: Date;
  resultsCount?: number;
  hasAnswer?: boolean;
  selectedBooks?: string[];
  aiResponse?: string; // Ответ AI для ai_chat и book_rag
  searchResults?: SearchResultItem[]; // Результаты поиска для research
}

interface SaveSearchParams {
  type: SearchHistoryType;
  query: string;
  resultsCount?: number;
  hasAnswer?: boolean;
  selectedBooks?: string[];
  aiResponse?: string;
  searchResults?: SearchResultItem[];
}

// === КОНСТАНТЫ ===
const HISTORY_LIMIT = 50; // максимум записей для загрузки
const MIN_QUERY_LENGTH = 2; // минимальная длина запроса для сохранения
const DEDUPE_WINDOW_MS = 60_000; // не сохранять дубли в течение 1 минуты

// === ХУК ===
export function useSearchHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка истории с real-time обновлениями
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    debugLog('[useSearchHistory] Starting listener for user:', user.uid);

    // Простой запрос без orderBy — не требует индекса
    const historyQuery = query(
      collection(db, 'searchHistory'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      historyQuery,
      (snapshot) => {
        const data = snapshot.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              userId: d.userId,
              type: d.type as SearchHistoryType,
              query: d.query,
              createdAt: d.createdAt?.toDate?.() || new Date(),
              resultsCount: d.resultsCount,
              hasAnswer: d.hasAnswer,
              selectedBooks: d.selectedBooks,
              aiResponse: d.aiResponse,
              searchResults: d.searchResults,
            } as SearchHistoryEntry;
          })
          // Сортировка на клиенте (новые первыми)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          // Ограничиваем количество
          .slice(0, HISTORY_LIMIT);

        debugLog('[useSearchHistory] Loaded entries:', data.length);
        setEntries(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        debugError('[useSearchHistory] Error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Группировка по типам для UI
  const entriesByType = useMemo(() => {
    const grouped: Record<SearchHistoryType, SearchHistoryEntry[]> = {
      content: [],
      research: [],
      ai_chat: [],
      book_rag: [],
    };

    entries.forEach((entry) => {
      grouped[entry.type].push(entry);
    });

    return grouped;
  }, [entries]);

  // Сохранение нового поискового запроса
  const saveSearch = useCallback(
    async (params: SaveSearchParams) => {
      if (!user) return;
      if (params.query.trim().length < MIN_QUERY_LENGTH) return;

      // Дедупликация: проверяем, не было ли такого же запроса недавно
      const recentDuplicate = entries.find(
        (e) =>
          e.type === params.type &&
          e.query.toLowerCase() === params.query.toLowerCase() &&
          Date.now() - e.createdAt.getTime() < DEDUPE_WINDOW_MS
      );

      if (recentDuplicate) {
        debugLog('[useSearchHistory] Skipping duplicate:', params.query);
        return;
      }

      try {
        await addDoc(collection(db, 'searchHistory'), {
          userId: user.uid,
          type: params.type,
          query: params.query.trim(),
          createdAt: serverTimestamp(),
          ...(params.resultsCount !== undefined && { resultsCount: params.resultsCount }),
          ...(params.hasAnswer !== undefined && { hasAnswer: params.hasAnswer }),
          ...(params.selectedBooks && { selectedBooks: params.selectedBooks }),
          ...(params.aiResponse && { aiResponse: params.aiResponse }),
          ...(params.searchResults && params.searchResults.length > 0 && { searchResults: params.searchResults }),
        });
        debugLog('[useSearchHistory] Saved search:', params.type, params.query);
      } catch (err) {
        debugError('[useSearchHistory] Failed to save:', err);
      }
    },
    [user, entries]
  );

  // Удаление одной записи
  const deleteEntry = useCallback(
    async (entryId: string) => {
      if (!user) return;

      try {
        await deleteDoc(doc(db, 'searchHistory', entryId));
        debugLog('[useSearchHistory] Deleted entry:', entryId);
      } catch (err) {
        debugError('[useSearchHistory] Failed to delete:', err);
      }
    },
    [user]
  );

  // Очистка всей истории
  const clearHistory = useCallback(async () => {
    if (!user) return;

    try {
      const historyQuery = query(
        collection(db, 'searchHistory'),
        where('userId', '==', user.uid)
      );

      const snapshot = await getDocs(historyQuery);

      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.delete(doc(db, 'searchHistory', docSnap.id));
      });

      await batch.commit();
      debugLog('[useSearchHistory] Cleared all history');
    } catch (err) {
      debugError('[useSearchHistory] Failed to clear history:', err);
    }
  }, [user]);

  return {
    entries,
    entriesByType,
    loading,
    error,
    saveSearch,
    deleteEntry,
    clearHistory,
    hasHistory: entries.length > 0,
  };
}
