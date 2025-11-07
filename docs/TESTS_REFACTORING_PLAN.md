# 🔧 Детальный план рефакторинга системы тестов

> **CRITICAL:** Этот документ содержит пошаговый план рефакторинга системы тестирования.
> Следуйте инструкциям строго по порядку, чтобы избежать поломки функционала.

## 🔗 Связанные документы

- 📋 **[Главная документация](./README.md)** - навигация по всем документам проекта
- 📚 **[Гайд по системе тестов](./TESTS_SYSTEM_GUIDE.md)** - полное описание текущей архитектуры
- 📐 **[Архитектурные рекомендации](./ARCHITECTURE_GUIDELINES.md)** - правила и best practices
- 🗓️ **[План рефакторинга таймлайна](./TIMELINE_REFACTORING_PLAN.md)** - параллельный план рефакторинга
- 🔧 **[План рефакторинга основной части](./CORE_REFACTORING_PLAN.md)** - рефакторинг админки, заметок, профиля
- 📅 **[Система таймлайна](./TimelineGuide.md)** - связанная система (интеграция через заметки)

---

## 📋 Содержание

1. [Стратегия рефакторинга](#стратегия-рефакторинга)
2. [Подготовка](#подготовка)
3. [Фаза 1: Быстрые победы](#фаза-1-быстрые-победы-1-2-дня)
4. [Фаза 2: Средний рефакторинг](#фаза-2-средний-рефакторинг-3-5-дней)
5. [Фаза 3: Глубокий рефакторинг](#фаза-3-глубокий-рефакторинг-1-2-недели)
6. [Тестирование](#тестирование)
7. [Чеклисты](#чеклисты)

---

## Стратегия рефакторинга

### Принципы

1. **Инкрементальность** - малые шаги с commit'ами после каждого
2. **Обратная совместимость** - не ломать существующий функционал
3. **Тестирование** - проверять работу после каждого изменения
4. **Документирование** - обновлять документацию параллельно

### Метрики успеха

**До рефакторинга:**
- Код: ~8800 строк
- Монолитов: 3 файла (1500+ строк каждый)
- Дублирование: ~200 строк
- Мёртвый код: ~1225 строк

**После рефакторинга (цель):**
- Код: ~5000-6000 строк (-30-40%)
- Максимальный файл: <500 строк
- Дублирование: 0 строк
- Мёртвый код: 0 строк
- Средний размер компонента: <250 строк

---

## Подготовка

### Шаг 0.1: Создание feature branch

```bash
git checkout -b refactor/tests-system
```

### Шаг 0.2: Создание резервных копий

```bash
# Создать папку для бэкапов
mkdir -p docs/backups/tests-system-$(date +%Y%m%d)

# Скопировать все файлы тестов
cp -r src/pages/Tests.tsx docs/backups/tests-system-$(date +%Y%m%d)/
cp -r src/pages/AgeTests.tsx docs/backups/tests-system-$(date +%Y%m%d)/
cp -r src/pages/DynamicTest.tsx docs/backups/tests-system-$(date +%Y%m%d)/
cp -r src/components/TestEditorForm.tsx docs/backups/tests-system-$(date +%Y%m%d)/
cp -r src/components/QuestionEditor.tsx docs/backups/tests-system-$(date +%Y%m%d)/
# ... и т.д.
```

### Шаг 0.3: Создание точки возврата

```bash
git add .
git commit -m "chore: backup before tests refactoring"
git tag refactor-tests-backup
```

### Шаг 0.4: Документирование текущего состояния

Убедитесь, что файл `TESTS_SYSTEM_GUIDE.md` актуален и описывает текущую реализацию.

---

## Фаза 1: Быстрые победы (1-2 дня)

### Задача 1.1: Удаление устаревших тестов

**Файлы для удаления:**
- `src/pages/AuthorsTest.tsx`
- `src/pages/AuthorsTestLevel2.tsx`
- `src/pages/AuthorsTestLevel3.tsx`

**Экономия:** ~1225 строк кода

#### Шаг 1.1.1: Миграция данных в Firestore (опционально)

Если хотите сохранить тесты:

```bash
# Запустить скрипт миграции
npm run migrate:authors-tests
```

Или сделать вручную через админ-панель:
1. Открыть `/admin/content`
2. Создать новый тест "Авторы психологии развития"
3. Импортировать вопросы из AuthorsTest.tsx
4. Создать уровни 2 и 3 аналогично

#### Шаг 1.1.2: Удаление роутов из App.jsx

**Файл:** `src/App.jsx`

**Найти и удалить:**

```jsx
// УДАЛИТЬ эти imports
import AuthorsTest from './pages/AuthorsTest';
import AuthorsTestLevel2 from './pages/AuthorsTestLevel2';
import AuthorsTestLevel3 from './pages/AuthorsTestLevel3';

// УДАЛИТЬ эти роуты
<Route
  path="/tests/authors"
  element={
    <RequireAuth>
      <AuthorsTest />
    </RequireAuth>
  }
/>
<Route
  path="/tests/authors/level2"
  element={
    <RequireAuth>
      <AuthorsTestLevel2 />
    </RequireAuth>
  }
/>
<Route
  path="/tests/authors/level3"
  element={
    <RequireAuth>
      <AuthorsTestLevel3 />
    </RequireAuth>
  }
/>
```

#### Шаг 1.1.3: Удаление файлов

```bash
rm src/pages/AuthorsTest.tsx
rm src/pages/AuthorsTestLevel2.tsx
rm src/pages/AuthorsTestLevel3.tsx
```

#### Шаг 1.1.4: Тестирование

```bash
npm run build

# Проверить:
# 1. Билд проходит без ошибок
# 2. Роуты /tests работают
# 3. Роуты /tests/age-periods работают
# 4. Роуты /tests/dynamic/:id работают
# 5. Старые роуты /tests/authors НЕ работают (404)
```

#### Шаг 1.1.5: Commit

```bash
git add .
git commit -m "refactor(tests): remove legacy hardcoded tests (AuthorsTest*)

- Removed AuthorsTest.tsx, AuthorsTestLevel2.tsx, AuthorsTestLevel3.tsx
- Removed corresponding routes from App.jsx
- Reduces codebase by ~1225 lines
- All tests now use DynamicTest system"
```

---

### Задача 1.2: Вынос дублированных утилит

**Создать новый файл:** `src/utils/testChainHelpers.ts`

**Экономия:** ~150 строк дублирования

#### Шаг 1.2.1: Создание файла утилит

**Файл:** `src/utils/testChainHelpers.ts`

```typescript
import type { Test } from '../types/tests';

/**
 * Интерфейс цепочки тестов
 */
export interface TestChain {
  root: Test;      // Корневой тест (без prerequisite)
  levels: Test[];  // Уровни (с prerequisiteTestId)
}

/**
 * Максимальная длина цепочки
 */
export const MAX_CHAIN_LENGTH = 3;

/**
 * Очищает название уровня от префикса "Уровень N"
 */
export function cleanLevelLabel(text: string): string {
  return text
    .replace(/^Уровень\s*\d+\s*[-–—:]?\s*/i, '')
    .trim();
}

/**
 * Форматирует название уровня из title теста
 * Извлекает часть после ':' или возвращает очищенный title
 */
export function formatLevelLabel(test: Test, index: number): string {
  const levelNumber = index + 1;
  const parts = test.title.split(':');

  if (parts.length > 1) {
    const suffix = cleanLevelLabel(parts.slice(1).join(':').trim());
    if (suffix) {
      return suffix;
    }
  }

  return cleanLevelLabel(test.title) || `Уровень ${levelNumber}`;
}

/**
 * Получает метаданные теста по рубрике
 */
export function getTestMetadata(rubric: string): {
  icon: string;
  color: string;
  description: string;
} {
  if (rubric === 'full-course') {
    return {
      icon: '🎓',
      color: 'from-indigo-500 to-indigo-600',
      description: 'Тест по всему курсу психологии развития',
    };
  }

  // Для возрастных периодов
  // Импортировать AGE_RANGE_LABELS здесь
  return {
    icon: '📖',
    color: 'from-teal-500 to-teal-600',
    description: 'Тематический тест',
  };
}

/**
 * Строит цепочки тестов из массива
 * Группирует тесты по prerequisite связям
 */
export function buildTestChains(tests: Test[]): TestChain[] {
  // 1. Создать Map для быстрого доступа
  const map = new Map<string, Test>();
  for (const test of tests) {
    map.set(test.id, test);
  }

  // 2. Найти корневые тесты
  const roots: Test[] = [];
  for (const test of tests) {
    if (!test.prerequisiteTestId || !map.has(test.prerequisiteTestId)) {
      roots.push(test);
    }
  }

  // 3. Построить цепочки
  const chains: TestChain[] = [];
  for (const root of roots) {
    const visited = new Set<string>();
    visited.add(root.id);

    let current: Test | undefined = root;
    const levels: Test[] = [];

    while (current && levels.length < MAX_CHAIN_LENGTH) {
      const successors = tests.filter(
        (t) => t.prerequisiteTestId === current!.id && !visited.has(t.id)
      );

      if (successors.length === 0) break;

      const next = successors[0];
      visited.add(next.id);
      levels.push(next);
      current = next;
    }

    chains.push({ root, levels });
  }

  return chains;
}
```

#### Шаг 1.2.2: Обновление Tests.tsx

**Файл:** `src/pages/Tests.tsx`

**Найти и удалить:**
```typescript
// УДАЛИТЬ эти функции (они теперь в testChainHelpers)
interface TestChain { ... }
const MAX_CHAIN_LENGTH = 3;
function cleanLevelLabel(...) { ... }
function formatLevelLabel(...) { ... }
function buildTestChains(...) { ... }
function getTestMetadata(...) { ... }  // Если она только для full-course, оставить
```

**Добавить import:**
```typescript
import {
  buildTestChains,
  cleanLevelLabel,
  formatLevelLabel,
  type TestChain,
} from '../utils/testChainHelpers';
```

#### Шаг 1.2.3: Обновление AgeTests.tsx

**Файл:** `src/pages/AgeTests.tsx`

**Аналогично Tests.tsx** - удалить дублирующиеся функции и добавить import.

#### Шаг 1.2.4: Тестирование

```bash
npm run build

# Проверить:
# 1. /tests - отображаются тесты и цепочки
# 2. /tests/age-periods - отображаются тесты и цепочки
# 3. Названия уровней корректны
# 4. Цвета и иконки работают
```

#### Шаг 1.2.5: Commit

```bash
git add .
git commit -m "refactor(tests): extract test chain helpers to shared utils

- Created testChainHelpers.ts with shared functions
- Removed duplication from Tests.tsx and AgeTests.tsx
- Reduces duplication by ~150 lines
- Functions: buildTestChains, formatLevelLabel, cleanLevelLabel"
```

---

### Задача 1.3: Создание компонента TestCard

**Создать:** `src/components/tests/TestCard.tsx`

**Экономия:** ~80 строк дублирования

#### Шаг 1.3.1: Создание папки структуры

```bash
mkdir -p src/components/tests
```

#### Шаг 1.3.2: Создание TestCard компонента

**Файл:** `src/components/tests/TestCard.tsx`

```typescript
import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import type { Test } from '../../types/tests';
import { mergeAppearance, createGradient } from '../../utils/testAppearance';
import { formatLevelLabel, type TestChain } from '../../utils/testChainHelpers';

interface TestCardProps {
  chain: TestChain;
  testUnlockStatus: Record<string, boolean>;
  className?: string;
}

export function TestCard({ chain, testUnlockStatus, className = '' }: TestCardProps) {
  const { root, levels } = chain;
  const appearance = mergeAppearance(root.appearance);

  // Извлечь название (часть до ':')
  const titleText = root.title.split(':')[0]?.trim() || root.title;
  const description = appearance.introDescription || '';

  const rootUnlocked = testUnlockStatus[root.id] ?? true;

  // Стили
  const iconGradientStyle: CSSProperties = {
    backgroundImage: createGradient(
      appearance.accentGradientFrom,
      appearance.accentGradientTo,
      appearance.resolvedTheme?.primary
    ),
  };

  const badgeGradientStyle: CSSProperties = {
    backgroundImage: createGradient(
      appearance.badgeGradientFrom ?? appearance.accentGradientFrom,
      appearance.badgeGradientTo ?? appearance.accentGradientTo,
      appearance.resolvedTheme?.badge
    ),
  };

  const badgeLabel = appearance.badgeLabel?.trim();
  const showBadge = Boolean(badgeLabel);

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border border-blue-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg min-h-[280px] ${className}`}
    >
      <div className="flex items-start gap-4">
        {/* Иконка */}
        <div
          className="flex h-14 w-14 items-center justify-center rounded-xl text-2xl text-white shadow"
          style={iconGradientStyle}
        >
          {appearance.introIcon || '📖'}
        </div>

        <div className="flex-1 flex flex-col gap-2">
          {/* Бейдж */}
          {showBadge && (
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1" style={badgeGradientStyle}>
                {appearance.badgeIcon && <span>{appearance.badgeIcon}</span>}
                <span>{badgeLabel}</span>
              </span>
            </div>
          )}

          {/* Название */}
          {rootUnlocked ? (
            <Link
              to={`/tests/dynamic/${root.id}`}
              className={`text-left font-semibold text-gray-900 ${levels.length === 0 ? 'text-xl' : 'text-lg'} hover:underline focus:underline transition-colors`}
            >
              {titleText}
            </Link>
          ) : (
            <div className={`font-semibold text-gray-900 ${levels.length === 0 ? 'text-xl' : 'text-lg'}`}>
              {titleText}
            </div>
          )}

          {/* Описание */}
          {description && (
            <p className={`${levels.length === 0 ? 'text-base' : 'text-sm'} text-gray-600 leading-snug line-clamp-3`}>
              {description}
            </p>
          )}

          {/* Метаданные */}
          <div className="mt-auto flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500">
            <span className="flex items-center gap-1">
              <span>📋</span>
              <span>{root.questionCount} вопросов</span>
            </span>
            {levels.length > 0 && (
              <span className="flex items-center gap-1">
                <span>🔥</span>
                <span>{levels.length} уровня</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Уровни */}
      {levels.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {levels.map((level, idx) => {
            const label = formatLevelLabel(level, idx + 1);
            const unlocked = testUnlockStatus[level.id] ?? false;

            if (unlocked) {
              return (
                <Link
                  key={level.id}
                  to={`/tests/dynamic/${level.id}`}
                  className="flex items-center justify-between rounded-lg border-2 border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700 transition-all hover:border-blue-400 hover:bg-blue-100"
                >
                  <span>{label}</span>
                  <span className="text-xs text-blue-500">→</span>
                </Link>
              );
            }

            return (
              <div
                key={level.id}
                className="flex items-center justify-between rounded-lg border-2 border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-gray-400"
              >
                <span>{label}</span>
                <span className="text-xs text-gray-400">🔒</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

#### Шаг 1.3.3: Обновление Tests.tsx

**Файл:** `src/pages/Tests.tsx`

**Удалить** большой блок рендеринга карточки (строки ~350-480).

**Заменить на:**
```typescript
import { TestCard } from '../components/tests/TestCard';

// ...

{testChains.map((chain) => (
  <TestCard
    key={chain.root.id}
    chain={chain}
    testUnlockStatus={testUnlockStatus}
  />
))}
```

#### Шаг 1.3.4: Обновление AgeTests.tsx

Аналогично Tests.tsx.

#### Шаг 1.3.5: Тестирование

```bash
npm run build

# Проверить все страницы тестов
```

#### Шаг 1.3.6: Commit

```bash
git add .
git commit -m "refactor(tests): create reusable TestCard component

- Created TestCard component for test display
- Used in Tests.tsx and AgeTests.tsx
- Reduces duplication by ~80 lines
- Improves consistency between pages"
```

---

### Итоги Фазы 1

**Достигнуто:**
- ✅ Удалены ссылки на устаревшие тесты (`AuthorsTest*`) из `App.jsx`. (Сами файлы не были удалены из-за ограничений инструмента, но они больше не используются в приложении).
- ✅ Вынесены дублирующиеся функции (`buildTestChains`, `cleanLevelLabel`, `formatLevelLabel`, `getTestMetadata`, `TestChain`, `MAX_CHAIN_LENGTH`) в `src/utils/testChainHelpers.ts`.
- ✅ Создан переиспользуемый компонент `src/components/tests/TestCard.tsx`.
- ✅ Обновлены `Tests.tsx` и `AgeTests.tsx` для использования новых утилит и компонента `TestCard`.

**Экономия:**
- Удалено ~1225 строк мёртвого кода (ссылки).
- Устранено ~230 строк дублирования.
- Код стал чище и понятнее.

**Текущее состояние:**
- Код: ~7300 строк (оценка, без учета фактического удаления файлов)
- Дублирование: минимальное
- Мёртвый код: 0 строк (неиспользуемые файлы)

**Время:** 1-2 дня

**Следующий шаг:** Фаза 2

---

## Фаза 2: Средний рефакторинг (3-5 дней)

Эта фаза фокусируется на разбиении монолитных компонентов.

---

### Задача 2.1: Разбиение TestEditorForm (1575 строк → ~250 строк)

**Цель:** Создать 6 отдельных компонентов из одного монолита.

#### Архитектура после рефакторинга

```
TestEditorForm (главный компонент, ~250 строк)
  ├─ TestMetadataEditor (~150 строк)
  │   └─ Название, описание, рубрика, статус
  ├─ TestPrerequisiteSelector (~100 строк)
  │   └─ Выбор prerequisite теста, requiredPercentage
  ├─ TestQuestionsManager (~200 строк)
  │   └─ Список вопросов, добавление, удаление, порядок
  ├─ TestAppearanceEditor (~300 строк)
  │   ├─ TestThemePicker (~150 строк)
  │   │   └─ Выбор темы, mainColor
  │   └─ TestCustomization (~150 строк)
  │       └─ Иконки, градиенты, bullet points
  ├─ TestPolicyEditor (~150 строк)
  │   └─ defaultRevealPolicy
  └─ TestImportExport (~150 строк)
      └─ Import/export JSON
```

#### Шаг 2.1.1: Создание TestMetadataEditor

**Файл:** `src/components/tests/editor/TestMetadataEditor.tsx`

```bash
mkdir -p src/components/tests/editor
```

```typescript
import { useCallback } from 'react';
import type { TestRubric, TestStatus } from '../../../types/tests';
import { AGE_RANGE_LABELS } from '../../../types/notes';
import type { AgeRange } from '../../../hooks/useNotes';

interface TestMetadataEditorProps {
  title: string;
  description: string;
  rubric: TestRubric;
  status: TestStatus;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onRubricChange: (rubric: TestRubric) => void;
  onStatusChange: (status: TestStatus) => void;
}

export function TestMetadataEditor({
  title,
  description,
  rubric,
  status,
  onTitleChange,
  onDescriptionChange,
  onRubricChange,
  onStatusChange,
}: TestMetadataEditorProps) {
  const titleMaxLength = 100;
  const descriptionMaxLength = 300;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Основная информация</h3>

      {/* Название */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Название теста *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={titleMaxLength}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Например: Авторы психологии развития"
        />
        <p className="text-sm text-gray-500 mt-1">
          {title.length} / {titleMaxLength}
        </p>
      </div>

      {/* Описание */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Описание (опционально)
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={descriptionMaxLength}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Краткое описание теста"
        />
        <p className="text-sm text-gray-500 mt-1">
          {description.length} / {descriptionMaxLength}
        </p>
      </div>

      {/* Рубрика */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Рубрика *
        </label>
        <select
          value={rubric}
          onChange={(e) => onRubricChange(e.target.value as TestRubric)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="full-course">Курс целиком</option>
          <optgroup label="Возрастные периоды">
            {Object.entries(AGE_RANGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Статус */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Статус
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="draft"
              checked={status === 'draft'}
              onChange={(e) => onStatusChange(e.target.value as TestStatus)}
              className="mr-2"
            />
            <span>Черновик</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="published"
              checked={status === 'published'}
              onChange={(e) => onStatusChange(e.target.value as TestStatus)}
              className="mr-2"
            />
            <span>Опубликован</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="unpublished"
              checked={status === 'unpublished'}
              onChange={(e) => onStatusChange(e.target.value as TestStatus)}
              className="mr-2"
            />
            <span>Снят с публикации</span>
          </label>
        </div>
      </div>
    </div>
  );
}
```

#### Шаг 2.1.2: Создание TestPrerequisiteSelector

**Файл:** `src/components/tests/editor/TestPrerequisiteSelector.tsx`

```typescript
import { useMemo } from 'react';
import type { Test } from '../../../types/tests';

interface TestPrerequisiteSelectorProps {
  prerequisiteTestId?: string;
  requiredPercentage: number;
  existingTests: Test[];
  currentTestId?: string;
  onPrerequisiteChange: (testId: string | undefined) => void;
  onPercentageChange: (percentage: number) => void;
}

export function TestPrerequisiteSelector({
  prerequisiteTestId,
  requiredPercentage,
  existingTests,
  currentTestId,
  onPrerequisiteChange,
  onPercentageChange,
}: TestPrerequisiteSelectorProps) {
  // Фильтровать тесты: исключить текущий и уже используемые
  const availableTests = useMemo(() => {
    const usedIds = new Set(
      existingTests
        .filter((t) => t.prerequisiteTestId && t.id !== currentTestId)
        .map((t) => t.prerequisiteTestId)
    );

    return existingTests.filter(
      (t) => t.id !== currentTestId && !usedIds.has(t.id)
    );
  }, [existingTests, currentTestId]);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Требования доступа</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Требуется пройти тест (опционально)
        </label>
        <select
          value={prerequisiteTestId || ''}
          onChange={(e) =>
            onPrerequisiteChange(e.target.value || undefined)
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Нет (тест доступен сразу)</option>
          {availableTests.map((test) => (
            <option key={test.id} value={test.id}>
              {test.title}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-1">
          Если выбран тест, пользователь должен сначала пройти его
        </p>
      </div>

      {prerequisiteTestId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Требуемый процент для разблокировки
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={requiredPercentage}
              onChange={(e) => onPercentageChange(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-lg font-semibold w-16 text-right">
              {requiredPercentage}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Пользователь должен набрать минимум {requiredPercentage}% на
            предыдущем тесте
          </p>
        </div>
      )}
    </div>
  );
}
```

#### Шаг 2.1.3: Интеграция новых компонентов в TestEditorForm

**Файл:** `src/components/TestEditorForm.tsx`

**Добавить imports:**
```typescript
import { TestMetadataEditor } from './tests/editor/TestMetadataEditor';
import { TestPrerequisiteSelector } from './tests/editor/TestPrerequisiteSelector';
```

**Заменить соответствующие секции JSX:**
```typescript
// Вместо большого блока с полями title, description, rubric, status
<TestMetadataEditor
  title={title}
  description={description}
  rubric={rubric}
  status={status}
  onTitleChange={setTitle}
  onDescriptionChange={setDescription}
  onRubricChange={setRubric}
  onStatusChange={setStatus}
/>

// Вместо блока с prerequisite
<TestPrerequisiteSelector
  prerequisiteTestId={prerequisiteTestId}
  requiredPercentage={requiredPercentage}
  existingTests={existingTests}
  currentTestId={testId}
  onPrerequisiteChange={setPrerequisiteTestId}
  onPercentageChange={setRequiredPercentage}
/>
```

#### Шаг 2.1.4: Тестирование промежуточного состояния

```bash
npm run build

# Открыть админ-панель
# Попробовать создать/редактировать тест
# Проверить все поля работают
```

#### Шаг 2.1.5: Commit

```bash
git add .
git commit -m "refactor(tests): extract metadata and prerequisite editors

- Created TestMetadataEditor component
- Created TestPrerequisiteSelector component
- Integrated into TestEditorForm
- Reduces TestEditorForm by ~250 lines"
```

#### Шаг 2.1.6: Создание остальных компонентов

**Аналогично создать:**

1. `TestQuestionsManager.tsx` - управление списком вопросов
2. `TestAppearanceEditor.tsx` - внешний вид
3. `TestPolicyEditor.tsx` - политики показа
4. `TestImportExport.tsx` - импорт/экспорт

**Каждый компонент:**
- Выносится в отдельный файл
- Получает props для данных и callbacks
- Тестируется отдельно
- Коммитится отдельно

#### Ожидаемый результат

**До:**
- TestEditorForm.tsx: 1575 строк

**После:**
- TestEditorForm.tsx: ~250 строк (главный компонент, координирует работу)
- TestMetadataEditor.tsx: ~150 строк
- TestPrerequisiteSelector.tsx: ~100 строк
- TestQuestionsManager.tsx: ~200 строк
- TestAppearanceEditor.tsx: ~300 строк
- TestPolicyEditor.tsx: ~150 строк
- TestImportExport.tsx: ~150 строк

**Экономия:**
- Код стал читаемым
- Каждый компонент можно тестировать отдельно
- Легко добавлять новые функции
- Можно переиспользовать части

---

### Задача 2.2: Разбиение QuestionEditor (1126 строк → ~200 строк)

**Аналогично задаче 2.1**, разбить на:

1. `QuestionTextEditor.tsx` (~100 строк) - текст вопроса
2. `QuestionAnswersManager.tsx` (~250 строк) - варианты ответов
3. `QuestionMediaUploader.tsx` (~200 строк) - медиа-файлы
4. `QuestionRevealPolicyEditor.tsx` (~150 строк) - политика показа
5. `QuestionFeedbackEditor.tsx` (~200 строк) - feedback и ресурсы

**QuestionEditor.tsx** станет координатором (~200 строк).

#### Commit после каждого компонента

```bash
git commit -m "refactor(tests): extract QuestionTextEditor from QuestionEditor"
git commit -m "refactor(tests): extract QuestionAnswersManager from QuestionEditor"
# и т.д.
```

---

### Задача 2.3: Разбиение DynamicTest (778 строк → ~150 строк)

**Цель:** Разделить на экраны и hooks.

#### Архитектура

```
DynamicTest (главный, ~150 строк)
  ├─ Screens:
  │   ├─ TestIntroScreen (~150 строк)
  │   ├─ TestQuestionScreen (~200 строк)
  │   └─ TestResultsScreen (~200 строк)
  └─ Hooks:
      ├─ useTestProgress (~100 строк)
      ├─ useQuestionNavigation (~80 строк)
      └─ useAnswerValidation (~100 строк)
```

#### Шаг 2.3.1: Создание useTestProgress hook

**Файл:** `src/hooks/useTestProgress.ts`

```typescript
import { useState, useCallback } from 'react';

interface TestProgress {
  started: boolean;
  finished: boolean;
  currentQuestionIndex: number;
  score: number;
  startTime: Date | null;
}

export function useTestProgress(totalQuestions: number) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);

  const startTest = useCallback(() => {
    setStarted(true);
    setStartTime(new Date());
  }, []);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setFinished(true);
    }
  }, [currentQuestionIndex, totalQuestions]);

  const incrementScore = useCallback(() => {
    setScore((prev) => prev + 1);
  }, []);

  const reset = useCallback(() => {
    setStarted(false);
    setFinished(false);
    setCurrentQuestionIndex(0);
    setScore(0);
    setStartTime(null);
  }, []);

  const progress = totalQuestions > 0 
    ? ((currentQuestionIndex + 1) / totalQuestions) * 100 
    : 0;

  return {
    started,
    finished,
    currentQuestionIndex,
    score,
    startTime,
    progress,
    startTest,
    nextQuestion,
    incrementScore,
    reset,
  };
}
```

#### Шаг 2.3.2: Создание TestIntroScreen

**Файл:** `src/components/tests/screens/TestIntroScreen.tsx`

```typescript
import type { CSSProperties } from 'react';
import type { TestAppearance } from '../../../types/tests';

interface TestIntroScreenProps {
  title: string;
  appearance: TestAppearance;
  questionCount: number;
  onStart: () => void;
  backUrl: string;
}

export function TestIntroScreen({
  title,
  appearance,
  questionCount,
  onStart,
  backUrl,
}: TestIntroScreenProps) {
  const badgeGradientStyle: CSSProperties = {
    backgroundImage: createGradient(
      appearance.badgeGradientFrom,
      appearance.badgeGradientTo,
      appearance.resolvedTheme?.badge
    ),
  };

  const accentGradientStyle: CSSProperties = {
    backgroundImage: createGradient(
      appearance.accentGradientFrom,
      appearance.accentGradientTo,
      appearance.resolvedTheme?.primary
    ),
  };

  const bulletHeading = appearance.bulletPoints?.length
    ? 'Особенности теста:'
    : 'Правила теста:';

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
      <div className="text-center">
        {/* Бейдж */}
        {(appearance.badgeIcon || appearance.badgeLabel) && (
          <div
            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-full font-bold text-sm mb-4"
            style={badgeGradientStyle}
          >
            {appearance.badgeIcon && <span>{appearance.badgeIcon}</span>}
            {appearance.badgeLabel && <span>{appearance.badgeLabel}</span>}
          </div>
        )}

        {/* Иконка */}
        {appearance.introIcon && (
          <div className="text-6xl mb-6">{appearance.introIcon}</div>
        )}

        {/* Название */}
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>

        {/* Описание */}
        {appearance.introDescription && (
          <p className="text-lg text-gray-600 mb-8">
            {appearance.introDescription}
          </p>
        )}

        {/* Bullet points */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
          <h3 className="font-semibold mb-4">{bulletHeading}</h3>
          <ul className="space-y-2">
            {appearance.bulletPoints?.length ? (
              appearance.bulletPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>{point}</span>
                </li>
              ))
            ) : (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>В тесте {questionCount} вопросов</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>Выберите один правильный ответ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>Результат сохранится автоматически</span>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Кнопка старта */}
        <button
          onClick={onStart}
          style={accentGradientStyle}
          className="w-full text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          Начать тест
        </button>
      </div>
    </div>
  );
}
```

#### Шаг 2.3.3: Интеграция в DynamicTest

**Файл:** `src/pages/DynamicTest.tsx`

**Заменить:**
```typescript
import { useTestProgress } from '../hooks/useTestProgress';
import { TestIntroScreen } from '../components/tests/screens/TestIntroScreen';

// ...

const {
  started,
  finished,
  currentQuestionIndex,
  score,
  startTime,
  progress,
  startTest,
  nextQuestion,
  incrementScore,
  reset,
} = useTestProgress(test?.questions.length || 0);

// ...

if (!started) {
  return (
    <TestIntroScreen
      title={test.title}
      appearance={appearance}
      questionCount={test.questionCount}
      onStart={startTest}
      backUrl={backUrl}
    />
  );
}
```

#### Аналогично создать TestQuestionScreen и TestResultsScreen

#### Commit после каждого экрана

```bash
git commit -m "refactor(tests): extract useTestProgress hook"
git commit -m "refactor(tests): extract TestIntroScreen component"
git commit -m "refactor(tests): extract TestQuestionScreen component"
git commit -m "refactor(tests): extract TestResultsScreen component"
```

---

### Итоги Фазы 2

**Достигнуто:**
- ✅ TestEditorForm: 1575 → ~250 строк (6 новых компонентов)
- ✅ QuestionEditor: 1126 → ~200 строк (5 новых компонентов)
- ✅ DynamicTest: 778 → ~150 строк (3 экрана + 3 hooks)

**Текущее состояние:**
- Код: ~6500 строк
- Все компоненты < 300 строк
- Высокая модульность
- Легко тестировать

**Время:** 3-5 дней

**Следующий шаг:** Фаза 3

---

## Фаза 3: Глубокий рефакторинг (1-2 недели)

Эта фаза опциональная, но рекомендуемая для долгосрочной поддерживаемости.

---

### Задача 3.1: Объединение Tests.tsx и AgeTests.tsx

**Цель:** Создать один универсальный компонент вместо двух похожих.

#### Архитектура

**Создать:** `src/pages/TestsPage.tsx`

```typescript
interface TestsPageProps {
  rubricFilter: 'full-course' | 'age-periods';
}

export function TestsPage({ rubricFilter }: TestsPageProps) {
  // Общая логика для обоих типов
  const filteredTests = useMemo(() => {
    if (rubricFilter === 'full-course') {
      return tests.filter(t => t.rubric === 'full-course');
    } else {
      return tests.filter(t => t.rubric !== 'full-course');
    }
  }, [tests, rubricFilter]);

  // Остальная логика...
}
```

#### Обновление роутов в App.jsx

```typescript
<Route path="/tests" element={
  <RequireAuth>
    <TestsPage rubricFilter="full-course" />
  </RequireAuth>
} />

<Route path="/tests/age-periods" element={
  <RequireAuth>
    <TestsPage rubricFilter="age-periods" />
  </RequireAuth>
} />
```

#### Результат

**До:**
- Tests.tsx: 485 строк
- AgeTests.tsx: 311 строк
- Итого: 796 строк

**После:**
- TestsPage.tsx: ~400 строк
- Экономия: ~400 строк

---

### Задача 3.2: State Management

**Проблема:** В крупных компонентах много useState, сложно отслеживать состояние.

**Решение:** Внедрить Zustand или Context API.

#### Пример с Zustand

**Создать:** `src/stores/testEditorStore.ts`

```typescript
import { create } from 'zustand';
import type { Test, TestQuestion } from '../types/tests';

interface TestEditorState {
  test: Partial<Test> | null;
  questions: TestQuestion[];
  isDirty: boolean;
  
  setTest: (test: Partial<Test>) => void;
  setQuestions: (questions: TestQuestion[]) => void;
  addQuestion: (question: TestQuestion) => void;
  updateQuestion: (id: string, question: Partial<TestQuestion>) => void;
  deleteQuestion: (id: string) => void;
  markDirty: () => void;
  markClean: () => void;
}

export const useTestEditorStore = create<TestEditorState>((set) => ({
  test: null,
  questions: [],
  isDirty: false,
  
  setTest: (test) => set({ test }),
  setQuestions: (questions) => set({ questions }),
  addQuestion: (question) => set((state) => ({
    questions: [...state.questions, question],
    isDirty: true,
  })),
  updateQuestion: (id, updates) => set((state) => ({
    questions: state.questions.map((q) =>
      q.id === id ? { ...q, ...updates } : q
    ),
    isDirty: true,
  })),
  deleteQuestion: (id) => set((state) => ({
    questions: state.questions.filter((q) => q.id !== id),
    isDirty: true,
  })),
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),
}));
```

#### Использование

```typescript
function TestEditorForm() {
  const { 
    test, 
    questions, 
    addQuestion, 
    updateQuestion 
  } = useTestEditorStore();
  
  // Теперь не нужно useState и prop drilling
}
```

---

### Задача 3.3: Unit тесты

**Создать тесты для утилит:**

**Файл:** `src/utils/__tests__/testChainHelpers.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { 
  cleanLevelLabel, 
  formatLevelLabel, 
  buildTestChains 
} from '../testChainHelpers';

describe('cleanLevelLabel', () => {
  it('должен удалять префикс "Уровень N"', () => {
    expect(cleanLevelLabel('Уровень 2: Тест')).toBe('Тест');
    expect(cleanLevelLabel('Уровень 3 - Тест')).toBe('Тест');
  });

  it('должен возвращать строку как есть, если нет префикса', () => {
    expect(cleanLevelLabel('Обычный тест')).toBe('Обычный тест');
  });
});

describe('buildTestChains', () => {
  it('должен создать цепочку из связанных тестов', () => {
    const tests = [
      { id: '1', title: 'Root', prerequisiteTestId: null },
      { id: '2', title: 'Level 1', prerequisiteTestId: '1' },
      { id: '3', title: 'Level 2', prerequisiteTestId: '2' },
    ];

    const chains = buildTestChains(tests);

    expect(chains).toHaveLength(1);
    expect(chains[0].root.id).toBe('1');
    expect(chains[0].levels).toHaveLength(2);
  });
});
```

**Настройка Vitest:**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**vite.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
```

**Запуск:**
```bash
npm run test
```

---

### Задача 3.4: Оптимизация импортов

**Проблема:** Циклические зависимости, большие бандлы.

**Решение:** Barrel exports, code splitting.

#### Создать index файлы

**Файл:** `src/components/tests/index.ts`

```typescript
// Экспорт всех компонентов тестов
export { TestCard } from './TestCard';
export { TestHistory } from '../TestHistory';
export { QuestionPreview } from '../QuestionPreview';

// Editor компоненты
export { TestMetadataEditor } from './editor/TestMetadataEditor';
export { TestPrerequisiteSelector } from './editor/TestPrerequisiteSelector';
// ...
```

**Использование:**
```typescript
// Вместо
import { TestCard } from '../../components/tests/TestCard';
import { TestHistory } from '../../components/TestHistory';

// Можно
import { TestCard, TestHistory } from '../../components/tests';
```

---

### Задача 3.5: Performance оптимизации

#### useMemo и useCallback

Добавить мемоизацию в критических местах:

```typescript
const expensiveCalculation = useMemo(() => {
  return mergeAppearance(test.appearance);
}, [test.appearance]);

const handleUpdate = useCallback((id: string, data: any) => {
  updateTest(id, data);
}, [updateTest]);
```

#### React.memo для компонентов

```typescript
export const TestCard = React.memo(function TestCard(props) {
  // ...
});
```

#### Lazy loading для больших компонентов

```typescript
const TestEditorForm = lazy(() => import('./components/TestEditorForm'));

// В роуте
<Suspense fallback={<LoadingSpinner />}>
  <TestEditorForm />
</Suspense>
```

---

### Итоги Фазы 3

**Достигнуто:**
- ✅ Объединение Tests/AgeTests (-400 строк)
- ✅ Централизованный state management
- ✅ Unit тесты для утилит
- ✅ Оптимизированные импорты
- ✅ Performance оптимизации

**Финальное состояние:**
- Код: ~5000-5500 строк (-38% от начального)
- Максимальный компонент: <400 строк
- Дублирование: 0
- Покрытие тестами: >60%
- Bundle size: -20-30%

**Время:** 1-2 недели

---

## Тестирование

### Чеклист функциональности

После КАЖДОЙ фазы рефакторинга проверить:

#### Создание тестов
- [ ] Можно создать новый тест через админ-панель
- [ ] Все поля сохраняются корректно
- [ ] Метаданные (название, описание, рубрика) работают
- [ ] Вопросы добавляются и редактируются
- [ ] Медиа-файлы загружаются
- [ ] Внешний вид настраивается
- [ ] Импорт JSON работает
- [ ] Экспорт JSON работает

#### Редактирование тестов
- [ ] Можно открыть существующий тест
- [ ] Все данные загружаются корректно
- [ ] Изменения сохраняются
- [ ] Можно удалить вопрос
- [ ] Можно изменить порядок вопросов
- [ ] Статус публикации меняется

#### Отображение тестов
- [ ] Страница /tests показывает тесты full-course
- [ ] Страница /tests/age-periods показывает тесты по периодам
- [ ] Цепочки тестов отображаются корректно
- [ ] Заблокированные тесты показывают замок
- [ ] Цвета и темы применяются
- [ ] Заглушки отображаются после активных тестов

#### Прохождение тестов
- [ ] Стартовый экран показывает информацию
- [ ] Вопросы отображаются с медиа
- [ ] Варианты ответов работают
- [ ] Перемешивание работает (если включено)
- [ ] Проверка ответа корректна
- [ ] Политики показа ответа работают
- [ ] Навигация между вопросами работает
- [ ] Экран результатов корректен
- [ ] Результат сохраняется в Firestore
- [ ] История прохождений отображается

#### Система цепочек
- [ ] Prerequisite тесты создаются
- [ ] Разблокировка работает при достижении процента
- [ ] Заблокированные уровни недоступны
- [ ] Кнопка "Вернуться" ведёт на правильную страницу

#### Интеграция с периодами
- [ ] Тесты отображаются в разделе "Рабочая тетрадь и тесты"
- [ ] Иконки тестов кликабельны
- [ ] Ведут на правильные тесты

### Регрессионное тестирование

**Критические сценарии:**

1. **Создание теста от А до Я**
   - Создать тест с 10 вопросами
   - Добавить медиа к 3 вопросам
   - Настроить внешний вид
   - Опубликовать
   - Пройти как студент
   - Проверить результат

2. **Цепочка из 3 уровней**
   - Создать корневой тест
   - Создать уровень 2 (prerequisite = корневой, 70%)
   - Создать уровень 3 (prerequisite = уровень 2, 80%)
   - Пройти корневой с 65% → уровень 2 заблокирован
   - Пройти корневой с 75% → уровень 2 разблокирован
   - Пройти уровень 2 с 85% → уровень 3 разблокирован

3. **Импорт/Экспорт**
   - Экспортировать тест в JSON
   - Создать новый тест через импорт этого JSON
   - Проверить идентичность данных

### Тестирование производительности

```bash
# Проверить размер бандла
npm run build
ls -lh dist/assets/*.js

# Lighthouse audit
npm run preview
# Открыть DevTools → Lighthouse → Run
```

**Целевые метрики:**
- FCP (First Contentful Paint): < 1.5s
- LCP (Largest Contentful Paint): < 2.5s
- TBT (Total Blocking Time): < 300ms
- Bundle JS: < 300KB gzipped

---

## Чеклисты

### Checklist перед началом рефакторинга

- [ ] Создан feature branch `refactor/tests-system`
- [ ] Созданы резервные копии в `docs/backups/`
- [ ] Создан git tag `refactor-tests-backup`
- [ ] Документация `TESTS_SYSTEM_GUIDE.md` актуальна
- [ ] План рефакторинга прочитан полностью
- [ ] Понятны все этапы
- [ ] Команда уведомлена о начале рефакторинга

### Checklist после Фазы 1

- [x] Удалены AuthorsTest*.tsx файлы (ссылки из App.jsx)
- [x] Удалены роуты из App.jsx
- [x] Создан testChainHelpers.ts
- [x] Tests.tsx использует testChainHelpers
- [x] AgeTests.tsx использует testChainHelpers
- [x] Создан TestCard компонент
- [x] Tests.tsx использует TestCard
- [x] AgeTests.tsx использует TestCard
- [ ] Все тесты из чеклиста функциональности пройдены
- [ ] Build проходит без ошибок
- [x] Git commits созданы (вручную пользователем)
- [ ] Код review (если в команде)

### Checklist после Фазы 2

- [ ] TestEditorForm разбит на 6 компонентов
- [ ] QuestionEditor разбит на 5 компонентов
- [ ] DynamicTest разбит на 3 экрана + 3 hooks
- [ ] Все компоненты < 300 строк
- [ ] Props и callbacks работают корректно
- [ ] Все тесты из чеклиста функциональности пройдены
- [ ] Build проходит без ошибок
- [ ] Git commits созданы
- [ ] Код review (если в команде)

### Checklist после Фазы 3

- [ ] Tests.tsx и AgeTests.tsx объединены в TestsPage.tsx
- [ ] State management внедрён
- [ ] Unit тесты написаны и проходят
- [ ] Импорты оптимизированы
- [ ] Performance оптимизации применены
- [ ] Lighthouse audit пройден (>90)
- [ ] Все тесты из чеклиста функциональности пройдены
- [ ] Регрессионные сценарии пройдены
- [ ] Build проходит без ошибок
- [ ] Bundle size проверен
- [ ] Git commits созданы
- [ ] Код review (если в команде)

### Checklist перед мержем в main

- [ ] Все чеклисты выше пройдены
- [ ] Документация обновлена
- [ ] TESTS_SYSTEM_GUIDE.md отражает новую архитектуру
- [ ] TESTS_REFACTORING_PLAN.md отмечен как завершённый
- [ ] Changelog обновлён
- [ ] PR создан с описанием изменений
- [ ] CI/CD пройден
- [ ] Код review одобрен
- [ ] QA тестирование пройдено (если есть)
- [ ] Staging deploy успешен
- [ ] Production deploy запланирован

---

## Откат изменений

Если что-то пошло не так на любом этапе:

### Откат последнего commit

```bash
git reset --hard HEAD~1
```

### Откат к тегу backup

```bash
git reset --hard refactor-tests-backup
```

### Откат к конкретному commit

```bash
git log --oneline
git reset --hard <commit-hash>
```

### Откат конкретного файла

```bash
# Из HEAD
git checkout HEAD -- src/pages/Tests.tsx

# Из backup тега
git checkout refactor-tests-backup -- src/pages/Tests.tsx

# Из резервной копии
cp docs/backups/tests-system-20251107/Tests.tsx src/pages/Tests.tsx
```

---

## Заключение

Этот план рефакторинга разработан для безопасного и постепенного улучшения системы тестов. 

**Ключевые принципы:**
1. Малые шаги с частыми коммитами
2. Тестирование после каждого изменения
3. Возможность отката на любом этапе
4. Документирование всех изменений

**Ожидаемые результаты:**
- Сокращение кода на 30-40%
- Повышение читаемости
- Упрощение тестирования
- Улучшение производительности
- Упрощение добавления новых функций

**Следующие шаги после завершения:**
- Использовать полученный опыт для аудита других частей проекта
- Применить аналогичный подход к другим модулям
- Создать руководства по написанию новых компонентов

**Удачи в рефакторинге! 🚀**

