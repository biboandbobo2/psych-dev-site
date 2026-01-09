/**
 * Примеры State Management с Zustand
 *
 * Из: docs/architecture/guidelines.md
 * Дата: 2026-01-08
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================================
// 1. БАЗОВЫЙ ZUSTAND STORE
// ============================================================

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));

// Использование в компоненте
function Counter() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+1</button>
    </div>
  );
}

// ============================================================
// 2. STORE С PERSIST (LOCALSTORAGE)
// ============================================================

interface ThemeState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),
    }),
    {
      name: 'theme-storage', // ключ в localStorage
    }
  )
);

// ============================================================
// 3. STORE С DEVTOOLS
// ============================================================

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authAPI.login(email, password);
          set({ user, isLoading: false });
        } catch (error) {
          set({ error: error as Error, isLoading: false });
        }
      },

      logout: () => {
        authAPI.logout();
        set({ user: null });
      },

      refresh: async () => {
        try {
          const user = await authAPI.getCurrentUser();
          set({ user });
        } catch (error) {
          set({ error: error as Error });
        }
      },
    }),
    { name: 'AuthStore' } // Имя в Redux DevTools
  )
);

// ============================================================
// 4. КОМБИНАЦИЯ PERSIST + DEVTOOLS
// ============================================================

interface CourseState {
  currentCourse: 'development' | 'clinical' | 'general';
  setCurrentCourse: (course: CourseState['currentCourse']) => void;
}

export const useCourseStore = create<CourseState>()(
  devtools(
    persist(
      (set) => ({
        currentCourse: 'development',
        setCurrentCourse: (course) => set({ currentCourse: course }),
      }),
      {
        name: 'course-storage',
      }
    ),
    { name: 'CourseStore' }
  )
);

// ============================================================
// 5. SELECTOR OPTIMIZATION
// ============================================================

// ❌ ПЛОХО: Компонент ререндерится при любом изменении store
function BadComponent() {
  const store = useAuthStore(); // Подписка на весь store!

  return <div>{store.user?.name}</div>;
}

// ✅ ХОРОШО: Подписка только на нужное поле
function GoodComponent() {
  const userName = useAuthStore((state) => state.user?.name);

  return <div>{userName}</div>;
}

// ✅ ЕЩЁ ЛУЧШЕ: Atomic селекторы для множественных полей
function OptimizedComponent() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) return <Spinner />;
  return <div>{user?.name}</div>;
}

// ============================================================
// 6. DERIVED STATE (ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ)
// ============================================================

interface TodosState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  setFilter: (filter: TodosState['filter']) => void;
}

export const useTodosStore = create<TodosState>()((set) => ({
  todos: [],
  filter: 'all',

  addTodo: (text) =>
    set((state) => ({
      todos: [...state.todos, { id: Date.now().toString(), text, completed: false }],
    })),

  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    })),

  setFilter: (filter) => set({ filter }),
}));

// Селектор для фильтрованных todos (мемоизация через useMemo в компоненте)
function TodoList() {
  const todos = useTodosStore((state) => state.todos);
  const filter = useTodosStore((state) => state.filter);

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter((t) => !t.completed);
      case 'completed':
        return todos.filter((t) => t.completed);
      default:
        return todos;
    }
  }, [todos, filter]);

  return (
    <ul>
      {filteredTodos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}

// ============================================================
// 7. ASYNC ACTIONS С ERROR HANDLING
// ============================================================

interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  fetch: () => Promise<void>;
  clear: () => void;
}

function createDataStore<T>(fetchFn: () => Promise<T>) {
  return create<DataState<T>>()(
    devtools((set) => ({
      data: null,
      loading: false,
      error: null,

      fetch: async () => {
        set({ loading: true, error: null });
        try {
          const data = await fetchFn();
          set({ data, loading: false });
        } catch (error) {
          set({ error: error as Error, loading: false });
        }
      },

      clear: () => set({ data: null, error: null }),
    }))
  );
}

// Использование фабрики
const useTestsStore = createDataStore<Test[]>(getPublishedTests);
const useNotesStore = createDataStore<Note[]>(getUserNotes);

// ============================================================
// 8. MIDDLEWARE - ЛОГИРОВАНИЕ
// ============================================================

const logMiddleware = (config) => (set, get, api) =>
  config(
    (...args) => {
      console.log('  Applying:', args);
      set(...args);
      console.log('  New state:', get());
    },
    get,
    api
  );

// Использование
const useDebugStore = create(
  logMiddleware((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  }))
);

// ============================================================
// 9. РАЗДЕЛЕНИЕ STORES (ЛУЧШИЙ ПАТТЕРН)
// ============================================================

// ❌ ПЛОХО: Один giant store для всего
const useGiantStore = create((set) => ({
  // Auth
  user: null,
  login: () => {},
  logout: () => {},

  // Tests
  tests: [],
  loadTests: () => {},

  // Notes
  notes: [],
  loadNotes: () => {},

  // Timeline
  timeline: {},
  updateTimeline: () => {},

  // ... 100500 полей
}));

// ✅ ХОРОШО: Маленькие фокусированные stores
const useAuthStore = create(/* auth logic */);
const useTestsStore = create(/* tests logic */);
const useNotesStore = create(/* notes logic */);
const useTimelineStore = create(/* timeline logic */);

// Использование
function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const tests = useTestsStore((state) => state.tests);
  const notes = useNotesStore((state) => state.notes);

  // Каждый store независим, легко тестировать и поддерживать
}

// ============================================================
// 10. CROSS-STORE COMMUNICATION
// ============================================================

// Если один store должен реагировать на изменения другого
const useTestProgressStore = create((set) => ({
  progress: {},

  updateProgress: (testId: string, score: number) => {
    set((state) => ({
      progress: {
        ...state.progress,
        [testId]: score,
      },
    }));

    // Подписаться на изменения другого store
    const user = useAuthStore.getState().user;
    if (user) {
      // Save to backend
      saveTestProgress(user.id, testId, score);
    }
  },
}));

// ============================================================
// 11. RESET ALL STORES (ПРИ LOGOUT)
// ============================================================

export function resetAllStores() {
  useAuthStore.setState({ user: null });
  useTestsStore.setState({ tests: [], loading: false });
  useNotesStore.setState({ notes: [] });
  useCourseStore.setState({ currentCourse: 'development' });
}

// Использование при logout
function logout() {
  resetAllStores();
  navigate('/login');
}
