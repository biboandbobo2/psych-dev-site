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

**Что происходит:** скрипт автоматически поднимает Firebase эмуляторы (Firestore, Auth, Storage) через `firebase emulators:exec`, гоняет тесты через `vitest run --no-file-parallelism`, гасит эмуляторы.

**Требования:**
- `firebase-tools` в `node_modules` (есть через `npm install`).
- **Java 11+** (для эмуляторов Firestore/Auth). На macOS: `brew install openjdk@21`, затем добавить в PATH/`JAVA_HOME` (см. инструкции `brew info openjdk@21`).
- Свободные порты `8080`, `9099`, `9199`.

**Watch-режим (для разработки):**
```bash
# Терминал 1 — поднять эмуляторы один раз
npm run firebase:emulators:start

# Терминал 2 — vitest в watch-режиме
npm run test:integration:watch
```

**Покрыто:**
- `tests/integration/authStore.test.ts` — pure store role derivation (не требует эмуляторов).
- `tests/integration/testsWorkflow.test.ts` — tests CRUD + prerequisite, testResults flows.
- `tests/integration/topics.test.ts` — topics CRUD в Firestore.
- `tests/integration/firestoreHelpers.test.ts` — periods canonical/публикация.
- `tests/integration/firestoreRules.test.ts` — регрессионная матрица прод-`firestore.rules`
  через `@firebase/rules-unit-testing` (отдельный projectId, в эмулятор загружается
  настоящий `firestore.rules`). Проверяет, что `tests` доступен на read/list,
  server-only коллекции отказывают клиенту, per-uid ограничения уважаются,
  любая новая коллекция падает в default-deny. Ловит регрессии класса MR-8.

**Бесплатность:** все integration-тесты идут только в локальные эмуляторы. Никаких реальных Firebase project-вызовов и AI-API. Эмуляторы — Java-процесс offline, project ID `psych-dev-site-test` фиктивный.

### E2E Tests (Playwright)

```bash
npm run test:e2e:prod
```

**Тестовый URL:** https://psych-dev-site-git-red-background-alexey-zykovs-projects.vercel.app

**См. детали:** [../development/testing-workflow.md](../development/testing-workflow.md)

---

## Чек-лист при создании теста

Девять классов ошибок, на которые мы наступали при подготовке экзаменационной серии по общей психологии (май 2026). Перед публикацией нового теста — пройти все девять.

### Группа A. Анти-подсказки в самом тесте

#### 1. Порядок вопросов ≠ порядок исходного списка

Не оставляй массив `questions` в порядке билета/задания. Если студент помнит порядок исходника (а он помнит), он отвечает по позиции, не глядя на содержание. **Перетасуй порядок при сохранении в БД** — флага `shuffleQuestions` в схеме нет, порядок берётся из массива как есть.

#### 2. Визуальные признаки на фото

ЧБ-портрет XIX–начала XX века + 3 цветных дистрактора = один сразу отбрасывается «по виду эпохи». Группируй:
- ЧБ-фото → дистракторы тоже из «исторических».
- Цветное фото современника → дистракторы из современников.
- Переходные фигуры (умершие в 1980-х) — мост, можно ставить в обе группы.

#### 3. Уникальный признак правильного ответа

Если правильный — единственный в наборе по полу / национальности / эпохе / лауреатству, и все дистракторы по этому признаку отличаются — правильный угадывается «по признаку».

**Правильное решение:** добавь дистракторы **вне списка задания**, но с тем же признаком и из той же тематической области. Не удаляй вопрос «потому что не из чего выбрать» — это уход от проблемы.

Пример: единственная женщина в списке 10 учёных → дистракторы Энн Трейсман, Мэри Эйнсворт, Кэрол Двек (другие женщины-психологи, не из списка задания). В `explanation` коротко поясни, кто эти «внеспискoвые» — побочное расширение кругозора.

#### 4. Балансировка ответов

- **Частота дистракторов:** каждый персонаж/термин встречается как дистрактор минимум 1-2 раза за тест (цель: 2-5). Иначе «никогда не предлагается → значит правильный, когда появляется».
- **Длина ответов:** правильный не должен выделяться короче/длиннее остальных более чем на 2-3 символа. Особенно с короткими фамилиями («Карл Поппер» = 11 vs остальные 13-16) — добавь в группу других коротких.
- **Тематика дистракторов:** для кейс-теста дистракторы — из той же подсистемы (внимание → внимание, память → память). Иначе тест угадывается по «область → ответ».
- **Единый формат ответов:** «Имя Фамилия» везде, не смешивать «А. Н. Леонтьев» и «Алексей Леонтьев» в одном наборе.

### Группа B. Качество содержания

#### 5. Источники в `resourcesRight`

- **Запрещено:** `bigenc.ru/c/*` (БРЭ) — обрезает статью paywall'ом, пользователь видит огрызок.
- **Запрещено** как «источник определения»: общие монографии типа `marxists.org/.../words/index.htm` — целая книга Выготского не отвечает на вопрос про конкретное свойство ВПФ.
- **Запрещено:** `wikiquote.org` как «источник статьи» — это сборник цитат, не определение термина.
- **Предпочтительно:** `ru.wikipedia.org` (если есть статья на термин/персону), `en.wikipedia.org` (когда русской нет), Stanford Encyclopedia (`plato.stanford.edu`).
- **Унификация языка:** где есть ru.wiki — ставить русскую, не английскую. Унификация по тесту приятна студенту.
- **HTTP 200 ≠ хорошая ссылка.** `curl -sL -o /dev/null -w "%{http_code}"` отсеивает только 4xx/5xx. Перед публикацией **открыть каждую ссылку визуально** и убедиться, что страница попадает в нужный термин, а не в общую главу.

#### 6. `explanation`: с примером, с разбором каждого дистрактора

Сухой стиль «X — A. Y — B. Z — C.» — непонятен. После каждого ответа в `revealPolicy: immediately` появляется этот текст: он должен учить, а не повторять словарь. Формула:

```
[правильный ответ] — определение в одной фразе (например: [конкретный пример]).
[дистрактор 1] отличается тем, что [конкретное отличие].
[дистрактор 2] — [конкретное отличие].
[дистрактор 3] — [конкретное отличие].
```

Пример (T7 q9 «Понятие», после переписи): «Понятие фиксирует существенные общие черты класса объектов: "дерево", "деятельность", "справедливость" — это понятия. Суждение — утверждение или отрицание связи между ними ("дерево — растение"). Умозаключение — новое суждение, выведенное из других ("все растения дышат; дерево — растение; значит, дерево дышит"). Обобщение — операция мышления, через которую формируются понятия (выделение общего у группы объектов).»

#### 7. Реалистичность кейсов и числовых данных

- В числовых кейсах математика должна сходиться: «У Маши 8 яблок, треть отдала» — нереально (треть = 8/3, не целое). Исправили на 9.
- Терапевтические/жизненные кейсы должны быть правдоподобны: возраст, события, поведение клиента — не вступать в противоречие с возрастной нормой.
- Прогони каждый числовой и фактический пример «глазами» прежде чем публиковать.

### Группа C. Инфраструктура

#### 8. Firestore-индексы при новых запросах

Каждый клиентский запрос с `where(...) + orderBy(...)` (особенно по разным полям) **требует составного индекса**. Без него запрос падает с `400 FAILED_PRECONDITION`, и в `try/catch` через `debugError` ошибка молча проглатывается — фича просто не работает.

Конкретно: для `getAllTestResults(uid)` понадобился составной индекс `testResults(userId ASC, completedAt DESC)`; без него бейдж лучшего результата на карточке не появлялся.

При публикации новой клиентской логики чтения **проверять** в DevTools / через REST API, что нужный индекс существует и `READY`. При необходимости — добавить в [firestore.indexes.json](../../firestore.indexes.json) и деплоить (`firebase deploy --only firestore:indexes` или через REST API напрямую — см. [docs/processes/audit-backlog.md] историю MR-8/индексов).

#### 9. UI карточки теста: не дублировать информацию

- Если у теста есть уровни (цепочка), счётчик «🔥 X уровня» в строке метаданных избыточен — уровни видны как кнопки снизу. Убирать, иначе бейдж результата переносится на вторую строку и портит вид.
- **Бейдж лучшего результата** — в строку метаданных рядом с «📋 X вопросов», не в правый угол.
- **На кнопке уровня** в цепочке — бейдж результата справа, перед стрелкой `→`.

### Технические настройки по умолчанию

- `shuffleAnswers: true` в каждом вопросе.
- `revealPolicy: { mode: 'immediately' }` для каждого вопроса (явно — `defaultRevealPolicy` на уровне теста не наследуется через импорт).
- Непустой `explanation` (по правилу №6) + непустой `resourcesRight` (по правилу №5).
- Перед публикацией прогони список вопросов один раз сам — если хотя бы один отгадывается без знания содержания, переделай.

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
