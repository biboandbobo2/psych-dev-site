# 📚 Полное руководство по системе тестирования

> **Версия:** 1.1
> **Дата:** 2025-11-08
> **Статус:** Частично отрефакторено (Фаза 1 и Задача 2.1 завершены)

## 🔗 Связанные документы

- 📋 **[Главная документация](../../README.md)** - навигация по всем документам проекта
- 📐 **[Архитектурные рекомендации](../../architecture/guidelines.md)** - правила и best practices
- 🔧 **[План рефакторинга тестов](./TESTS_REFACTORING_PLAN.md)** - детальный план улучшения этой системы
- 🗓️ **[План рефакторинга таймлайна](./TIMELINE_REFACTORING_PLAN.md)** - план улучшения связанной системы
- 🛠️ **[План рефакторинга основной части](./CORE_REFACTORING_PLAN.md)** - рефакторинг админки, заметок, профиля
- 📅 **[Система таймлайна](../../guides/timeline.md)** - интеграция через заметки и возрастные периоды

---

## 📑 Содержание

1. [Обзор системы](#обзор-системы)
2. [Архитектура и файловая структура](#архитектура-и-файловая-структура)
3. [Типы данных](#типы-данных)
4. [Основные компоненты](#основные-компоненты)
5. [Страницы приложения](#страницы-приложения)
6. [Бизнес-логика](#бизнес-логика)
7. [Система цепочек тестов](#система-цепочек-тестов)
8. [Внешний вид и темы](#внешний-вид-и-темы)
9. [Импорт и экспорт](#импорт-и-экспорт)
10. [Медиа-файлы](#медиа-файлы)
11. [Результаты и статистика](#результаты-и-статистика)
12. [План рефакторинга](#план-рефакторинга)

---

## Обзор системы

### Назначение

Система тестирования предназначена для создания, управления и прохождения интерактивных тестов по курсу психологии развития. Система поддерживает:

- ✅ Динамическое создание тестов через веб-интерфейс
- ✅ Два типа тестов: по всему курсу и по возрастным периодам
- ✅ Цепочки тестов с разблокировкой по результатам
- ✅ Медиа-контент (изображения, аудио, видео YouTube)
- ✅ Гибкую настройку внешнего вида
- ✅ Импорт/экспорт тестов в JSON
- ✅ Сохранение результатов и истории прохождений

### Роли пользователей

1. **Студент** - проходит тесты, видит результаты
2. **Администратор** - создаёт и редактирует тесты
3. **Супер-администратор** - управляет правами доступа

## 🔧 Команды тестирования и CI

- `npm run lint` — линтит всё дерево через ESLint и обеспечивает соблюдение проектных инвариантов.
- `npm run test` — запускает `vitest` в режиме наблюдения, удобно держать окно открытым при локальной разработке.
- `npm run test:ci` — последовательный `vitest --runInBand`, аналог команды `npm run test -- --runInBand` из backlog; используется в CI и CI-ориентированных локальных прогонках.
- `npm run build` — проверяет, что Vite собирает проект и что lazy-модули/экспортные точки не ломаются.
- `npm ci` — рекомендуемый способ установки зависимостей в CI/экспериментах, чтобы гарантировать повторяемость.

Новый GitHub Actions workflow (`.github/workflows/ci.yml`) прогоняет `npm ci`, `npm run lint`, `npm run test` и `npm run build` на `push`/`pull_request`, поэтому его можно считать эмуляцией этапов QA перед выпуском.

## ⚙️ Инфраструктура интеграционных тестов

1. **Firebase CLI** — используем `firebase-tools` (версия указана в `devDependencies`), но можно перейти на последнюю версию командой `npm install -g firebase-tools@latest`. Для CI/локальных прогонов рекомендуем явно запускать `npx firebase --version` или `npm run firebase:emulators:start` через скрипт, чтобы не полагаться на глобальные бинарники.

2. **Запуск эмуляторов** — конфигурация находится в `tests/integration/firebase.test.json`. Команда

   ```bash
   npm run firebase:emulators:start
   ```

   подхватывает `firestore`, `auth` и `storage` и прокидывает файл `tests/integration/firebase.test.json`, поэтому для интеграционных прогонов и ручной проверки достаточно запустить эту команду из корня проекта.

3. **Правила доступа** — для эмуляторов используем `tests/integration/firestore.rules` и `tests/integration/storage.rules`. Они открывают чтение/запись для всех коллекций и bucket-ов, что позволяет тестам честно писать данные без сложной настройки токенов. Эти файлы исполняются только в тестовом режиме (`--config tests/integration/firebase.test.json`), production-правила остаются в `firestore.rules`/`storage.rules`.

4. **Проект тестов** — `projectId` в конфигурации установлен как `psych-dev-site-test`, чтобы в Emulator Suite сохранялись отдельные наборы данных (`firebase emulators:export` можно использовать с этим проектом).

В следующих этапах (5.2.2 и далее) будем писать `tests/integration` и подключать хелперы, уже опираясь на эту инфраструктуру.

### 🧩 Базовый helper

`tests/integration/helper.ts` предоставляет функции для интеграционных прогонов:

- `initializeIntegrationApp()` — гарантирует, что Firebase Admin подключён к `psych-dev-site-test`.
- `resetFirestore()`/`resetAuth()`/`resetStorage()` — очищают состояние соответствующих сервисов в эмуляторах.
- `resetIntegrationData()` вызывает все три сброса сразу, что удобно вставить в `beforeEach`/`afterEach` тестов.

Helper автоматически подставляет порты эмуляторов и `projectId`, поэтому тестам достаточно подключиться к `tests/integration/helper.ts`.

### 📦 Скрипт для интеграций

- `npm run test:integration` — `vitest tests/integration --runInBand`. Ожидает, что эмуляторы подняты (например, через `npm run firebase:emulators:start`), и запускает их в последовательном режиме.
- В будущем можно дополнить `tests/integration` реальными сценариями, используя helper для подготовки/очистки данных (см. шаги 5.2.3 и далее).

### 📘 Сценарии, покрытые интеграциями

- `tests/integration/firestoreHelpers.test.ts` — проверяет сохранение/удаление периодов, canonical alias и фильтр опубликованных документов.
- `tests/integration/topics.test.ts` — создаёт, обновляет и удаляет документы в коллекции `topics`, чтобы протестировать CRUD-операции, используемые `useTopics`.
- `tests/integration/testsWorkflow.test.ts` — создаёт тесты через `src/lib/tests.ts`, проверяет `prerequisiteTestId`, публикацию/снятие, а также сохраняет результаты (`src/lib/testResults.ts`) и группирует попытки.
- `tests/integration/authStore.test.ts` — покрывает логику `useAuthStore`, чтобы проверить флаги `isAdmin`/`isSuperAdmin`/`isStudent` при разных ролях.

При необходимости добавляйте новые сценарии в `tests/integration/*`, ссылка на helper и команду `npm run test:integration` остаётся актуальной.

---

## Архитектура и файловая структура

### Общая схема

```
src/
├── types/
│   ├── tests.ts                 # 104 строки - типы тестов
│   └── testResults.ts           # 21 строка - типы результатов
├── lib/
│   ├── tests.ts                 # 558 строк - CRUD операции
│   ├── testAccess.ts            # 86 строк - логика доступа
│   └── testResults.ts           # 115 строк - сохранение результатов
├── utils/
│   ├── testAppearance.ts        # 169 строк - работа с темами
│   ├── testImportExport.ts      # 396 строк - импорт/экспорт JSON
│   └── testChainHelpers.ts      # ~200 строк - утилиты цепочек тестов ✅ НОВОЕ
├── components/
│   ├── TestEditorForm.tsx       # 215 строк ✅ ОРКЕСТРАТОР (см. план refactoring)
│   ├── TestEditorModal.tsx      # 313 строк 🟢 Оболочка над списком тестов
│   ├── QuestionEditor.tsx       # 379 строк 🟡 В работе (вынос медиа/ресурсов)
│   ├── QuestionPreview.tsx      # 312 строк
│   ├── TestHistory.tsx          # 196 строк ✅
│   ├── Field.tsx                # 21 строка ✅ НОВОЕ (переиспользуемое поле)
│   ├── EmojiPicker.tsx          # 95 строк ✅ НОВОЕ (выбор эмодзи)
│   └── tests/
│       ├── TestCard.tsx         # ~180 строк ✅ НОВОЕ (карточка теста)
│       └── editor/
│           ├── TestBasicMetadata.tsx       # 120 строк ✅ НОВОЕ
│           ├── TestPrerequisiteConfig.tsx  # 231 строка ✅ НОВОЕ
│           ├── TestActionButtons.tsx       # 58 строк ✅ НОВОЕ
│           ├── TestQuestionsManager.tsx    # ~150 строк ✅ НОВОЕ
│           └── TestAppearanceEditor.tsx    # ~270 строк ✅ НОВОЕ
├── pages/
│   ├── TestsPage.tsx            # 314 строк 🟢 Единый список `/tests` + `/tests/age-periods`
│   ├── DynamicTest.tsx          # 262 строки 🟡 Требуется разбиение экрана вопросов
│   ├── AuthorsTest.tsx          # ❌ УДАЛЕНО (неиспользуемые ссылки)
│   ├── AuthorsTestLevel2.tsx    # ❌ УДАЛЕНО (неиспользуемые ссылки)
│   └── AuthorsTestLevel3.tsx    # ❌ УДАЛЕНО (неиспользуемые ссылки)
└── constants/
    └── themePresets.ts          # Предустановленные темы
```

### Общий объём кода

**До рефакторинга:**
- **Всего:** ~8800 строк
- **Мёртвый код:** ~1225 строк (AuthorsTest*)
- **Дублирование:** ~150-200 строк

**После Фазы 1 и Задачи 2.1 (текущее состояние):**
- **Всего:** ~7300 строк (-17%)
- **Мёртвый код:** 0 строк (удалены ссылки на AuthorsTest*)
- **Дублирование:** ~0 строк (вынесено в testChainHelpers.ts)
- **Создано новых компонентов:** 10 (7 editor + 2 shared + TestCard)
- **Улучшено:** TestEditorForm (-542 строки, -34.4%)

**Потенциал дальнейшей оптимизации:**
- QuestionEditor: 1126 → ~200 строк (цель)
- DynamicTest: 778 → ~150 строк (цель)
- **Итоговая цель:** ~5000-5500 строк (-38% от начального)

---

## Типы данных

### Основные интерфейсы (types/tests.ts)

#### TestRubric - Рубрика теста
```typescript
type TestRubric = 'full-course' | AgeRange;
```
- `'full-course'` - тест по всему курсу
- `AgeRange` - тест по конкретному возрастному периоду (intro, prenatal, infancy, toddler и т.д.)

#### TestStatus - Статус публикации
```typescript
type TestStatus = 'draft' | 'published' | 'unpublished';
```

#### RevealPolicy - Политика показа правильного ответа
```typescript
type RevealPolicy =
  | { mode: 'never' }                         // Никогда не показывать
  | { mode: 'after_attempts'; attempts: number } // После N попыток
  | { mode: 'after_test' }                    // После завершения теста
  | { mode: 'immediately' };                  // Сразу после ответа
```

#### TestQuestion - Вопрос теста
```typescript
interface TestQuestion {
  id: string;                          // UUID вопроса
  questionText: string;                // Текст вопроса
  answers: QuestionAnswer[];           // 2-8 вариантов ответа
  correctAnswerId: string | null;      // ID правильного ответа
  shuffleAnswers: boolean;             // Перемешивать ли варианты
  revealPolicy: RevealPolicy;          // Политика показа ответа
  revealPolicySource?: 'inherit' | 'custom'; // Наследовать от теста или своя
  explanation?: string;                // Пояснение к ответу
  customRightMsg?: string;             // Сообщение при правильном ответе
  customWrongMsg?: string;             // Сообщение при неправильном ответе
  resourcesRight?: TestResource[];     // Материалы при правильном ответе
  resourcesWrong?: TestResource[];     // Материалы при неправильном ответе
  imageUrl?: string;                   // URL картинки из Firebase Storage
  audioUrl?: string;                   // URL аудио из Firebase Storage
  videoUrl?: string;                   // URL видео (YouTube, Vimeo)
}
```

#### Test - Полная структура теста
```typescript
interface Test {
  id: string;                          // UUID теста
  title: string;                       // Название теста
  rubric: TestRubric;                  // Рубрика
  prerequisiteTestId?: string;         // ID теста-предшественника
  questionCount: number;               // Количество вопросов (1-20)
  questions: TestQuestion[];           // Массив вопросов
  status: TestStatus;                  // Статус публикации
  requiredPercentage?: number;         // Порог для разблокировки (по умолчанию 70%)
  defaultRevealPolicy?: RevealPolicy;  // Глобальная политика показа
  appearance?: TestAppearance;         // Настройки внешнего вида
  createdAt: Date;                     // Дата создания
  updatedAt: Date;                     // Дата последнего обновления
  createdBy: string;                   // UID создателя (admin)
}
```

#### TestAppearance - Внешний вид теста
```typescript
interface TestAppearance {
  introIcon?: string;                  // Эмодзи для стартового экрана
  introTitle?: string;                 // Заголовок для карточки теста
  introDescription?: string;           // Описание для карточки
  badgeIcon?: string;                  // Иконка бейджа уровня
  badgeLabel?: string;                 // Текст на бейдже
  badgeGradientFrom?: string;          // Цвет градиента бейджа (начало)
  badgeGradientTo?: string;            // Цвет градиента бейджа (конец)
  backgroundGradientFrom?: string;     // Цвет фона страницы (начало)
  backgroundGradientTo?: string;       // Цвет фона страницы (конец)
  accentGradientFrom?: string;         // Цвет акцента (кнопки)
  accentGradientTo?: string;           // Цвет акцента (конец)
  bulletPoints?: string[];             // Список особенностей теста
  theme?: ThemeSettings;               // Новая система тем
  resolvedTheme?: DerivedTheme;        // Вычисленная тема
}
```

### Результаты тестов (types/testResults.ts)

```typescript
interface TestResult {
  id: string;                          // UUID результата
  userId: string;                      // UID пользователя
  testId: string;                      // ID теста
  score: number;                       // Набранные баллы
  totalQuestions: number;              // Всего вопросов
  percentage: number;                  // Процент правильных ответов
  completedAt: Date;                   // Время завершения
  timeSpent?: number;                  // Время прохождения (мс)
}
```

---

## Основные компоненты

### ✅ TestEditorForm.tsx (216 строк) — модульный оркестратор

**Расположение:** `src/components/TestEditorForm.tsx`

**Статус:** Рефакторинг завершён (см. `docs/TEST_EDITOR_REFACTORING_PLAN.md`). Компонент оставляет только композицию и делегирует всю бизнес-логику в хуки/подкомпоненты.

**Ключевые элементы:**
1. **Слои состояния:** `useTestEditorForm`, `useTestTheme`, `useTestPrerequisite`, `useTestSave` отвечают за данные, валидацию и побочные эффекты. `TestEditorForm` подписывается на них и передаёт значения дальше.
2. **Секции UI:** `TestFormHeader`, `TestBasicMetadata`, `TestPrerequisiteConfig`, `TestThemeSection`, `TestQuestionsManager`, `TestActionButtons` — самостоятельные блоки, соответствующие структуре страницы.
3. **Динамические импорты:** тяжёлые зависимости (`getTestById`, экспорт JSON) подтягиваются только по запросу, чтобы не раздувать чанк модалки.

**Потоки данных:**
- При загрузке теста компонент через `useEffect` подтягивает внешние данные и пробрасывает их в `useTestTheme` и `useTestPrerequisite`.
- Импорт/экспорт тестов управляется через методы, которые отдаёт `useTestEditorForm`.
- Все кнопки действий (`черновик`, `опубликовать`, `снять с публикации`) используют обёртки из `useTestSave`, поэтому проверка состояния единообразна.

---

### 🟡 QuestionEditor.tsx (379 строк) — в работе

**Расположение:** `src/components/QuestionEditor.tsx`

**Назначение:** Редактор отдельного вопроса теста.

**Что делает:**
1. Редактирование текста вопроса
2. Управление вариантами ответов (2-8 штук)
3. Выбор правильного ответа
4. Загрузка медиа (изображение, аудио, видео YouTube)
5. Настройка политики показа правильного ответа
6. Установка кастомных сообщений (при правильном/неправильном ответе)
7. Добавление пояснения
8. Добавление ресурсов (ссылки на материалы)

**Props:**
```typescript
interface QuestionEditorProps {
  question: TestQuestion;
  index: number;
  onChange: (question: TestQuestion) => void;
  onDelete: () => void;
  testId?: string;
  defaultRevealPolicy?: RevealPolicy;
}
```

**Основные секции:**

1. **Текст вопроса (строки 100-200)**
   - Textarea с валидацией
   - Счётчик символов

2. **Варианты ответов (строки 200-500)**
   - Список ответов (2-8)
   - Добавление варианта
   - Удаление варианта
   - Выбор правильного через radio button
   - Drag & drop для изменения порядка

3. **Медиа-файлы (строки 500-700)**
   - Upload изображения → Firebase Storage
   - Upload аудио → Firebase Storage
   - Ввод YouTube URL (автоматическое преобразование в embed)
   - Предпросмотр загруженных файлов
   - Удаление файлов

4. **Настройки показа ответа (строки 700-850)**
   - Выбор между 'inherit' и 'custom'
   - Если custom:
     - Выбор mode (never, immediately, after_attempts, after_test)
     - Настройка количества attempts (если mode = after_attempts)

5. **Feedback (строки 850-1000)**
   - customRightMsg - сообщение при правильном ответе
   - customWrongMsg - сообщение при неправильном ответе
   - explanation - пояснение

6. **Ресурсы (строки 1000-1126)**
   - resourcesRight - ссылки при правильном ответе
   - resourcesWrong - ссылки при неправильном ответе
   - Добавление/удаление ресурсов

**Что осталось сделать:**
- Вынести медиа-блоки и списки ресурсов в подкомпоненты (`MediaUploader`, `QuestionResources`), чтобы UI не смешивался с API Firebase Storage.
- Перенести drag & drop ответов и управление правильным вариантом в хук, аналогичный `useTestQuestions`.
- Покрыть reveal-policy и кастомные сообщения юнит-тестами (см. `docs/audit-backlog.md`, раздел 5).

---

### QuestionPreview.tsx (312 строк) - НОРМАЛЬНО

**Расположение:** `src/components/QuestionPreview.tsx`

**Назначение:** Предпросмотр вопроса в модальном окне.

**Что делает:**
- Отображает вопрос так, как его увидит студент
- Показывает медиа (изображение, аудио, видео)
- Показывает варианты ответов
- Не интерактивен (только просмотр)

**Props:**
```typescript
interface QuestionPreviewProps {
  question: TestQuestion;
  onClose: () => void;
}
```

**Структура:**
- Модальное окно
- Текст вопроса
- Медиа-контент
- Список вариантов ответов (не кликабельны)
- Кнопка закрытия

---

### TestHistory.tsx (196 строк) - ✅ ХОРОШО

**Расположение:** `src/components/TestHistory.tsx`

**Назначение:** Отображение истории прохождений теста пользователем.

**Что делает:**
- Загружает результаты из Firestore
- Показывает список прохождений с процентом и датой
- Сортирует от новых к старым
- Показывает статистику (лучший результат, средний балл)

**Props:**
```typescript
interface TestHistoryProps {
  userId: string;
  testId: string;
}
```

**Структура:**
```
┌─────────────────────────────────┐
│  📊 История прохождений         │
├─────────────────────────────────┤
│  🏆 Лучший результат: 95%       │
│  📈 Средний балл: 82%           │
│  🔢 Всего попыток: 3            │
├─────────────────────────────────┤
│  ✅ 95% (19/20) - 05.11.2025    │
│  ⭕ 85% (17/20) - 04.11.2025    │
│  ⭕ 70% (14/20) - 03.11.2025    │
└─────────────────────────────────┘
```

---

### 🟢 TestEditorModal.tsx (313 строк) — тонкая оболочка

**Расположение:** `src/components/TestEditorModal.tsx`

**Роль:** объединяет список тестов, фильтры, импорт/экспорт и открывает `TestEditorForm` в одной модалке.

**Архитектура:**
- **Hooks:** `useTestsList`, `useTestsFilters`, `useTestImportExport`, `useTestDelete` полностью инкапсулируют данные и побочные эффекты.
- **Компоненты:** `TestsListHeader`, `TestsFilterPanel`, `TestsListTable`, `TestDeleteConfirmDialog` отвечают за UI.
- **Коммуникация:** все действия (создать, клонировать, удалить, импортировать) сводятся к вызову нужного hook-handler; сама модалка содержит только JSX-раскладку.

**План:** дальнейший рефакторинг не требуется; задача — поддерживать список hook-секций в актуальном состоянии по мере появления новых операций.

---

## Страницы приложения

### TestsPage.tsx (314 строк) — списки по курсу и периодам

**Расположение:** `src/pages/TestsPage.tsx`  
**Маршруты:** `/tests` (передаём `rubricFilter='full-course'`) и `/tests/age-periods` (`rubricFilter='age-periods'`).

**Назначение:** единый компонент, который показывает тесты по всему курсу или по возрастным периодам, переиспользуя одинаковые цепочки и карточки.

**Особенности реализации:**
- **Единый источник данных.** `getPublishedTests()` загружает весь список, после чего `useMemo` фильтрует его по выбранной рубрике.
- **Цепочки уровней.** `buildTestChains()` группирует prerequisite-отношения, чтобы карточка знала, какие уровни разблокируются дальше.
- **Компонент `TestCard`.** Одна карточка умеет отображать и основной тест, и дочерние уровни (включая статус "🔒", если prerequisite не пройден).
- **Ландшафт конфигураций.** `PAGE_CONFIGS` управляет заголовком, описанием и подсказками для каждого режима, а `COURSE_TESTS` рендерит placeholder-карточки «Скоро» для режима `full-course`.
- **Логирование.** Каждая загрузка и проверка доступа оборачивается в `debugLog`/`debugError`, чтобы не использовать `console.*`.

Таким образом, дублирование между старым `Tests.tsx` и `AgeTests.tsx` устранено, а переключение контекста происходит через проп `rubricFilter`.

---

### DynamicTest.tsx (262 строк) - Прохождение теста

**Расположение:** `src/pages/DynamicTest.tsx`  
**URL:** `/tests/dynamic/:testId`

**Назначение:** Страница для прохождения любого теста.

**Этапы работы:**

#### 1. Загрузка теста (строки 91-149)
```typescript
useEffect(() => {
  const loadTest = async () => {
    // 1. Проверка testId и user
    // 2. Загрузка теста через getTestById()
    // 3. Проверка статуса (только published)
    // 4. Проверка разблокировки через isTestUnlocked()
    // 5. Установка теста в state
  };
  loadTest();
}, [testId, user]);
```

#### 2. Стартовый экран (строки 330-405)
Показывается когда `!started`:
- Название теста
- Иконка и бейдж (если есть)
- Описание из appearance.introDescription
- Bullet points (особенности теста)
- Кнопка "Начать тест"

#### 3. Экран вопроса (строки 490-665)
Показывается когда `started && !finished`:

**Отображение:**
- Прогресс-бар (текущий вопрос / всего)
- Текст вопроса
- Медиа (изображение, аудио, видео YouTube)
- Варианты ответов (перемешанные или нет)
- Индикация выбранного ответа
- Кнопка "Ответить"

**Логика проверки ответа:**
```typescript
const handleSubmitAnswer = () => {
  if (!selectedAnswer || !currentQuestion) return;

  const isCorrect = selectedAnswer === currentQuestion.correctAnswerId;
  
  if (isCorrect) {
    setScore(score + 1);
    setAnswerState('correct');
  } else {
    setAnswerState('incorrect');
    setAttemptCount(attemptCount + 1);
  }

  // Определение, показывать ли правильный ответ
  const shouldReveal = /* логика на основе RevealPolicy */;
  setShowExplanation(shouldReveal);
};
```

**Показ правильного ответа:**
Зависит от `revealPolicy`:
- `never` - никогда не показывается
- `immediately` - сразу после ответа
- `after_attempts` - после N попыток
- `after_test` - только на экране результатов

**Навигация:**
- Кнопка "Далее" → следующий вопрос
- Последний вопрос → завершение теста

#### 4. Экран результатов (строки 665-780)
Показывается когда `finished`:

**Отображение:**
- Поздравление или сообщение о неудаче
- Процент правильных ответов
- Количество правильных / всего
- Разбивка результатов по вопросам:
  - ✅ Правильный ответ
  - ❌ Неправильный ответ
  - Показ правильного варианта (если политика позволяет)
  - Пояснение (если есть)
  - Ресурсы (если есть)

**Действия:**
- "Пройти тест заново" - сброс состояния
- "Вернуться к списку тестов" - навигация (зависит от rubric)

**Сохранение результата:**
```typescript
useEffect(() => {
  if (finished && !resultSaved && user && testId) {
    const saveResult = async () => {
      const timeSpent = startTime ? Date.now() - startTime.getTime() : undefined;
      await saveTestResult(user.uid, testId, score, totalQuestions, timeSpent);
      setResultSaved(true);
    };
    saveResult();
  }
}, [finished, resultSaved, user, testId, score, totalQuestions, startTime]);
```

**Навигация назад:**
Зависит от рубрики теста:
```typescript
const backUrl = useMemo(() => {
  if (!test) return '/tests';
  return test.rubric === 'full-course' ? '/tests' : '/tests/age-periods';
}, [test?.rubric]);
```

**Вспомогательные функции:**

```typescript
// Перемешивание вариантов ответов
function shuffleArray<T>(items: T[]): T[] {
  // Fisher-Yates shuffle
}

// Определение политики показа для вопроса
function resolveRevealPolicy(question, defaultPolicy): RevealPolicy {
  // Логика наследования или использования custom
}

// Проверка, показывать ли ответ на экране результатов
function shouldRevealOnResults(policy: RevealPolicy): boolean {
  if (policy.mode === 'never') return false;
  if (policy.mode === 'after_test') return true;
  return true; // immediately и after_attempts тоже показываем
}
```

**Проблемы:**
- ⚠️ Слишком много состояний (12+ useState)
- ⚠️ Смешение логики загрузки, навигации, проверки ответов
- ⚠️ Много условных return'ов (8 штук)
- ⚠️ Можно разбить на отдельные компоненты-экраны

---

### AuthorsTest.tsx, AuthorsTestLevel2/3.tsx (1225 строк) - УСТАРЕЛО

**Расположение:** `src/pages/AuthorsTest*.tsx`  
**URL:** `/tests/authors`, `/tests/authors/level2`, `/tests/authors/level3`

**⚠️ ТРЕБУЕТСЯ УДАЛЕНИЕ**

Эти файлы:
- Hardcoded тесты про психологов развития
- Созданы до появления DynamicTest
- Всё ещё в роутинге App.jsx
- Занимают ~1225 строк кода
- Не используются в продакшене

**План удаления:**
1. Мигрировать данные тестов в Firestore
2. Удалить файлы
3. Удалить роуты из App.jsx
4. Удалить imports

---

## Бизнес-логика

### lib/tests.ts (558 строк) - CRUD операции

**Функции для работы с Firestore:**

#### getPublishedTests()
```typescript
async function getPublishedTests(): Promise<Test[]>
```
- Загружает все опубликованные тесты (`status === 'published'`)
- Сортирует по дате создания (новые сначала)
- Преобразует Firestore timestamps в Date
- Нормализует вопросы через `normalizeQuestion()`

#### getTestById()
```typescript
async function getTestById(testId: string): Promise<Test | null>
```
- Загружает конкретный тест по ID
- Возвращает null если не найден
- Нормализует данные

#### createTest()
```typescript
async function createTest(testData: CreateTestData): Promise<string>
```
- Создаёт новый тест в Firestore
- Генерирует UUID
- Устанавливает timestamps (createdAt, updatedAt)
- Устанавливает createdBy = текущий пользователь
- Санитизирует вопросы через `sanitizeQuestionForWrite()`
- Возвращает ID нового теста

#### updateTest()
```typescript
async function updateTest(testId: string, updates: UpdateTestData): Promise<void>
```
- Обновляет существующий тест
- Обновляет updatedAt
- Санитизирует вопросы
- Мержит с существующими данными

#### deleteTest()
```typescript
async function deleteTest(testId: string): Promise<void>
```
- Удаляет тест из Firestore
- ⚠️ TODO: Нужно добавить проверку на зависимости (prerequisite)

**Вспомогательные функции:**

#### normalizeQuestion()
```typescript
function normalizeQuestion(data: any): TestQuestion
```
Преобразует данные из Firestore в TestQuestion:
- Устанавливает дефолтные значения
- Преобразует строки в массивы
- Добавляет поля медиа (imageUrl, audioUrl, videoUrl)

#### sanitizeQuestionForWrite()
```typescript
function sanitizeQuestionForWrite(question: TestQuestion): any
```
Подготавливает вопрос для записи в Firestore:
- Удаляет undefined значения
- Преобразует массивы
- Сохраняет медиа-поля

---

### lib/testAccess.ts (86 строк) - Логика доступа

**Функция разблокировки:**

#### isTestUnlocked()
```typescript
async function isTestUnlocked(
  userId: string,
  prerequisiteTestId?: string,
  requiredPercentage: number = 70
): Promise<boolean>
```

**Логика:**
```
1. Если prerequisiteTestId не указан → тест разблокирован
2. Загрузить результаты пользователя по prerequisite тесту
3. Если нет результатов → тест заблокирован
4. Найти лучший результат
5. Если лучший результат >= requiredPercentage → разблокирован
6. Иначе → заблокирован
```

**Пример:**
```typescript
// Тест "Авторы Уровень 2" требует 80% на "Авторах Уровень 1"
const unlocked = await isTestUnlocked(
  user.uid,
  'авторы-уровень-1-id',
  80
);
// unlocked = true, если пользователь набрал >= 80% на первом уровне
```

---

### lib/testResults.ts (115 строк) - Сохранение результатов

#### saveTestResult()
```typescript
async function saveTestResult(
  userId: string,
  testId: string,
  score: number,
  totalQuestions: number,
  timeSpent?: number
): Promise<string>
```

**Что делает:**
1. Вычисляет процент: `(score / totalQuestions) * 100`
2. Создаёт объект TestResult
3. Сохраняет в Firestore коллекцию `testResults`
4. Возвращает ID результата

**Структура в Firestore:**
```
testResults/
  ├─ {resultId1}/
  │   ├─ userId: "abc123"
  │   ├─ testId: "test-xyz"
  │   ├─ score: 18
  │   ├─ totalQuestions: 20
  │   ├─ percentage: 90
  │   ├─ completedAt: Timestamp
  │   └─ timeSpent: 125000
  └─ {resultId2}/
      └─ ...
```

#### getTestResults()
```typescript
async function getTestResults(userId: string, testId: string): Promise<TestResult[]>
```
- Загружает все результаты пользователя по конкретному тесту
- Сортирует по дате (новые сначала)

#### getBestResult()
```typescript
async function getBestResult(userId: string, testId: string): Promise<TestResult | null>
```
- Находит лучший результат пользователя
- Используется для разблокировки следующих уровней

---

## Система цепочек тестов

### Концепция

Цепочки позволяют создавать прогрессию тестов, где каждый следующий уровень разблокируется только после успешного прохождения предыдущего.

### Структура цепочки

```typescript
interface TestChain {
  root: FirestoreTest;      // Корневой тест (без prerequisite)
  levels: FirestoreTest[];  // Тесты-уровни (с prerequisiteTestId)
}
```

**Пример:**
```
Цепочка: "Авторы психологии развития"
├─ Root: "Авторы: базовый уровень" (prerequisiteTestId = null)
├─ Level 1: "Авторы: идентичность и мораль" (prerequisiteTestId = root.id, requiredPercentage = 70)
└─ Level 2: "Авторы: экспертный уровень" (prerequisiteTestId = level1.id, requiredPercentage = 80)
```

### Алгоритм buildTestChains()

**Расположение:** Tests.tsx и AgeTests.tsx (дублируется!)

```typescript
function buildTestChains(tests: FirestoreTest[]): TestChain[] {
  // 1. Создать Map для быстрого доступа к тестам по ID
  const map = new Map<string, FirestoreTest>();
  for (const test of tests) {
    map.set(test.id, test);
  }

  // 2. Найти корневые тесты (без prerequisite или с несуществующим)
  const roots: FirestoreTest[] = [];
  for (const test of tests) {
    if (!test.prerequisiteTestId || !map.has(test.prerequisiteTestId)) {
      roots.push(test);
    }
  }

  // 3. Для каждого корня построить цепочку
  const chains: TestChain[] = [];
  for (const root of roots) {
    const visited = new Set<string>();
    visited.add(root.id);

    let current: FirestoreTest | undefined = root;
    const levels: FirestoreTest[] = [];

    // 4. Идти по цепочке до максимальной длины (3 уровня)
    while (current && levels.length < MAX_CHAIN_LENGTH) {
      // Найти тесты, которые ссылаются на текущий
      const successors = tests.filter(
        (t) => t.prerequisiteTestId === current!.id && !visited.has(t.id)
      );
      
      if (successors.length === 0) break;

      const next = successors[0]; // Берём первый (если их несколько)
      visited.add(next.id);
      levels.push(next);
      current = next;
    }

    chains.push({ root, levels });
  }

  return chains;
}
```

### Отображение цепочки

**В Tests.tsx / AgeTests.tsx:**

```jsx
{testChains.map((chain) => {
  const { root, levels } = chain;
  
  return (
    <div className="test-card">
      {/* Корневой тест */}
      <Link to={`/tests/dynamic/${root.id}`}>
        <h3>{root.title}</h3>
        <p>{appearance.introDescription}</p>
        <span>📋 {root.questionCount} вопросов</span>
        {levels.length > 0 && (
          <span>🔥 {levels.length} уровня</span>
        )}
      </Link>
      
      {/* Уровни */}
      {levels.length > 0 && (
        <div className="levels">
          {levels.map((level, idx) => (
            <LevelButton 
              key={level.id}
              test={level}
              index={idx}
              unlocked={testUnlockStatus[level.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
})}
```

### Проверка разблокировки

**В DynamicTest.tsx при загрузке:**

```typescript
// Проверить, разблокирован ли тест для пользователя
if (loadedTest.prerequisiteTestId) {
  const unlocked = await isTestUnlocked(
    user.uid,
    loadedTest.prerequisiteTestId,
    loadedTest.requiredPercentage ?? 70
  );
  
  if (!unlocked) {
    setError('Сначала пройдите предыдущий тест');
    return;
  }
}
```

**В Tests.tsx / AgeTests.tsx:**

```typescript
// Загрузить статусы разблокировки для всех тестов
useEffect(() => {
  if (user) {
    const unlockStatus: Record<string, boolean> = {};
    for (const test of tests) {
      unlockStatus[test.id] = await isTestUnlocked(
        user.uid,
        test.prerequisiteTestId,
        test.requiredPercentage ?? 70
      );
    }
    setTestUnlockStatus(unlockStatus);
  }
}, [user, tests]);
```

### Ограничения

- **Максимальная длина цепочки:** 3 уровня (константа MAX_CHAIN_LENGTH)
- **Линейность:** Цепочка всегда линейная (нет ветвления)
- **Один prerequisite:** У теста может быть только один предыдущий тест
- **Нет циклов:** Защита через visited Set

---

## Внешний вид и темы

### Система тем

**Файл:** `utils/testAppearance.ts` (169 строк)

Система позволяет настраивать внешний вид теста через:
1. Предустановленные темы (presets)
2. Кастомные цвета и градиенты
3. Автоматическое вычисление производных цветов

### Структура темы

```typescript
interface ThemeSettings {
  presetId: string;              // ID preset'а из THEME_PRESETS
  mainColor: string;             // Основной цвет (hex)
  badgeLockedToPrimary: boolean; // Связать ли badge с primary цветом
  overrides?: ThemeOverrides;    // Переопределения градиентов
}

interface DerivedTheme {
  background: Gradient;  // Градиент фона
  primary: Gradient;     // Основной градиент (иконки, кнопки)
  badge: Gradient;       // Градиент бейджа
}
```

### Функция mergeAppearance()

**Назначение:** Объединяет пользовательские настройки с дефолтами и вычисляет финальную тему.

**Логика:**

```typescript
export function mergeAppearance(appearance?: TestAppearance): TestAppearance {
  // 1. Определить preset
  const preset = findPresetById(appearance?.theme?.presetId ?? DEFAULT_PRESET);
  
  // 2. Определить mainColor
  // - Из theme.mainColor
  // - ИЛИ из accentGradient (mix двух цветов)
  // - ИЛИ дефолтный цвет preset'а
  
  // 3. Определить badgeLockedToPrimary
  // - Из theme.badgeLockedToPrimary
  // - ИЛИ автоматически (если badge != primary цвета)
  
  // 4. Создать overrides из старых полей
  // - backgroundGradient → overrides.background
  // - accentGradient → overrides.primary
  // - badgeGradient → overrides.badge
  
  // 5. Вычислить производную тему
  const derived = deriveTheme(preset, mainColor, badgeLockedToPrimary, overrides);
  
  // 6. Вернуть полный объект appearance с resolvedTheme
  return {
    ...DEFAULT_TEST_APPEARANCE,
    ...appearance,
    theme: { presetId, mainColor, badgeLockedToPrimary, overrides },
    resolvedTheme: derived
  };
}
```

### Функция createGradient()

```typescript
export function createGradient(
  from?: string, 
  to?: string, 
  gradient?: Gradient
): string {
  // Если есть готовый gradient объект - использовать его
  if (gradient) {
    return gradientToCss(gradient);
  }
  
  // Иначе создать простой linear-gradient
  const start = from || '#7c3aed';
  const end = to || start || '#7c3aed';
  return `linear-gradient(135deg, ${start}, ${end})`;
}
```

### Использование в компонентах

**В TestEditorForm:**
```typescript
// При изменении темы
const handleThemeChange = () => {
  const newAppearance = {
    ...appearance,
    theme: {
      presetId: selectedPreset.id,
      mainColor: customColor,
      badgeLockedToPrimary: lockBadge,
      overrides: customGradients
    }
  };
  
  // mergeAppearance вычислит производную тему
  const merged = mergeAppearance(newAppearance);
  setAppearance(merged);
};
```

**В DynamicTest / Tests / AgeTests:**
```typescript
const appearance = mergeAppearance(test.appearance);

// Использовать готовые градиенты
const pageStyle = {
  backgroundImage: createGradient(
    appearance.backgroundGradientFrom,
    appearance.backgroundGradientTo,
    appearance.resolvedTheme?.background
  )
};

const buttonStyle = {
  backgroundImage: createGradient(
    appearance.accentGradientFrom,
    appearance.accentGradientTo,
    appearance.resolvedTheme?.primary
  )
};
```

### Предустановленные темы

**Файл:** `constants/themePresets.ts`

```typescript
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'purple-blue',
    name: 'Фиолетово-синий',
    defaultMainColor: '#7c3aed',
    // ... настройки градиентов
  },
  {
    id: 'ocean',
    name: 'Океан',
    defaultMainColor: '#0ea5e9',
    // ...
  },
  // ... другие
];
```

---

## Импорт и экспорт

### Файл testImportExport.ts (396 строк)

**Функции:**

#### exportTestToJson()
```typescript
export function exportTestToJson(test: Test): string
```
- Преобразует объект Test в JSON
- Форматирует с отступами (2 пробела)
- Включает все данные: метаданные, вопросы, appearance

#### importTestFromJson()
```typescript
export function importTestFromJson(jsonString: string): Partial<Test>
```
- Парсит JSON
- Валидирует структуру
- Возвращает объект для вставки в форму
- ⚠️ НЕ создаёт тест сразу (только возвращает данные)

#### generateQuestionsTemplate()
```typescript
export function generateQuestionsTemplate(count: number = 10): string
```
- Генерирует шаблон JSON с пустыми вопросами
- Используется для упрощения создания тестов в AI

**Пример шаблона:**
```json
[
  {
    "questionText": "Вопрос 1?",
    "answers": [
      { "text": "Вариант A" },
      { "text": "Вариант B" },
      { "text": "Вариант C" },
      { "text": "Вариант D" }
    ],
    "correctAnswerIndex": 0,
    "shuffleAnswers": true
  },
  // ... ещё 9 вопросов
]
```

### Workflow импорта

1. **В TestEditorForm:**
   ```typescript
   const handleImport = async (file: File) => {
     const content = await readFileAsText(file);
     const imported = importTestFromJson(content);
     
     // Установить данные в форму
     setTitle(imported.title || '');
     setQuestions(imported.questions || []);
     setAppearance(imported.appearance || {});
     // ...
   };
   ```

2. **Импорт только вопросов:**
   ```typescript
   const handleImportQuestions = async (file: File) => {
     const content = await readFileAsText(file);
     const parsed = JSON.parse(content);
     
     // Преобразовать в TestQuestion[]
     const questions = parsed.map(normalizeQuestion);
     setQuestions(questions);
   };
   ```

3. **Сохранение:**
   - Пользователь проверяет данные
   - Нажимает "Сохранить"
   - Данные идут в createTest() или updateTest()

### Workflow экспорта

1. **Экспорт всего теста:**
   ```typescript
   const handleExport = () => {
     const json = exportTestToJson(currentTest);
     downloadJson(json, `test-${currentTest.id}.json`);
   };
   ```

2. **Экспорт шаблона вопросов:**
   ```typescript
   const handleExportTemplate = () => {
     const template = generateQuestionsTemplate(20);
     downloadJson(template, 'questions-template.json');
   };
   ```

---

## Медиа-файлы

### Поддерживаемые типы

1. **Изображения:**
   - Форматы: JPEG, PNG, GIF, WebP
   - Максимальный размер: 5 MB
   - Хранение: Firebase Storage
   - Путь: `tests/{testId}/questions/{questionId}/image.{ext}`

2. **Аудио:**
   - Форматы: MP3, WAV, OGG
   - Максимальный размер: 10 MB
   - Хранение: Firebase Storage
   - Путь: `tests/{testId}/questions/{questionId}/audio.{ext}`

3. **Видео:**
   - Поддержка: YouTube, Vimeo (через URL)
   - Хранение: только URL в Firestore
   - Автоматическое преобразование в embed URL

### Загрузка файлов

**В QuestionEditor:**

```typescript
const handleImageUpload = async (file: File) => {
  if (!testId) return;
  
  // 1. Проверка размера
  if (file.size > 5 * 1024 * 1024) {
    alert('Файл слишком большой (максимум 5MB)');
    return;
  }
  
  // 2. Создать путь в Storage
  const ext = file.name.split('.').pop();
  const path = `tests/${testId}/questions/${question.id}/image.${ext}`;
  
  // 3. Загрузить файл
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  
  // 4. Получить download URL
  const downloadURL = await getDownloadURL(storageRef);
  
  // 5. Обновить вопрос
  onChange({
    ...question,
    imageUrl: downloadURL
  });
};
```

### Отображение медиа

**В DynamicTest / QuestionPreview:**

```typescript
{/* Изображение */}
{question.imageUrl && (
  <img 
    src={question.imageUrl} 
    alt="Вопрос"
    className="max-w-full rounded-lg"
  />
)}

{/* Аудио */}
{question.audioUrl && (
  <audio controls className="w-full">
    <source src={question.audioUrl} />
  </audio>
)}

{/* YouTube видео */}
{question.videoUrl && (
  <iframe
    src={getYouTubeEmbedUrl(question.videoUrl)}
    className="w-full aspect-video rounded-lg"
    allowFullScreen
  />
)}
```

### Функция getYouTubeEmbedUrl()

**Расположение:** `utils/mediaUpload.ts`

```typescript
export function getYouTubeEmbedUrl(url: string): string {
  // Извлечь video ID из различных форматов:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  
  return url; // Вернуть как есть, если не удалось распарсить
}
```

### Удаление медиа

```typescript
const handleDeleteImage = async () => {
  if (!question.imageUrl) return;
  
  try {
    // 1. Извлечь путь из URL
    const pathMatch = question.imageUrl.match(/tests%2F.+?\?/);
    if (pathMatch) {
      const path = decodeURIComponent(pathMatch[0].replace('?', ''));
      const storageRef = ref(storage, path);
      
      // 2. Удалить файл из Storage
      await deleteObject(storageRef);
    }
    
    // 3. Удалить URL из вопроса
    onChange({
      ...question,
      imageUrl: undefined
    });
  } catch (error) {
    console.error('Ошибка удаления:', error);
  }
};
```

### Проблемы с медиа

**Исправленные баги:**
1. ✅ Медиа не сохранялись в Firestore (normalizeQuestion и sanitizeQuestionForWrite не включали поля)
2. ✅ Нет прав на чтение из Storage (исправлено в storage.rules)

**Текущие ограничения:**
- Нет прогресс-бара загрузки
- Нет оптимизации изображений (сжатие, resize)
- Нет превью перед загрузкой
- Нет batch удаления при удалении теста

---

## Результаты и статистика

### TestHistory компонент

**Расположение:** `src/components/TestHistory.tsx` (196 строк)

**Что отображает:**
- История всех прохождений теста пользователем
- Лучший результат (🏆)
- Средний балл (📈)
- Количество попыток (🔢)
- Список результатов с датами

**Пример:**
```
┌────────────────────────────────┐
│ 📊 История прохождений         │
├────────────────────────────────┤
│ 🏆 Лучший: 95% (19/20)         │
│ 📈 Средний: 82%                │
│ 🔢 Попыток: 3                  │
├────────────────────────────────┤
│ ✅ 95% (19/20) - 05.11.2025   │
│ ⭕ 85% (17/20) - 04.11.2025   │
│ ⭕ 70% (14/20) - 03.11.2025   │
└────────────────────────────────┘
```

### Интеграция с Profile

**В App.jsx:**
```typescript
// Добавление тестов к периодам в "Рабочая тетрадь"
if (config.periodId) {
  // Загрузить тесты для периода
  const tests = await getPublishedTests();
  const filtered = tests.filter(t => t.rubric === config.periodId);
  
  // Отобразить иконки тестов рядом с ссылкой на тетрадь
  filtered.map(test => (
    <Link to={`/tests/dynamic/${test.id}`} title={test.title}>
      📖
    </Link>
  ))
}
```

---
