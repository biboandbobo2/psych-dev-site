# 🗄️ Firestore Schema Reference

> **Дата:** 2026-01-09
> **Статус:** Актуальный справочник

Полная структура данных Firestore для Psych Dev Site.

---

## 📋 Содержание

1. [Пользователи и роли](#пользователи-и-роли)
2. [Образовательный контент](#образовательный-контент)
3. [Заметки и темы](#заметки-и-темы)
4. [Система тестирования](#система-тестирования)
5. [Таймлайн жизни](#таймлайн-жизни)
6. [Таблица по расстройствам](#таблица-по-расстройствам)
7. [Книги (RAG)](#книги-rag)
8. [Видео-транскрипты](#видео-транскрипты)
9. [Правила доступа](#правила-доступа)

---

## Пользователи и роли

### `users/{userId}`

Профили пользователей с системой ролей и гранулярным доступом к курсам.

```typescript
interface User {
  // Основная информация
  uid: string;                    // Уникальный ID пользователя (совпадает с Firebase Auth UID)
  email: string;                  // Email пользователя
  displayName: string;            // Отображаемое имя
  photoURL?: string;              // URL аватара (из Google)

  // Роли
  role: 'student' | 'admin' | 'super-admin';

  // Гранулярный доступ к курсам
  courseAccess?: {
    clinical?: boolean;           // Доступ к клинической психологии
    general?: boolean;            // Доступ к общей психологии
  };

  // Метаданные
  createdAt: Timestamp;
  lastLogin?: Timestamp;
}
```

**Права ролей:**
- **Student** — базовый доступ (контент, заметки, тесты, таймлайн)
- **Admin** — редактирование контента (`/admin/content`), управление темами (`/admin/topics`)
- **Super Admin** — управление пользователями (`/admin/users`), выдача ролей

**Пример документа:**
```json
{
  "uid": "abc123def456",
  "email": "student@example.com",
  "displayName": "Иван Петров",
  "photoURL": "https://lh3.googleusercontent.com/...",
  "role": "student",
  "courseAccess": {
    "clinical": true,
    "general": false
  },
  "createdAt": "2025-11-01T10:00:00Z",
  "lastLogin": "2026-01-08T15:30:00Z"
}
```

---

## Образовательный контент

### `periods/{periodId}`

Курс **психологии развития** — 14 возрастных периодов + intro.

```typescript
interface Period {
  // Идентификация
  id: string;                     // ID периода (prenatal, 0-1, 1-3, ..., intro)
  title: string;                  // Заголовок (напр., "0-1 год: Младенчество")
  subtitle: string;               // Подзаголовок

  // Статус
  published: boolean;             // Опубликован ли период
  order: number;                  // Порядок отображения (для drag-and-drop)

  // Визуальное оформление
  accent: string;                 // Основной цвет (hex, напр., "#3b82f6")
  accent100: string;              // Светлый оттенок (hex)

  // Заглушка (если контент не готов)
  placeholderEnabled?: boolean;   // Показывать ли заглушку вместо контента
  placeholderText?: string;       // Кастомный текст заглушки

  // Структурированный контент
  sections: {
    video_section?: VideoSection;
    concepts?: Concept[];
    authors?: Author[];
    core_literature?: Literature[];
    extra_literature?: Literature[];
  };
}

interface VideoSection {
  videos: Video[];
}

interface Video {
  id: string;                     // Уникальный ID видео
  title: string;                  // Название видео
  description?: string;           // Описание
  youtube_url: string;            // URL YouTube видео
  audio_url?: string;             // URL аудио версии (Storage)
}

interface Concept {
  id: string;
  term: string;                   // Термин
  definition: string;             // Определение
}

interface Author {
  id: string;
  name: string;                   // Имя автора
  contribution: string;           // Вклад в психологию развития
  image_url?: string;             // URL портрета (Storage)
}

interface Literature {
  id: string;
  title: string;                  // Название книги/статьи
  author: string;                 // Автор
  year?: number;                  // Год публикации
  type?: 'book' | 'article';     // Тип литературы
}
```

**Примечание:** Коллекции `clinical-topics` и `general-topics` используют **идентичную структуру**.

---

### `clinical-topics/{topicId}`

Курс **клинической психологии** — 12 тем + intro.

**Структура:** идентична `periods` (см. выше).

**Примеры ID:** `intro`, `1`, `2`, ..., `12`

---

### `general-topics/{topicId}`

Курс **общей психологии** — 12 тем.

**Структура:** идентична `periods` (см. выше).

**Примеры ID:** `1`, `2`, ..., `12`

---

### `pages/home`

Контент главной страницы (hero-секция, CTA, описание курсов).

```typescript
interface HomePage {
  hero: {
    title: string;                // Заголовок
    subtitle: string;             // Подзаголовок
    cta_text: string;             // Текст кнопки
    cta_link: string;             // Ссылка кнопки
  };

  courses: {
    development: CourseDescription;
    clinical: CourseDescription;
    general: CourseDescription;
  };
}

interface CourseDescription {
  title: string;
  description: string;
  cta_text: string;
  cta_link: string;
}
```

---

## Заметки и темы

### `notes/{noteId}`

Личные заметки пользователей по возрастным периодам.

```typescript
interface Note {
  id: string;                     // Уникальный ID заметки
  userId: string;                 // ID владельца (users/{userId})
  periodId: string;               // ID периода (prenatal, 0-1, ...)
  topicId: string;                // ID темы для размышления (topics/{topicId})

  content: string;                // Текст заметки

  // Метаданные
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Правила доступа:**
- Пользователь видит только свои заметки (`request.auth.uid == resource.data.userId`)

**Пример документа:**
```json
{
  "id": "note_xyz789",
  "userId": "abc123def456",
  "periodId": "7-9",
  "topicId": "topic_1",
  "content": "Мои размышления о кризисе 7 лет...",
  "createdAt": "2025-12-15T14:30:00Z",
  "updatedAt": "2025-12-16T10:00:00Z"
}
```

---

### `topics/{topicId}`

Темы для размышлений (редактируются админами).

```typescript
interface Topic {
  id: string;                     // Уникальный ID темы
  text: string;                   // Текст темы
  order: number;                  // Порядок отображения
}
```

**Правила доступа:**
- Чтение: все авторизованные пользователи
- Редактирование: только админы

**Пример документа:**
```json
{
  "id": "topic_1",
  "text": "Какое событие в этом возрасте повлияло на вас больше всего?",
  "order": 1
}
```

---

## Система тестирования

### `tests/{testId}`

Тесты с вопросами, рубриками и системой разблокировки уровней.

```typescript
interface Test {
  id: string;                     // Уникальный ID теста
  title: string;                  // Название теста
  description?: string;           // Описание

  // Статус публикации
  status: 'draft' | 'published' | 'unpublished';

  // Рубрика (для какого контента)
  rubric: {
    type: 'all' | 'period';       // 'all' = весь курс, 'period' = конкретный период
    course: 'development' | 'clinical' | 'general';
    periodId?: string;            // ID периода (если type === 'period')
  };

  // Вопросы
  questions: Question[];

  // Система разблокировки
  prerequisiteTestId?: string;    // ID теста, который нужно пройти перед этим

  // Метаданные
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;              // userId создателя
}

interface Question {
  id: string;                     // Уникальный ID вопроса
  questionText: string;           // Текст вопроса

  options: string[];              // 4 варианта ответа
  correctAnswerIndex: number;     // Индекс правильного ответа (0-3)

  // Кастомные сообщения
  successMessage?: string;        // Сообщение при правильном ответе
  failureMessage?: string;        // Сообщение при неправильном ответе
}
```

**Пример документа:**
```json
{
  "id": "test_erikson_stages",
  "title": "Стадии развития Эриксона",
  "description": "Проверьте знание 8 стадий психосоциального развития",
  "status": "published",
  "rubric": {
    "type": "all",
    "course": "development"
  },
  "questions": [
    {
      "id": "q1",
      "questionText": "Какой возраст соответствует стадии 'Автономия vs Стыд'?",
      "options": ["0-1 год", "1-3 года", "3-6 лет", "7-9 лет"],
      "correctAnswerIndex": 1,
      "successMessage": "Верно! Это ранний возраст (1-3 года).",
      "failureMessage": "Подсказка: это возраст приучения к горшку."
    }
  ],
  "createdAt": "2025-11-10T12:00:00Z",
  "updatedAt": "2025-11-10T12:00:00Z",
  "createdBy": "admin_uid_123"
}
```

**См. подробности:** [docs/guides/testing-system.md](../guides/testing-system.md)

---

### `testResults/{resultId}`

Результаты прохождения тестов.

```typescript
interface TestResult {
  id: string;                     // Уникальный ID результата
  userId: string;                 // ID пользователя
  testId: string;                 // ID теста

  score: number;                  // Количество правильных ответов
  totalQuestions: number;         // Общее количество вопросов
  passed: boolean;                // Пройден ли тест (score === totalQuestions)

  answers: Answer[];              // Подробности ответов

  // Метаданные
  completedAt: Timestamp;
}

interface Answer {
  questionId: string;
  selectedAnswerIndex: number;
  isCorrect: boolean;
}
```

**Правила доступа:**
- Пользователь видит только свои результаты

**Пример документа:**
```json
{
  "id": "result_abc123",
  "userId": "user_xyz789",
  "testId": "test_erikson_stages",
  "score": 8,
  "totalQuestions": 10,
  "passed": false,
  "answers": [
    {
      "questionId": "q1",
      "selectedAnswerIndex": 1,
      "isCorrect": true
    }
  ],
  "completedAt": "2026-01-08T16:45:00Z"
}
```

---

## Таймлайн жизни

### `timelines/{userId}`

Интерактивный таймлайн жизни пользователя с событиями и ветвями.

```typescript
interface Timeline {
  userId: string;                 // ID владельца (совпадает с document ID)

  nodes: TimelineNode[];          // События
  edges: TimelineEdge[];          // Связи между событиями

  ageMax: number;                 // Максимальный возраст на таймлайне (лет)

  // Метаданные
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface TimelineNode {
  id: string;                     // Уникальный ID узла
  type: 'event' | 'branch';       // Тип узла

  // Позиция
  position: {
    x: number;                    // Координата X (px)
    y: number;                    // Координата Y (px)
  };

  // Данные события
  data: {
    year?: number;                // Год события
    age?: number;                 // Возраст (лет)

    label: string;                // Название события
    details?: string;             // Детали

    icon?: string;                // ID иконки (из eventIconDataUrls)
    category?: string;            // Категория (family, education, work, ...)
    isMyDecision?: boolean;       // "Моё решение" (метка)
  };
}

interface TimelineEdge {
  id: string;                     // Уникальный ID связи
  source: string;                 // ID исходного узла
  target: string;                 // ID целевого узла
  type?: string;                  // Тип связи (напр., 'smoothstep')
}
```

**Правила доступа:**
- Пользователь видит только свой таймлайн (`request.auth.uid == resource.id`)

**Пример документа:**
```json
{
  "userId": "user_xyz789",
  "nodes": [
    {
      "id": "node_1",
      "type": "event",
      "position": { "x": 100, "y": 200 },
      "data": {
        "year": 2000,
        "age": 0,
        "label": "Рождение",
        "icon": "baby",
        "category": "life_milestone",
        "isMyDecision": false
      }
    }
  ],
  "edges": [],
  "ageMax": 25,
  "createdAt": "2025-12-01T10:00:00Z",
  "updatedAt": "2026-01-08T14:30:00Z"
}
```

**См. подробности:** [docs/guides/timeline.md](../guides/timeline.md)

---

## Таблица по расстройствам

### `disorderTables/{userId}_{courseId}`

Корневой документ таблицы студента. Один документ на пару пользователь + курс.

| Поле | Тип | Описание |
|------|-----|----------|
| `userId` | `string` | UID пользователя |
| `courseId` | `string` | ID курса (пока только `clinical`) |
| `updatedAt` | `Timestamp` | Время последнего изменения |

**ID документа:** `{userId}_{courseId}` (например, `abc123_clinical`)

### `disorderTables/{docId}/entries/{entryId}`

Записи в ячейках таблицы (пересечение функция × расстройство).

| Поле | Тип | Описание |
|------|-----|----------|
| `rowIds` | `string[]` | Выбранные строки — ровно 1 элемент (функция: perception, attention, memory, thinking, consciousness, work-capacity, emotional-personality, behavior) |
| `columnIds` | `string[]` | Выбранные столбцы — 1+ элементов (расстройства: schizophrenic-spectrum, epilepsy, alcoholism, dementia, frontal-syndrome, depression-bipolar, anxiety, personality-disorders) |
| `text` | `string` | Текст наблюдения (3–4000 символов) |
| `track` | `string \| null` | Цветовая метка: `patopsychology`, `psychiatry` или `null` |
| `createdAt` | `Timestamp` | Время создания |
| `updatedAt` | `Timestamp` | Время последнего изменения |

**Правила доступа:** Пользователь может читать/писать только свои документы (docId начинается с его UID).

**Batch-лимит:** При bulk-создании записи разбиваются на группы по 450 (лимит Firestore — 500 операций на batch).

**См. подробности:** [docs/guides/disorder-table.md](../guides/disorder-table.md)

---

## Книги (RAG)

### `books/{bookId}`

Метаданные загруженных книг для RAG-поиска.

```typescript
interface Book {
  id: string;                     // Уникальный ID книги
  title: string;                  // Название книги
  author: string;                 // Автор

  // Статус обработки
  status: 'processing' | 'ready' | 'error';

  // Метаданные
  totalChunks: number;            // Количество чанков
  active: boolean;                // Активна ли книга (используется в поиске)

  // Метаданные загрузки
  uploadedAt: Timestamp;
  uploadedBy: string;             // userId загрузившего админа

  // Storage
  storagePath: string;            // Путь к PDF в Storage

  // Обработка
  processingError?: string;       // Ошибка обработки (если status === 'error')
}
```

**Пример документа:**
```json
{
  "id": "book_abc123",
  "title": "Психология развития и возрастная психология",
  "author": "Шаповаленко И.В.",
  "status": "ready",
  "totalChunks": 342,
  "active": true,
  "uploadedAt": "2025-12-20T10:00:00Z",
  "uploadedBy": "admin_uid_123",
  "storagePath": "books/book_abc123.pdf"
}
```

---

### `book_chunks/{chunkId}`

Текстовые чанки с embeddings для семантического поиска.

```typescript
interface BookChunk {
  id: string;                     // Уникальный ID чанка
  bookId: string;                 // ID книги (books/{bookId})

  text: string;                   // Текст чанка (5-15 предложений)

  // Embeddings (для векторного поиска)
  embedding: number[];            // 768-мерный вектор (text-embedding-004)

  // Метаданные страниц
  pageStart: number;              // Начальная страница
  pageEnd: number;                // Конечная страница

  // Позиция в книге
  chunkIndex: number;             // Порядковый номер чанка
}
```

**Технические детали:**
- **Размер чанка:** 5-15 предложений (1500-2500 символов)
- **Overlap:** 2 предложения между соседними чанками
- **Embedding модель:** `text-embedding-004` (Gemini)
- **Обработка:** Cloud Function `ingestBook` (Gen2)

**Пример документа:**
```json
{
  "id": "chunk_xyz789",
  "bookId": "book_abc123",
  "text": "Кризис семи лет характеризуется потерей непосредственности...",
  "embedding": [0.123, -0.456, 0.789, ...],
  "pageStart": 45,
  "pageEnd": 46,
  "chunkIndex": 23
}
```

**См. подробности:** [docs/guides/book-rag.md](../guides/book-rag.md)

---

## Видео-транскрипты

### `videoTranscripts/{youtubeVideoId}`

Метаданные импортированных транскриптов YouTube. Полный payload с таймкодами хранится в Firebase Storage и переиспользуется по `youtubeVideoId`.

```typescript
interface VideoTranscriptDoc {
  youtubeVideoId: string;                    // YouTube video id, например dQw4w9WgXcQ
  source: 'youtube';
  status: 'pending' | 'available' | 'unavailable' | 'failed';

  language: string | null;                  // Код языка, например "ru" / "en"
  languageName: string | null;              // Человекочитаемое название, если известно
  isAutoGenerated: boolean | null;          // true для auto captions, если источник это сообщает
  availableLanguages?: string[];            // Список известных caption languages

  storagePath: string | null;               // video-transcripts/{videoId}/transcript.v1.json
  version: number;                          // Версия формата payload

  segmentCount: number;                     // Количество сегментов
  durationMs: number | null;                // Общая длительность транскрипта
  textLength: number;                       // Длина агрегированного fullText
  fullTextPreview: string | null;           // Первые ~280 символов для админских списков

  fetchedAt: Timestamp | null;              // Когда transcript был успешно скачан
  updatedAt: Timestamp;                     // Последнее обновление документа
  lastCheckedAt: Timestamp;                 // Последняя попытка проверки transcript

  errorCode: string | null;                 // Код ошибки импорта
  errorMessage: string | null;              // Текст последней ошибки
}
```

**Storage payload:** `video-transcripts/{youtubeVideoId}/transcript.v1.json`

```typescript
interface VideoTranscriptStoragePayload {
  youtubeVideoId: string;
  version: number;
  source: 'youtube';
  language: string | null;
  languageName: string | null;
  isAutoGenerated: boolean | null;
  fetchedAt: string;                        // ISO string
  durationMs: number | null;
  fullText: string;
  segments: Array<{
    index: number;
    startMs: number;
    endMs: number;
    durationMs: number;
    text: string;
  }>;
}
```

**Почему Firestore + Storage:**
- `Firestore` даёт быстрый флаг “есть transcript или нет”
- `Storage` хранит полный JSON с сегментами и таймкодами
- один transcript можно использовать в нескольких курсах и уроках без дублирования

---

## Правила доступа

### Firestore Security Rules

**Основные принципы:**

1. **Приватность по умолчанию**
   - Пользователи видят только свои данные (заметки, результаты тестов, таймлайны)
   - Правило: `request.auth.uid == resource.data.userId`

2. **Контент доступен всем для чтения**
   - `periods`, `clinical-topics`, `general-topics`, `pages` — чтение для всех
   - Редактирование: только админы

3. **Темы и тесты**
   - Чтение: все авторизованные пользователи
   - Редактирование: только админы

4. **Книги (RAG)**
   - `books` — чтение для всех, редактирование только админы
   - `book_chunks` — чтение для всех (для поиска)

**Пример правил:**
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Пользователи видят только свой профиль
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Заметки приватные
    match /notes/{noteId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.userId;
    }

    // Контент доступен всем для чтения
    match /periods/{periodId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Тесты доступны для чтения, редактирование только админы
    match /tests/{testId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // Результаты тестов приватные
    match /testResults/{resultId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.userId;
    }

    // Таймлайны приватные
    match /timelines/{userId} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId;
    }

    // Книги доступны всем для чтения
    match /books/{bookId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Чанки доступны всем (для поиска)
    match /book_chunks/{chunkId} {
      allow read: if true;
      allow write: if false;  // Только через Cloud Function
    }

    // Helper functions
    function isAdmin() {
      return request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super-admin'];
    }
  }
}
```

---

## Связанные документы

- 🏗️ [Architecture Overview](../architecture/overview.md) — обзор архитектуры
- 🧪 [Testing System Guide](../guides/testing-system.md) — система тестирования
- 🗺️ [Timeline Guide](../guides/timeline.md) — таймлайн жизни
- 📚 [Book RAG Guide](../guides/book-rag.md) — поиск по книгам

---

**Последнее обновление:** 2026-01-09
**Версия:** 1.0
