# 🏗️ Обзор архитектуры

> **Время чтения:** 10-15 минут
> **Цель:** Понять общую структуру и ключевые решения проекта

---

## 📊 Высокоуровневая архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Клиент (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Pages      │  │  Components  │  │    Hooks     │  │
│  │ (Роуты)      │  │ (UI блоки)   │  │  (Логика)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│            │              │                  │           │
│            └──────────────┴──────────────────┘           │
│                          │                               │
└──────────────────────────┼───────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │  Firebase Services   │
                ├─────────────────────┤
                │ • Firestore (DB)    │
                │ • Storage (Files)   │
                │ • Auth (Google)     │
                │ • Functions (API)   │
                └─────────────────────┘
```

---

## 🎯 Технический стек

### Frontend
- **React 19** — UI фреймворк
- **TypeScript** — типобезопасность
- **Tailwind CSS** — стилизация
- **Vite** — сборщик и dev server
- **React Router v7** — маршрутизация
- **Zustand** — state management

### Backend & Infrastructure
- **Firebase Firestore** — NoSQL база данных
- **Firebase Storage** — файлы (изображения, аудио, PDF)
- **Firebase Authentication** — Google OAuth
- **Cloud Functions** — серверная логика
- **Vercel** — хостинг фронтенда
- **Vercel Functions** — серверные API endpoints

---

## 📁 Структура проекта

```
psych-dev-site/
├── src/
│   ├── pages/              # Страницы-роуты
│   ├── components/         # Переиспользуемые компоненты
│   ├── hooks/              # Кастомные React hooks
│   ├── stores/             # Zustand stores (auth, tests, course)
│   ├── lib/                # Firebase, API клиенты
│   ├── utils/              # Вспомогательные функции
│   ├── types/              # TypeScript типы
│   └── app/                # App entry point, routing
├── functions/              # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.js        # Entry point
│   │   └── lib/            # Утилиты и helpers
│   └── package.json
├── api/                    # Vercel Serverless Functions
│   ├── assistant.ts        # AI помощник (Gemini)
│   ├── books.ts            # Book RAG поиск
│   └── papers.ts           # Научный поиск
├── docs/                   # Документация проекта
├── tests/                  # E2E тесты (Playwright)
└── public/                 # Статичные файлы
```

---

## 🔑 Ключевые архитектурные решения

### 1. Модульная архитектура

**Принцип:** Каждая фича — это набор связанных компонентов, хуков и утилит.

```
src/
├── components/
│   └── tests/              # Всё про тесты
│       ├── TestCard.tsx
│       ├── TestHistory.tsx
│       └── editor/
│           ├── TestBasicMetadata.tsx
│           └── ...
├── hooks/
│   ├── useTests.ts
│   └── useTestProgress.ts
└── lib/
    ├── tests.ts            # CRUD операции
    └── testAccess.ts       # Логика доступа
```

### 2. State Management (Zustand)

**Почему не Context API?**
- ✅ Лучшая производительность (atomic селекторы)
- ✅ Redux DevTools integration
- ✅ Простота использования
- ✅ Persist middleware (localStorage)

**Основные stores:**
```typescript
// src/stores/
useAuthStore     // user, roles, auth methods
useTestStore     // test progress, answers
useCourseStore   // current course selection
```

### 3. Lazy Loading + Code Splitting

**Все тяжелые страницы загружаются лениво:**

```typescript
// src/pages/lazy.ts
export const LazyTimeline = lazy(() => import('./Timeline'));
export const LazyNotes = lazy(() => import('./Notes'));
export const LazyTests = lazy(() => import('./TestsPage'));
```

**Manual chunks (vite.config.js):**
```javascript
manualChunks: {
  'timeline': ['src/pages/Timeline.tsx'],
  'tests': ['src/pages/TestsPage.tsx', 'src/pages/DynamicTest.tsx'],
  'admin': [/* admin pages */],
  'notes': ['src/pages/Notes.tsx'],
}
```

**Результат:** Initial bundle < 500 KB, lazy chunks 200-600 KB каждый.

### 4. Barrel Exports

**Все модули экспортируются через index.ts:**

```typescript
// src/components/index.ts
export { TestCard } from './tests/TestCard';
export { TestHistory } from './TestHistory';
// ...

// Использование:
import { TestCard, TestHistory } from '@/components';
```

**Преимущества:**
- ✅ Чистые импорты
- ✅ Легко рефакторить
- ✅ Явная публичная API

### 5. Правило размеров файлов

| Размер | Статус | Действие |
|--------|--------|----------|
| < 300 | 🟢 Отлично | Продолжай |
| 300-500 | 🟡 OK | Следи за ростом |
| > 500 | 🔴 Критично | Разбей файл! |

**Автоматическая проверка:** ESLint + pre-commit hook

---

## 🔐 Система безопасности

### Роли пользователей

```
Гость           → Только бесплатные курсы (системная группа everyone) или ничего
    ↓
Студент         → Хотя бы один платный курс (лично или через поток)
    ↓
Администратор   → + Редактирование своих курсов, их студенты (/admin/students),
курса             приглашения на свои курсы
    ↓
Супер-админ     → + Выдача прав администратора курса и со-админа, всё остальное

Со-админ (флаг поверх роли) → пользователи и потоки (/admin/users), страницы сайта
```

### Firestore Rules

```javascript
// Заметки — только свои
match /notes/{noteId} {
  allow read, write: if request.auth.uid == resource.data.userId;
}

// Контент — все читают, админы редактируют
match /periods/{periodId} {
  allow read: if true;
  allow write: if isAdminOrSuperAdmin();
}
```

### Логирование

**Запрещено:** `console.log()`, `console.error()` в production коде

**Правильно:**
```typescript
import { debugLog, debugError } from '@/lib/debug';

debugLog('[Tests] Loading test', testId);
debugError('Failed to save note', error);
```

**Проверка:** `npm run check-console` (автоматически в pre-commit)

---

## 📡 Data Flow

### Загрузка данных

```
1. Page Component
      ↓
2. Custom Hook (useTests, useNotes, etc.)
      ↓
3. lib/* функция (getTests, getNotes)
      ↓
4. Firebase SDK
      ↓
5. Firestore
```

**Пример:**
```typescript
// Page
function TestsPage() {
  const { tests, loading } = useTests();
  // ...
}

// Hook
function useTests() {
  const [tests, setTests] = useState([]);
  useEffect(() => {
    getPublishedTests().then(setTests);
  }, []);
  return { tests, loading };
}

// Lib
async function getPublishedTests() {
  const snapshot = await getDocs(
    query(collection(db, 'tests'), where('status', '==', 'published'))
  );
  return snapshot.docs.map(/* ... */);
}
```

### Сохранение данных

```
1. User Action (button click)
      ↓
2. Event Handler
      ↓
3. lib/* функция (updateTest, createNote)
      ↓
4. Firebase SDK
      ↓
5. Firestore
      ↓
6. Real-time update → useEffect подхватывает
```

---

## 🧪 Тестирование

### Unit Tests (Vitest)
- Утилиты: `src/utils/*.test.ts`
- Хуки: `src/hooks/__tests__/*.test.ts`
- Компоненты (опционально)

### Integration Tests
- Firebase эмуляторы
- Real Firestore operations
- `tests/integration/*.test.ts`

### E2E Tests (Playwright)
- Production smoke tests
- Критические user flows
- `tests/e2e/*.spec.ts`

**Workflow:** [development/testing-workflow.md](../development/testing-workflow.md)

---

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build
# Auto-deploy on push to main
```

### Cloud Functions (Firebase)
```bash
cd functions
npm run build
firebase deploy --only functions
```

### Rules (Firestore + Storage)
```bash
firebase deploy --only firestore:rules,storage:rules
```

---

## 📚 Ключевые подсистемы

### 1. Система тестирования
- Динамическое создание тестов через UI
- Цепочки тестов с prerequisite
- Медиа-контент (изображения, аудио, видео)
- Импорт/экспорт JSON

**Подробнее:** [../guides/testing-system.md](../guides/testing-system.md)

### 2. Timeline система
- Интерактивная карта событий жизни
- Drag-and-drop, undo/redo
- Экспорт в PNG/PDF
- Интеграция с заметками

**Подробнее:** [../guides/timeline.md](../guides/timeline.md)

### 3. Мультикурсовая система
- 3 курса: развитие, клиническая, общая психология
- Единый UI, раздельные Firestore коллекции
- Granular course access control

**Подробнее:** [../guides/multi-course.md](../guides/multi-course.md)

### 4. Book RAG система
- PDF ingestion → Gemini embeddings
- Semantic search по книгам
- AI-ответы с цитированием

**Подробнее:** [../guides/book-rag.md](../guides/book-rag.md)

---

## 🎓 Следующие шаги

1. **Изучи архитектурные правила:** [guidelines.md](guidelines.md)
2. **Прочитай принципы проектирования:** [principles.md](principles.md)
3. **Посмотри примеры кода:** `src/components/`, `src/hooks/`
4. **Сделай первый коммит:** [../QUICK_START.md](../QUICK_START.md)

---

**См. также:**
- [Детальные архитектурные guidelines](guidelines.md)
- [Принципы проектирования](principles.md)
- [Testing workflow](../development/testing-workflow.md)

**Последнее обновление:** 2026-01-08


## Бесплатный портал «Иконография» (2026-09-08, локально)

`src/features/iconography` — публичная feature с route-level lazy wrapper `src/pages/IconographyPage.tsx`. Основная оболочка использует существующий standalone path; данные — индекс и отдельные JSON-паспорта в `public/iconography`, изображения — заранее подготовленные WebP. Firebase не участвует в каталоге, поиске или учебном прогрессе (localStorage). Единственный серверный вызов feature — общий `submitFeedback` → существующий `sendFeedback`.

`npm run build:iconography` использует отдельный HTML entry, тот же lazy registry / PageLoader / scroll restoration и создаёт статический `dist-iconography` без приложения курсов и `api/`. PURE-аннотации фабрик `React.lazy` дают tree shaking неиспользуемых страниц; не добавлять инициализирующие side effects в эти фабрики. Общая сборка и отдельная проверяются независимо. Подробности: [guide](../guides/iconography.md), [стоимость и ограничения](../reports/iconography-local-2026-09-08.md).

Уточнение 2026-09-09: вход в портал — `RecognitionQuiz`, переиспользующий загрузку паспортов, `Artwork` и хранилище прогресса. Семантические уровни и координаты отмечаемых деталей хранятся в JSON-паспортах, в индекс добавлены лёгкие поля `recognitionGroup` и `schoolId`. Первые 21 записи сохранены; расширение до 83 и отдельный JSON 12 школ не добавляют архив в JS bundle. Паспорта содержат ссылки дальнейшего чтения и предметный контекст.
