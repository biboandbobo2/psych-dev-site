# 📚 Система тестирования

> **Версия:** 2.0 (сокращенная)
> **Время чтения:** 15-20 минут
> **Статус:** Актуально
>
> Полная версия с примерами кода: [archive/legacy/TESTS_SYSTEM_GUIDE_FULL.md](../archive/legacy/TESTS_SYSTEM_GUIDE_FULL.md)

---

## 📑 Содержание

1. [Обзор системы](#обзор-системы)
2. [Архитектура](#архитектура)
3. [Типы данных](#типы-данных)
4. [Основные компоненты](#основные-компоненты)
5. [API и бизнес-логика](#api-и-бизнес-логика)
6. [Система цепочек тестов](#система-цепочек-тестов)
7. [Внешний вид и темы](#внешний-вид-и-темы)

---

## Обзор системы

### Назначение

Система для создания, управления и прохождения интерактивных тестов по психологии.

**Основные возможности:**
- ✅ Динамическое создание тестов через админ-панель
- ✅ Два типа рубрик: по всему курсу и по возрастным периодам
- ✅ Цепочки тестов с разблокировкой по результатам
- ✅ Медиа-контент (изображения, аудио, YouTube видео)
- ✅ Гибкая настройка внешнего вида (темы, градиенты)
- ✅ Импорт/экспорт тестов в JSON
- ✅ Сохранение результатов и истории

### Роли пользователей

| Роль | Возможности |
|------|-------------|
| **Student** | Проходит тесты, видит результаты |
| **Admin** | Создаёт и редактирует тесты |
| **Super Admin** | Управляет правами доступа |

---

## Архитектура

### Общая схема

```
Pages (Роуты)
  ├── TestsPage.tsx          → Списки тестов (/tests, /tests/age-periods)
  ├── DynamicTest.tsx        → Прохождение теста (/tests/dynamic/:testId)
  └── AdminContent.tsx       → Админ-панель создания тестов

Components (UI)
  ├── tests/TestCard.tsx     → Карточка теста
  ├── TestEditorForm.tsx     → Форма редактирования теста
  ├── QuestionEditor.tsx     → Редактор вопроса
  └── TestHistory.tsx        → История прохождений

Hooks (Логика)
  ├── useTests.ts            → Загрузка тестов
  ├── useTestProgress.ts     → Прогресс прохождения
  └── useTestAccess.ts       → Проверка доступа

Lib (API)
  ├── tests.ts               → CRUD операции с Firestore
  ├── testAccess.ts          → Логика разблокировки
  └── testResults.ts         → Сохранение результатов

Utils
  ├── testAppearance.ts      → Работа с темами
  ├── testImportExport.ts    → Импорт/экспорт JSON
  └── testChainHelpers.ts    → Утилиты цепочек
```

### Firestore коллекции

```
tests/{testId}
  ├── title: string
  ├── rubric: 'full-course' | AgeRange
  ├── questions: TestQuestion[]
  ├── status: 'draft' | 'published' | 'unpublished'
  ├── prerequisiteTestId?: string
  └── appearance?: TestAppearance

testResults/{resultId}
  ├── userId: string
  ├── testId: string
  ├── score: number
  ├── percentage: number
  └── completedAt: Timestamp
```

**См. детали:** [../reference/firestore-schema.md](../reference/firestore-schema.md)

---

## Типы данных

### Основные интерфейсы

**Файл:** `src/types/tests.ts`

```typescript
// Рубрика теста
type TestRubric = 'full-course' | AgeRange;

// Статус публикации
type TestStatus = 'draft' | 'published' | 'unpublished';

// Политика показа правильного ответа
type RevealPolicy =
  | { mode: 'never' }
  | { mode: 'after_attempts'; attempts: number }
  | { mode: 'after_test' }
  | { mode: 'immediately' };

// Вопрос теста
interface TestQuestion {
  id: string;
  questionText: string;
  answers: QuestionAnswer[];          // 2-8 вариантов
  correctAnswerId: string | null;
  shuffleAnswers: boolean;
  revealPolicy: RevealPolicy;
  explanation?: string;
  customRightMsg?: string;
  customWrongMsg?: string;
  imageUrl?: string;                  // Firebase Storage
  audioUrl?: string;                  // Firebase Storage
  videoUrl?: string;                  // YouTube/Vimeo
}

// Полная структура теста
interface Test {
  id: string;
  title: string;
  rubric: TestRubric;
  prerequisiteTestId?: string;        // Предыдущий тест в цепочке
  requiredPercentage?: number;        // Порог для разблокировки (70%)
  questionCount: number;              // 1-20
  questions: TestQuestion[];
  status: TestStatus;
  defaultRevealPolicy?: RevealPolicy;
  appearance?: TestAppearance;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

**Полный список типов:** `src/types/tests.ts`, `src/types/testResults.ts`

---

## Основные компоненты

### TestsPage.tsx (314 строк)

**Путь:** `src/pages/TestsPage.tsx`

**Маршруты:**
- `/tests` — тесты по всему курсу
- `/tests/age-periods` — тесты по возрастным периодам

**Что делает:**
- Загружает опубликованные тесты через `getPublishedTests()`
- Группирует в цепочки через `buildTestChains()`
- Отображает карточки тестов с информацией о разблокировке
- Показывает placeholder для будущих тестов

### DynamicTest.tsx (262 строки)

**Путь:** `src/pages/DynamicTest.tsx`

**URL:** `/tests/dynamic/:testId`

**Этапы:**
1. **Загрузка теста** — проверка статуса и разблокировки
2. **Стартовый экран** — название, иконка, описание, bullet points
3. **Экран вопроса** — текст, медиа, варианты ответов, проверка
4. **Экран результатов** — процент, разбивка по вопросам, сохранение в Firestore

**Ключевые функции:**
- `isTestUnlocked()` — проверка доступа
- `saveTestResult()` — сохранение результата
- `resolveRevealPolicy()` — определение политики показа ответа

### TestEditorForm.tsx (215 строк)

**Путь:** `src/components/TestEditorForm.tsx`

**Статус:** Рефакторинг завершён (модульная архитектура)

**Секции:**
- `TestBasicMetadata` — название, рубрика, количество вопросов
- `TestPrerequisiteConfig` — настройка цепочки тестов
- `TestThemeSection` — выбор темы и градиентов
- `TestQuestionsManager` — управление вопросами
- `TestActionButtons` — черновик / опубликовать / снять

**Хуки:**
- `useTestEditorForm` — состояние формы
- `useTestTheme` — работа с темами
- `useTestPrerequisite` — логика prerequisite
- `useTestSave` — сохранение и валидация

### QuestionEditor.tsx (379 строк)

**Путь:** `src/components/QuestionEditor.tsx`

**Что редактирует:**
- Текст вопроса
- Варианты ответов (2-8, drag-and-drop)
- Правильный ответ
- Медиа (изображение, аудио, видео YouTube)
- Политика показа ответа
- Кастомные сообщения
- Пояснение
- Ресурсы (ссылки на материалы)

**Загрузка медиа:**
- Изображения → Firebase Storage (`tests/{testId}/questions/{questionId}/image.ext`)
- Аудио → Firebase Storage
- Видео → только URL (YouTube embed)

---

## API и бизнес-логика

### lib/tests.ts — CRUD операции

**Основные функции:**

```typescript
// Загрузка
getPublishedTests(): Promise<Test[]>
getTestById(testId: string): Promise<Test | null>

// Создание/обновление
createTest(data: CreateTestData): Promise<string>
updateTest(testId: string, updates: UpdateTestData): Promise<void>
deleteTest(testId: string): Promise<void>

// Вспомогательные
normalizeQuestion(data: any): TestQuestion
sanitizeQuestionForWrite(question: TestQuestion): any
```

### lib/testAccess.ts — Логика доступа

```typescript
isTestUnlocked(
  userId: string,
  prerequisiteTestId?: string,
  requiredPercentage: number = 70
): Promise<boolean>
```

**Логика:**
1. Если `prerequisiteTestId` не указан → разблокирован
2. Загрузить результаты пользователя по prerequisite тесту
3. Найти лучший результат
4. Если `bestResult >= requiredPercentage` → разблокирован

### lib/testResults.ts — Сохранение результатов

```typescript
saveTestResult(
  userId: string,
  testId: string,
  score: number,
  totalQuestions: number,
  timeSpent?: number
): Promise<string>

getTestResults(userId: string, testId: string): Promise<TestResult[]>
getBestResult(userId: string, testId: string): Promise<TestResult | null>
```

**Детали реализации:** см. код в `src/lib/`

---

## Система цепочек тестов

### Концепция

Цепочки позволяют создавать прогрессию тестов, где каждый следующий уровень разблокируется только после успешного прохождения предыдущего.

```
Пример цепочки "Авторы психологии развития":

Root Test: "Базовый уровень"
  ├── prerequisiteTestId: null
  ├── requiredPercentage: 70%
  └── разблокирован всегда

Level 1: "Идентичность и мораль"
  ├── prerequisiteTestId: root.id
  ├── requiredPercentage: 70%
  └── разблокирован если root >= 70%

Level 2: "Экспертный уровень"
  ├── prerequisiteTestId: level1.id
  ├── requiredPercentage: 80%
  └── разблокирован если level1 >= 80%
```

### Алгоритм buildTestChains()

**Файл:** `src/utils/testChainHelpers.ts`

```typescript
interface TestChain {
  root: FirestoreTest;      // Корневой тест (без prerequisite)
  levels: FirestoreTest[];  // Тесты-уровни
}

function buildTestChains(tests: FirestoreTest[]): TestChain[] {
  // 1. Найти корневые тесты (без prerequisite)
  // 2. Для каждого корня построить линейную цепочку
  // 3. Максимальная длина: 3 уровня (константа MAX_CHAIN_LENGTH)
  // 4. Защита от циклов через visited Set
}
```

### Отображение

В `TestsPage.tsx` каждая цепочка отображается как одна карточка:
- Корневой тест показывается первым
- Уровни отображаются как кнопки ниже
- Заблокированные уровни помечены 🔒

---

## Внешний вид и темы

### Система тем

**Файл:** `src/utils/testAppearance.ts`

```typescript
interface TestAppearance {
  introIcon?: string;                  // Эмодзи для карточки
  introTitle?: string;                 // Заголовок
  introDescription?: string;           // Описание
  badgeIcon?: string;                  // Иконка бейджа
  badgeLabel?: string;                 // Текст бейджа
  badgeGradientFrom?: string;
  badgeGradientTo?: string;
  backgroundGradientFrom?: string;
  backgroundGradientTo?: string;
  accentGradientFrom?: string;
  accentGradientTo?: string;
  bulletPoints?: string[];
  theme?: ThemeSettings;               // Новая система тем
  resolvedTheme?: DerivedTheme;        // Вычисленная тема
}
```

### Функция mergeAppearance()

Объединяет пользовательские настройки с дефолтами и вычисляет финальную тему:

```typescript
export function mergeAppearance(appearance?: TestAppearance): TestAppearance {
  // 1. Определить preset (из THEME_PRESETS)
  // 2. Определить mainColor
  // 3. Применить overrides
  // 4. Вычислить производную тему
  // 5. Вернуть полный appearance с resolvedTheme
}
```

**Предустановленные темы:** `src/constants/themePresets.ts`

---

## Импорт и экспорт

**Файл:** `src/utils/testImportExport.ts`

### Основные функции

```typescript
// Экспорт теста в JSON
exportTestToJson(test: Test): string

// Импорт теста из JSON
importTestFromJson(jsonString: string): Partial<Test>

// Генерация шаблона вопросов (для AI)
generateQuestionsTemplate(count: number = 10): string
```

### Workflow

1. **Экспорт:** Тест → JSON файл → загрузка через браузер
2. **Импорт:** JSON файл → валидация → вставка в форму → сохранение админом
3. **Шаблон:** Генерация пустых вопросов → заполнение в AI → импорт

---

## Медиа-файлы

### Поддерживаемые типы

| Тип | Форматы | Макс. размер | Хранение |
|-----|---------|--------------|----------|
| **Изображения** | JPEG, PNG, GIF, WebP | 5 MB | Firebase Storage |
| **Аудио** | MP3, WAV, OGG | 10 MB | Firebase Storage |
| **Видео** | YouTube, Vimeo (URL) | — | Только URL |

### Пути в Storage

```
tests/{testId}/questions/{questionId}/image.{ext}
tests/{testId}/questions/{questionId}/audio.{ext}
```

### Загрузка

В `QuestionEditor.tsx`:
1. Проверка размера файла
2. Upload в Firebase Storage через `uploadBytes()`
3. Получение download URL через `getDownloadURL()`
4. Сохранение URL в поле вопроса

---

## Тестирование

### Unit Tests (Vitest)

```bash
npm test
```

**Покрыто:**
- `src/utils/testChainHelpers.test.ts` — утилиты цепочек
- `src/lib/__tests__/testsNormalization.test.ts` — нормализация данных

### Integration Tests

```bash
npm run test:integration
```

**Покрыто:**
- `tests/integration/testsWorkflow.test.ts` — создание, публикация, prerequisite
- `tests/integration/authStore.test.ts` — проверка ролей

### E2E Tests (Playwright)

```bash
npm run test:e2e:prod
```

**Тестовый URL:** https://psych-dev-site-git-red-background-alexey-zykovs-projects.vercel.app

**См. детали:** [../development/testing-workflow.md](../development/testing-workflow.md)

---

## Связанные документы

- 📘 [Архитектура проекта](../architecture/overview.md)
- 📋 [Testing Workflow](../development/testing-workflow.md)
- 🎓 [Multi-Course Integration](multi-course.md)
- 🗂️ [Audit Backlog](../processes/audit-backlog.md)

---

## Статистика

| Показатель | Значение |
|------------|----------|
| **Всего строк кода** | ~7300 |
| **Компонентов** | 10+ |
| **Хуков** | 8 |
| **Тестов** | 310 |
| **Потенциал оптимизации** | -38% |

---

**Последнее обновление:** 2026-01-08
**Версия:** 2.0

**Полная версия:** [archive/legacy/TESTS_SYSTEM_GUIDE_FULL.md](../archive/legacy/TESTS_SYSTEM_GUIDE_FULL.md)
