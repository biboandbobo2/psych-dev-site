/**
 * Паттерны кастомных хуков
 *
 * Из: docs/architecture/guidelines.md
 * Дата: 2026-01-08
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================
// 1. ХУКИ ДЛЯ ЗАГРУЗКИ ДАННЫХ
// ============================================================

// ❌ ПЛОХО: Логика загрузки дублируется в каждом компоненте
function TestsPageBad() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getPublishedTests()
      .then(setTests)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  // ... дублируется в Notes, Timeline, и т.д.
}

// ✅ ХОРОШО: Переиспользуемый хук
function useTests() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    getPublishedTests()
      .then(setTests)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { tests, loading, error };
}

// Использование
function TestsPageGood() {
  const { tests, loading, error } = useTests();

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  return <TestsList tests={tests} />;
}

// ============================================================
// 2. ОБОБЩЁННЫЙ ХУК ДЛЯ ЗАГРУЗКИ
// ============================================================

function useFetchData<T>(fetchFn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchFn()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [fetchFn]);

  return { data, loading, error };
}

// Использование с разными типами данных
function TestsPage() {
  const { data: tests, loading, error } = useFetchData(getPublishedTests);
  // ...
}

function NotesPage() {
  const { data: notes, loading, error } = useFetchData(getUserNotes);
  // ...
}

// ============================================================
// 3. ХУК С МУТАЦИЯМИ (CRUD)
// ============================================================

interface UseResourceResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  create: (item: Partial<T>) => Promise<void>;
  update: (id: string, updates: Partial<T>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function useResource<T extends { id: string }>(
  fetchFn: () => Promise<T[]>,
  createFn: (item: Partial<T>) => Promise<T>,
  updateFn: (id: string, updates: Partial<T>) => Promise<void>,
  deleteFn: (id: string) => Promise<void>
): UseResourceResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const items = await fetchFn();
      setData(items);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (item: Partial<T>) => {
    const newItem = await createFn(item);
    setData(prev => [...prev, newItem]);
  }, [createFn]);

  const update = useCallback(async (id: string, updates: Partial<T>) => {
    await updateFn(id, updates);
    setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, [updateFn]);

  const deleteItem = useCallback(async (id: string) => {
    await deleteFn(id);
    setData(prev => prev.filter(item => item.id !== id));
  }, [deleteFn]);

  return {
    data,
    loading,
    error,
    create,
    update,
    delete: deleteItem,
    refresh,
  };
}

// Использование
function NotesManager() {
  const {
    data: notes,
    loading,
    create,
    update,
    delete: deleteNote,
  } = useResource(
    () => getNotes(userId),
    createNote,
    updateNote,
    deleteNote
  );

  // Теперь есть полный CRUD из коробки
}

// ============================================================
// 4. ХУК ДЛЯ DEBOUNCE
// ============================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Использование для поиска
function SearchInput() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearchTerm) {
      // API вызов только после 500ms без изменений
      searchAPI(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />;
}

// ============================================================
// 5. ХУК ДЛЯ ЛОКАЛЬНОГО ХРАНИЛИЩА
// ============================================================

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading localStorage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting localStorage:', error);
    }
  }, [key]);

  return [storedValue, setValue];
}

// Использование
function ThemeSelector() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');

  return (
    <select value={theme} onChange={e => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}

// ============================================================
// 6. ХУК ДЛЯ PREVIOUS VALUE
// ============================================================

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// Использование для сравнения
function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>Now: {count}, Before: {prevCount}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

// ============================================================
// 7. ХУК ДЛЯ WINDOW SIZE
// ============================================================

interface WindowSize {
  width: number;
  height: number;
}

function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

// Использование для responsive UI
function ResponsiveComponent() {
  const { width } = useWindowSize();
  const isMobile = width < 768;

  return isMobile ? <MobileView /> : <DesktopView />;
}

// ============================================================
// 8. АНТИ-ПАТТЕРНЫ - НЕ ДЕЛАЙ ТАК
// ============================================================

// ❌ ПЛОХО: Хук который делает слишком много
function useEverything() {
  const [user, setUser] = useState(null);
  const [tests, setTests] = useState([]);
  const [notes, setNotes] = useState([]);
  const [timeline, setTimeline] = useState(null);
  // ... 20 useState
  // ... 30 useEffect
  // Это не хук, это God Object!
}

// ❌ ПЛОХО: Хук без useCallback для функций
function useBadHook() {
  const [data, setData] = useState([]);

  // Функция создаётся заново при каждом рендере!
  const updateData = (newData) => {
    setData(newData);
  };

  return { data, updateData };
}

// ✅ ХОРОШО: Используй useCallback
function useGoodHook() {
  const [data, setData] = useState([]);

  const updateData = useCallback((newData) => {
    setData(newData);
  }, []); // Стабильная ссылка

  return { data, updateData };
}
