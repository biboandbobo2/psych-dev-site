# 🏗️ Руководство по архитектуре проекта

> **Версия:** 2.0 (сокращенная)
> **Время чтения:** 20-25 минут
> **Статус:** Действующий стандарт
>
> **Полная версия с 94 примерами кода:** [../archive/legacy/ARCHITECTURE_GUIDELINES_FULL.md](../archive/legacy/ARCHITECTURE_GUIDELINES_FULL.md)

**Дата создания:** 2025-11-07
**Последнее обновление:** 2026-01-08

---

## 📋 Содержание

1. [Основные принципы](#основные-принципы)
2. [Правила размера файлов](#правила-размера-файлов)
3. [Структура проекта](#структура-проекта)
4. [Композиция компонентов](#композиция-компонентов)
5. [State Management](#state-management)
6. [Хуки (Custom Hooks)](#хуки-custom-hooks)
7. [Testing](#testing)
8. [Логирование и безопасность](#логирование-и-безопасность)
9. [Чеклист перед коммитом](#чеклист-перед-коммитом)

---

## Основные принципы

### 1. Single Responsibility Principle (SRP)

Каждый компонент/функция должна решать **одну задачу**.

```typescript
// ❌ ПЛОХО: Монолит на 956 строк
function AdminContentEdit() {
  // 50 useState, 30 функций, 200 строк JSX
}

// ✅ ХОРОШО: Композиция из маленьких компонентов
function AdminContentEdit() {
  const { content, updateContent } = useContent();
  return (
    <>
      <ContentHeader />
      <ContentForm content={content} onUpdate={updateContent} />
      <ContentPreview content={content} />
    </>
  );
}
```

**Подробные примеры:** [../examples/architecture/component-composition.tsx](../examples/architecture/component-composition.tsx)

### 2. Don't Repeat Yourself (DRY)

Извлекайте общую логику в переиспользуемые хуки и компоненты.

### 3. Composition over Inheritance

Используйте композицию компонентов вместо наследования.

---

## Правила размера файлов

### 🚦 Светофор размеров

| Строки | Статус | Действие |
|--------|--------|----------|
| **< 300** | 🟢 **Отлично** | Идеальный размер, продолжайте |
| **300-500** | 🟡 **Приемлемо** | Следите, не допускайте роста |
| **500-800** | 🟠 **Предупреждение** | Запланируйте рефакторинг |
| **> 800** | 🔴 **КРИТИЧНО** | Немедленно разбить! |

### Автоматическая проверка

```bash
# Найти все файлы > 500 строк
find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | awk '$1 > 500'

# Добавить в pre-commit hook
npm run check:file-sizes
```

**Исключения (разрешено > 500):**
- Типы и интерфейсы (`types.ts`)
- Константы и данные (`constants.ts`, `data/`)
- Конфигурация (`vite.config.js`)

---

## Структура проекта

### Текущая структура (функциональная)

```
src/
├── pages/           # Страницы-роуты
├── components/      # Переиспользуемые компоненты
├── hooks/           # Кастомные хуки
├── stores/          # Zustand stores
├── lib/             # Инфраструктура (Firebase, API)
├── utils/           # Вспомогательные функции
├── types/           # TypeScript типы
└── data/            # Статичные данные
```

### Рекомендуемая структура (по фичам)

```
src/
├── features/
│   ├── tests/
│   │   ├── components/      # Компоненты тестов
│   │   ├── hooks/           # useTests, useTestProgress
│   │   ├── utils/           # testChainHelpers
│   │   ├── types.ts         # Test, TestQuestion
│   │   └── index.ts         # Barrel export
│   ├── notes/
│   └── timeline/
├── shared/
│   ├── ui/                  # Button, Modal, Spinner
│   └── hooks/               # useDebounce, useLocalStorage
├── lib/                     # Firebase, API клиенты
└── types/                   # Глобальные типы
```

**Преимущества:**
- ✅ Чёткие границы фич
- ✅ Легко найти код
- ✅ Можно удалить фичу целиком
- ✅ Масштабируемость

### Правила организации

1. **Утилиты фичи** → `features/[feature]/utils/`
2. **Типы фичи** → `features/[feature]/types.ts`
3. **Общие типы** → `src/types/` (если используются в 2+ фичах)

---

## Композиция компонентов

### Паттерны композиции

**1. Базовая композиция** — разбиение на маленькие компоненты

**2. Render Props** — гибкая кастомизация через функцию

**3. Compound Components** — группа взаимосвязанных компонентов

**4. Higher-Order Components (HOC)** — используй с осторожностью, хуки обычно лучше

**Подробные примеры всех паттернов:** [../examples/architecture/component-composition.tsx](../examples/architecture/component-composition.tsx)

---

## State Management

### Zustand — наш выбор

**Почему Zustand, а не Context API?**
- ✅ Лучшая производительность (atomic селекторы)
- ✅ Redux DevTools integration
- ✅ Простота использования
- ✅ Persist middleware (localStorage)
- ✅ Меньше boilerplate

### Основные stores

```typescript
// src/stores/
useAuthStore        // user, roles, login/logout
useTestStore        // test progress, answers
useCourseStore      // current course selection (с persist)
```

### Базовый пример

```typescript
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
}

export const useCounterStore = create<CounterState>()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// Использование
function Counter() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  return <button onClick={increment}>{count}</button>;
}
```

### Оптимизация селекторов

```typescript
// ❌ ПЛОХО: Подписка на весь store
const store = useAuthStore();

// ✅ ХОРОШО: Atomic селекторы
const userName = useAuthStore((state) => state.user?.name);
const isLoading = useAuthStore((state) => state.isLoading);
```

**Подробные примеры:** [../examples/architecture/state-management.tsx](../examples/architecture/state-management.tsx)
- Persist (localStorage)
- DevTools integration
- Async actions
- Derived state
- Cross-store communication
- Reset all stores

---

## Хуки (Custom Hooks)

### Когда создавать хук?

**✅ Создай хук если:**
- Логика переиспользуется в 2+ компонентах
- Логика содержит useState/useEffect
- Нужно инкапсулировать сложную логику

**❌ НЕ создавай хук если:**
- Логика используется только в одном месте
- Это просто функция без состояния (используй utils/)

### Паттерны хуков

**1. Data Fetching**
```typescript
function useTests() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublishedTests().then(setTests).finally(() => setLoading(false));
  }, []);

  return { tests, loading };
}
```

**2. CRUD Operations**
```typescript
function useResource<T>(fetchFn, createFn, updateFn, deleteFn) {
  // ... полный CRUD с оптимистичными обновлениями
  return { data, loading, create, update, delete, refresh };
}
```

**3. Utility Hooks**
- `useDebounce` — debounce значений
- `useLocalStorage` — синхронизация с localStorage
- `usePrevious` — предыдущее значение
- `useWindowSize` — размеры окна

**Подробные примеры:** [../examples/architecture/hooks-patterns.ts](../examples/architecture/hooks-patterns.ts)

### Анти-паттерны

```typescript
// ❌ ПЛОХО: God Hook (делает слишком много)
function useEverything() {
  // 20 useState, 30 useEffect
}

// ❌ ПЛОХО: Функция без useCallback
function useBadHook() {
  const update = (data) => setData(data); // Создаётся заново!
  return { data, update };
}

// ✅ ХОРОШО: Стабильная ссылка
function useGoodHook() {
  const update = useCallback((data) => setData(data), []);
  return { data, update };
}
```

---

## Testing

### Unit Tests (Vitest)

**Тестируй:**
- ✅ Утилиты (`src/utils/*.test.ts`)
- ✅ Хуки (`src/hooks/__tests__/*.test.ts`)
- ✅ Чистые функции
- ✅ Бизнес-логику

**НЕ тестируй:**
- ❌ Trivial getters/setters
- ❌ Third-party библиотеки
- ❌ Простой JSX без логики

### Integration Tests

```bash
npm run test:integration
```

**Покрывают:**
- Firestore operations (эмуляторы)
- Auth flows
- CRUD workflows

### E2E Tests (Playwright)

```bash
npm run test:e2e:prod
```

**Тестовый URL:** https://psych-dev-site-git-red-background-alexey-zykovs-projects.vercel.app

**Smoke tests:**
- Авторизация
- Создание заметки
- Прохождение теста
- Добавление события в Timeline

**См. подробности:** [../development/testing-workflow.md](../development/testing-workflow.md)

---

## Логирование и безопасность

### Правила логирования

**❌ ЗАПРЕЩЕНО** в runtime-коде (`src/`, `api/`, `functions/src/`):
```typescript
console.log('Debug message');     // ESLint error + check-console fail
console.error('Error occurred');  // ESLint error + check-console fail
```

**✅ ПРАВИЛЬНО:**
```typescript
import { debugLog, debugError, debugWarn } from '@/lib/debug';

debugLog('[Tests] Loading test', testId);
debugError('Failed to save note', error);
debugWarn('Deprecated function called');
```

**Где `console.*` всё ещё допустим (без error):**
- Тесты (`tests/`, `**/*.test.{ts,tsx}`).
- CLI-скрипты (`scripts/`, `src/scripts/`).
- Сами debug-обёртки (`**/lib/debug.ts`).
- Dev-only export-debugging (`src/pages/timeline/utils/exporters/common.ts`).

**Whitelist для prod-error reporting** (узкое исключение, документированный паттерн):
если место — центральная точка ошибок и `debugError` молчит в проде → теряется
видимость в DevTools / Vercel logs. Сейчас задокументированы:
`api/assistant.ts` (catch Gemini), `src/lib/errorHandler.ts` (`reportAppError`).
Расширение whitelist'а требует трёх шагов: `eslint-disable no-console` с
комментарием *почему*, файл в `ALLOWED` set в `scripts/check-console.cjs`,
согласование в PR.

**Проверки:**
- `npm run check-console` — full-repo (входит в `validate` и pre-push).
- `npm run check-console:staged` — pre-commit, по staged-файлам (быстрый).
- `npm run lint` — ESLint c `no-console: error` для ts/tsx.

### Система ролей

```typescript
// src/stores/useAuthStore.ts
interface AuthState {
  user: User | null;
  isStudent: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

// Использование
function AdminPanel() {
  const isAdmin = useAuthStore((state) => state.isAdmin);

  if (!isAdmin) return <AccessDenied />;
  return <AdminContent />;
}
```

**Роли:**
- **Student** — базовый доступ
- **Admin** — редактирование контента курсов (по списку `adminEditableCourses`)
- **Super Admin** — управление пользователями, всегда включает все остальные роли

**Параллельный флаг (не значение `role`):**
- **Co-admin страниц DOM Academy** — доступ к редактору `/superadmin/pages*`
  (страница «О нас», страницы проектов). Хранится в `users/{uid}.coAdmin: boolean`
  + custom claim `coAdmin: true`. Может быть выдан поверх любой роли (admin или
  обычный пользователь) независимо. Назначается super-admin'ом через AdminUsers UI
  (кнопка «+ Добавить со-админа»). Лендинг: `/coadmin`. Cloud Functions:
  `makeUserCoAdmin` / `removeCoAdmin`.
- **Все функции, меняющие custom claims, делают merge** — чтобы добавление/снятие
  одной роли не затирало другие (`role` и `coAdmin` независимы).

---

## Чеклист перед коммитом

### 1. Код

- [ ] Файлы < 500 строк (или запланирован рефакторинг)
- [ ] Нет `console.*` (используй `debugLog`)
- [ ] Хуки имеют `useCallback` для функций
- [ ] Компоненты декомпозированы (SRP)
- [ ] Нет дублирования кода (DRY)

### 2. Типы

- [ ] Все TypeScript ошибки исправлены
- [ ] Нет `any` (или обосновано в комментарии)
- [ ] Интерфейсы экспортированы из `types.ts`

### 3. Тесты

- [ ] Новые утилиты покрыты unit-тестами
- [ ] Критичная логика протестирована
- [ ] `npm test` проходит

### 4. Валидация

```bash
# Быстрая проверка (5-10 сек)
npm run validate

# Полная проверка (15-30 сек)
npm run validate:full
```

**Автоматические hooks:**
- **Pre-commit:** lint + check-console + check:init
- **Pre-push:** validate (full validation)

### 5. Документация

- [ ] Обновил `docs/processes/qa-smoke-log.md` если тестировал
- [ ] Добавил задачи в `docs/processes/audit-backlog.md` если нужно
- [ ] Обновил соответствующий гайд если изменил архитектуру

---

## Инструменты автоматизации

### ESLint

```bash
npm run lint
```

**Конфигурация:** `eslint.config.js` (flat config, ESLint 9).

**Правила (актуальные):**
- ts/tsx — через `typescript-eslint` v8 (parser, без typed-rules для скорости).
- `no-console: error` для runtime-кода (см. раздел *Логирование* выше для overrides).
- `@typescript-eslint/no-unused-vars: warn` (legacy unused-vars в проекте — pre-existing,
  будут чиститься постепенно; varsIgnorePattern `^[A-Z_]`, argsIgnorePattern `^_`).
- `react-hooks` (recommended-latest), `react-refresh/only-export-components: warn`.
- `no-undef`, `no-redeclare` — выключены для ts (TypeScript делает это сам).

Ориентиры по размеру (компоненты ≤ 400 LoC, функции ≤ 50 строк) — это **soft-guideline
из CLAUDE.md**, ESLint их не enforce-ит. Контроль через ревью и периодические code-аудиты.

### Pre-commit hooks (.husky/pre-commit)

**Запускается при `git commit`:**
1. `npm run lint` — ESLint.
2. `npm run check-console:staged` — staged-файлы, быстрый.
3. `npm run check:init` — проверка инициализации модулей.

### Pre-push hooks (.husky/pre-push)

**Запускается при `git push`:**
1. `npm run validate` — `lint` + `check-console` (full-repo) + `check:init` +
   `check:functions-runtime` + `build`.

**Пропускать запрещено:** `--no-verify` не использовать (см. CLAUDE.md).

### Module initialization testing

```bash
npm run check:init
```

**Проверяет:** Все модули импортируются без side effects.

---

## Примеры кода

Детальные примеры с комментариями:

| Тема | Файл | Что внутри |
|------|------|------------|
| **Композиция компонентов** | [component-composition.tsx](../examples/architecture/component-composition.tsx) | Базовая композиция, Render Props, Compound Components, HOC |
| **Паттерны хуков** | [hooks-patterns.ts](../examples/architecture/hooks-patterns.ts) | Data fetching, CRUD, debounce, localStorage, previous value, window size |
| **State Management** | [state-management.tsx](../examples/architecture/state-management.tsx) | Zustand stores, persist, devtools, selectors, async actions, reset |

---

## Связанные документы

- 📘 [Обзор архитектуры](overview.md) — высокоуровневая архитектура
- 📐 [Принципы проектирования](principles.md) — краткий чеклист
- 🧪 [Testing Workflow](../development/testing-workflow.md) — процесс тестирования
- 🚀 [Quick Start](../QUICK_START.md) — быстрый старт для новичков

---

**Последнее обновление:** 2026-01-08
**Версия:** 2.0

**Полная версия:** [../archive/legacy/ARCHITECTURE_GUIDELINES_FULL.md](../archive/legacy/ARCHITECTURE_GUIDELINES_FULL.md)
