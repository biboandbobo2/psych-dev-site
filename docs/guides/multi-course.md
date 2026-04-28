# Интеграция мультикурсовой системы

> **Дата:** 2025-11-19
> **Версия:** 1.0
> **Автор:** Claude Sonnet 4.5

## Обзор

Платформа была расширена с одного курса (психология развития) до трёх независимых курсов:
1. **Психология развития** (`/`) — 14 возрастных периодов
2. **Клиническая психология** (`/clinical/`) — 12 тематических разделов
3. **Общая психология** (`/general/`) — 12 тематических занятий

## Архитектурные решения

### 1. **Единая компонентная база**
Все три курса используют один и тот же компонент `PeriodPage.tsx` для отображения контента. Это обеспечивает:
- Единообразный UI/UX across всех курсов
- Простоту поддержки (изменения в одном месте)
- Переиспользование логики (заглушки, секции, темы)

### 2. **Персистентное хранение курса (Zustand + localStorage)**
> **Дата добавления:** 2025-11-21

Для сохранения выбранного курса между переходами используется Zustand store с persist middleware:

```typescript
// src/stores/useCourseStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { CourseType } from '../types/tests';

interface CourseState {
  currentCourse: CourseType;
  setCurrentCourse: (course: CourseType) => void;
}

export const useCourseStore = create<CourseState>()(
  devtools(
    persist(
      (set) => ({
        currentCourse: 'development',
        setCurrentCourse: (course) => set({ currentCourse: course }),
      }),
      {
        name: 'course-storage', // ключ в localStorage
      }
    ),
    { name: 'CourseStore' }
  )
);
```

**Как это работает:**
1. Пользователь выбирает курс на странице профиля → `setCurrentCourse('clinical')`
2. Zustand сохраняет значение в `localStorage` автоматически
3. При переходе на страницу тестов → `useCourseStore` возвращает сохранённое значение
4. Навигация слева остаётся на клиническом курсе
5. После перезагрузки браузера курс сохраняется

**Синхронизация с URL:**
Для обратной совместимости при первой загрузке проверяется URL параметр:
```typescript
// Profile.tsx, TestsPage.tsx, AdminContent.tsx
useEffect(() => {
  const courseParam = searchParams.get('course');
  if (courseParam === 'clinical' || courseParam === 'development' || courseParam === 'general') {
    setCurrentCourse(courseParam); // синхронизируем store с URL
  }
}, [searchParams, setCurrentCourse]);
```

**Определение курса в AppShell.tsx:**
```typescript
const currentCourse = useCourseStore((state) => state.currentCourse);

const isProfileOrAdmin = normalizedPath === '/profile' || normalizedPath.startsWith('/admin/content');
const isTestsPage = normalizedPath.startsWith('/tests');
const useCourseFromStore = isProfileOrAdmin || isTestsPage;

const isClinicalPage = normalizedPath.startsWith('/clinical') ||
                       (useCourseFromStore && currentCourse === 'clinical');
const isGeneralPage = normalizedPath.startsWith('/general') ||
                      (useCourseFromStore && currentCourse === 'general');
```

**Преимущества:**
- ✅ Курс сохраняется между переходами
- ✅ Курс сохраняется между сессиями (localStorage)
- ✅ Навигация остаётся стабильной
- ✅ Redux DevTools для отладки
- ✅ Обратная совместимость с URL параметрами

### 3. **URL-based course detection для страниц курсов**
Для страниц конкретных курсов (`/clinical/*`, `/general/*`) определение происходит на основе URL:
```typescript
const isClinicalCourse = location.pathname.startsWith('/clinical/');
const isGeneralCourse = location.pathname.startsWith('/general/');
const isDevelopmentCourse = !isClinicalCourse && !isGeneralCourse;
```

Это позволяет:
- Сделать URL единственным источником истины для страниц курсов
- Поддерживать прямые ссылки и навигацию браузера
- Избежать конфликта между store и URL

### 4. **Раздельные Firestore коллекции**
Каждый курс имеет свою коллекцию:
- `periods` — психология развития
- `clinical-topics` — клиническая психология
- `general-topics` — общая психология

Индексы для каждой коллекции:
```json
{
  "collectionGroup": "clinical-topics",
  "fields": [
    { "fieldPath": "published", "order": "ASCENDING" },
    { "fieldPath": "order", "order": "ASCENDING" }
  ]
}
```

## Основные изменения

### Файлы маршрутизации

#### `src/routes/`
Конфигурации маршрутов разнесены по типизированным модулям (`clinical.ts`, `general.ts`, `development.ts`, агрегация — `index.ts`):

```typescript
export const CLINICAL_ROUTE_CONFIG = [
  {
    path: '/clinical/intro',
    key: 'clinical-intro',
    navLabel: 'Вводное занятие',
    periodId: 'clinical-intro',
    themeKey: 'clinical',
    // ...
  },
  // ... 12 тем
];

export const GENERAL_ROUTE_CONFIG = [
  {
    path: '/general/1',
    key: 'general-1',
    navLabel: 'История психологии и методы',
    periodId: 'general-1',
    themeKey: 'general',
    // ...
  },
  // ... 12 тем
];
```

#### `src/app/AppRoutes.tsx`
Добавлена генерация роутов для новых курсов:

```typescript
{CLINICAL_ROUTE_CONFIG.map((config) => (
  <Route
    key={config.path}
    path={config.path}
    element={
      <PeriodPage
        config={config}
        period={config.periodId ? clinicalTopicsMap.get(config.periodId) : null}
      />
    }
  />
))}

{GENERAL_ROUTE_CONFIG.map((config) => (
  <Route
    key={config.path}
    path={config.path}
    element={
      <PeriodPage
        config={config}
        period={config.periodId ? generalTopicsMap.get(config.periodId) : null}
      />
    }
  />
))}
```

### Хуки для загрузки данных

#### `src/hooks/useClinicalTopics.ts`
```typescript
export function useClinicalTopics() {
  const [topics, setTopics] = useState<Map<string, ClinicalTopic>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadTopics() {
      const q = query(
        collection(db, 'clinical-topics'),
        where('published', '==', true),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);
      // ...
    }
    loadTopics();
  }, []);

  return { topics, loading, error, reload: loadTopics };
}
```

Аналогично для `useGeneralTopics.ts`.

### Компоненты отображения

#### `src/app/AppShell.tsx`
Обновлён для поддержки трёх курсов:

```typescript
const { topics: clinicalTopics } = useClinicalTopics();
const { topics: generalTopics } = useGeneralTopics();

const isClinicalPage = normalizedPath.startsWith('/clinical');
const isGeneralPage = normalizedPath.startsWith('/general');

const navItems = useMemo(() => {
  const routes = isClinicalPage ? CLINICAL_ROUTE_CONFIG :
                 isGeneralPage ? GENERAL_ROUTE_CONFIG :
                 ROUTE_CONFIG;
  const dataMap = isClinicalPage ? clinicalTopicsMap :
                  isGeneralPage ? generalTopicsMap :
                  periodMap;
  // ...
}, [/* ... */]);
```

#### `src/pages/PeriodPage.tsx`
Добавлена логика определения курса для корректного текста заглушки:

```typescript
const isClinicalCourse = location.pathname.startsWith('/clinical/');
const isGeneralCourse = location.pathname.startsWith('/general/');
const isDevelopmentCourse = !isClinicalCourse && !isGeneralCourse;

const defaultPlaceholderText = isDevelopmentCourse
  ? 'Контент для этого возраста появится в ближайшем обновлении.'
  : 'Контент для этой темы появится в ближайшем обновлении.';
```

**Важно:** Также исправлена проверка контента:
```typescript
// ❌ Было (проверяло только наличие ключей)
const hasSections = Boolean(
  convertedSections && Object.keys(convertedSections).length > 0
);

// ✅ Стало (проверяет реальный контент)
const hasSections = Boolean(
  convertedSections &&
  Object.values(convertedSections).some(
    section => Array.isArray(section.content) && section.content.length > 0
  )
);
```

### Главная страница

#### `src/pages/HomePage.tsx`
Добавлена поддержка CTA-секций для курсов:

```typescript
const renderSection = (section: HomePageSection) => {
  switch (section.type) {
    // ... existing cases
    case 'cta-clinical':
      return renderSimpleCTASection(section as CTAClinicalSection);
    case 'cta-general':
      return renderSimpleCTASection(section as CTAGeneralSection);
    default:
      return null;
  }
};

function renderSimpleCTASection(section: CTAClinicalSection | CTAGeneralSection) {
  const { title, subtitle, primaryCta, secondaryCta } = section.content;
  return (
    <section className="py-16 sm:py-20 text-center bg-gradient-to-br from-[#F5F7FA] to-[#E8EFF5] rounded-2xl">
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <div className="flex gap-4">
        <NavLink to={primaryCta.link}>{primaryCta.text}</NavLink>
        <NavLink to={secondaryCta.link}>{secondaryCta.text}</NavLink>
      </div>
    </section>
  );
}
```

#### `src/types/homePage.ts`
```typescript
export interface CTAClinicalSection {
  type: 'cta-clinical';
  order: number;
  enabled: boolean;
  content: {
    title: string;
    subtitle: string;
    primaryCta: { text: string; link: string; };
    secondaryCta: { text: string; link: string; };
  };
}

export interface CTAGeneralSection {
  type: 'cta-general';
  // ... аналогично
}
```

#### `scripts/init-homepage.cjs`
Скрипт для инициализации контента главной страницы в Firestore:

```javascript
const defaultContent = {
  id: 'home',
  version: 1,
  sections: [
    // ... hero, essence, structure, periods
    {
      type: 'cta-clinical',
      order: 4.5,
      enabled: true,
      content: {
        title: 'Курс клинической психологии',
        subtitle: 'Расширьте свои знания...',
        primaryCta: { text: 'Перейти к курсу', link: '/clinical/intro' },
        secondaryCta: { text: 'Подробнее о курсе', link: '/clinical/1' }
      }
    },
    {
      type: 'cta-general',
      order: 4.7,
      enabled: true,
      content: {
        title: 'Курс общей психологии',
        subtitle: 'Познакомьтесь с фундаментальными основами...',
        primaryCta: { text: 'Перейти к курсу', link: '/general/1' },
        secondaryCta: { text: 'Подробнее о курсе', link: '/general/2' }
      }
    }
  ]
};
```

### Админ-панель

#### `src/pages/AdminContent.tsx`
Добавлен переключатель курсов:

```typescript
type CourseType = 'development' | 'clinical' | 'general';

const COURSES = {
  development: {
    id: 'development' as CourseType,
    name: 'Психология развития',
    collection: 'periods',
    routes: ROUTE_CONFIG,
    icon: '👶',
  },
  clinical: {
    id: 'clinical' as CourseType,
    name: 'Клиническая психология',
    collection: 'clinical-topics',
    routes: CLINICAL_ROUTE_CONFIG,
    icon: '🧠',
  },
  general: {
    id: 'general' as CourseType,
    name: 'Общая психология',
    collection: 'general-topics',
    routes: GENERAL_ROUTE_CONFIG,
    icon: '📚',
  },
};

// UI переключателя
<div className="flex gap-2 border-b border-gray-200">
  {Object.values(COURSES).map((courseOption) => (
    <button
      onClick={() => handleCourseChange(courseOption.id)}
      className={currentCourse === courseOption.id ? 'active' : ''}
    >
      <span>{courseOption.icon}</span>
      {courseOption.name}
    </button>
  ))}
</div>
```

#### `src/pages/AdminContentEdit.tsx`
Поддержка редактирования всех курсов:

```typescript
const courseParam = searchParams.get('course');
const course: CourseType = (courseParam === 'clinical' || courseParam === 'development' || courseParam === 'general')
  ? courseParam
  : 'development';

const routesByPeriod = course === 'clinical' ? CLINICAL_ROUTE_BY_PERIOD :
                       course === 'general' ? GENERAL_ROUTE_BY_PERIOD :
                       ROUTE_BY_PERIOD;

const placeholderDisplayText =
  routeConfig?.placeholderText || (course === 'development'
    ? 'Контент для этого возраста появится в ближайшем обновлении.'
    : 'Контент для этой темы появится в ближайшем обновлении.');
```

#### `src/pages/admin/content-editor/hooks/useContentLoader.ts`
Загрузка данных в зависимости от курса:

```typescript
if (course === 'clinical') {
  const collectionName = 'clinical-topics';
  const docRef = doc(db, collectionName, periodId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    data = {
      ...(docSnap.data() as Omit<Period, 'period'>),
      period: periodId,
    };
  }
} else if (course === 'general') {
  // аналогично для general
} else {
  // development psychology
  const fetched = await fetchPeriod(periodId);
  if (fetched) {
    data = fetched as Period;
  }
}
```

### Импорт данных

#### `scripts/import-general-psychology.cjs`
```javascript
const admin = require('firebase-admin');
const generalTopics = require('../general-psychology.json');

admin.initializeApp({ projectId: 'psych-dev-site-prod' });
const db = admin.firestore();

async function importGeneralPsychology() {
  const batch = db.batch();

  generalTopics.forEach((topic) => {
    const docRef = db.collection('general-topics').doc(topic.period);
    batch.set(docRef, topic);
  });

  await batch.commit();
  console.log(`✅ Импортировано ${generalTopics.length} тем общей психологии`);
}
```

### Firestore индексы

#### `firestore.indexes.json`
```json
{
  "indexes": [
    {
      "collectionGroup": "clinical-topics",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "published", "order": "ASCENDING" },
        { "fieldPath": "order", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "general-topics",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "published", "order": "ASCENDING" },
        { "fieldPath": "order", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## Формат данных

Все три курса используют единый формат документов:

```typescript
interface CourseTopic {
  period: string;              // ID документа (например, "general-1")
  title: string;               // Заголовок
  subtitle: string;            // Подзаголовок
  published: boolean;          // Опубликовано ли
  order: number;               // Порядок отображения
  accent: string;              // Цвет темы (hex)
  accent100: string;           // Светлый вариант цвета
  placeholderEnabled?: boolean; // Показывать ли заглушку
  placeholderText?: string;     // Кастомный текст заглушки
  sections?: {                  // Структурированный контент
    video_section?: {
      title: string;
      content: Array<{
        title: string;
        url: string;
        deckUrl?: string;
        audioUrl?: string;
      }>;
    };
    concepts?: {
      title: string;
      content: string[];
    };
    authors?: {
      title: string;
      content: Array<{
        name: string;
        url?: string;
      }>;
    };
    core_literature?: {
      title: string;
      content: Array<{
        title: string;
        url: string;
      }>;
    };
    extra_literature?: {
      title: string;
      content: Array<{
        title: string;
        url: string;
      }>;
    };
  };
}
```

## Динамические курсы

> **Дата добавления:** 2026-02-05

Помимо трёх core-курсов (development, clinical, general) с фиксированными коллекциями, платформа поддерживает **динамические курсы**, создаваемые админами через UI.

### Отличия от core-курсов

| | Core-курсы | Динамические курсы |
|---|---|---|
| Создание | Захардкожены в коде | Через модалку «Добавить курс» |
| Firestore | `periods`, `clinical-topics`, `general-topics` | `courses/{courseId}/lessons/{lessonId}` |
| Маршруты | `/`, `/clinical/*`, `/general/*` | `/course/{courseId}/{lessonId}` |
| Метаданные | `src/constants/courses.ts` | `courses/{courseId}` (Firestore) |

### Firestore-схема

```
courses/{courseId}          # метаданные курса
  ├── name: string          # название
  ├── icon: string          # иконка
  ├── order: number         # порядок в списке
  └── published: boolean    # опубликован ли

courses/{courseId}/lessons/{lessonId}   # уроки
  ├── title, subtitle, sections...     # тот же формат, что и core-курсы
  ├── order: number
  └── published: boolean
```

### Ключевые файлы

- **`src/constants/courses.ts`** — утилиты `isCoreCourse()`, `getCourseBasePath()`, метаданные core-курсов
- **`src/components/CreateCourseModal.tsx`** — модалка создания курса
- **`src/hooks/useCourses.ts`** — хук загрузки всех курсов (core + динамические)
- **`src/pages/admin/content-editor/utils/courseCollectionRef.ts`** — маппинг курс → Firestore коллекция

### Создание динамического курса

1. Админ открывает `/admin/content`
2. В сайдбаре нажимает «Добавить курс»
3. Вводит название → создаётся документ в `courses/{courseId}`
4. Уроки добавляются через кнопку «Создать урок» внутри курса
5. Уроки хранятся в `courses/{courseId}/lessons/{lessonId}`

## Sidebar-компоненты

> **Дата добавления:** 2026-02-05

### StudentCourseSidebar (`/profile`)
Отображает список курсов для студента и навигацию по урокам выбранного курса. Использует `useActiveCourse` для определения текущего курса.

### AdminCourseSidebar (`/admin/content`)
Управление курсами для админов: список курсов, переименование (inline edit), индикатор публикации уроков, навигация. Использует `useActiveCourse`.

### useActiveCourse (shared hook)

```typescript
// src/hooks/useActiveCourse.ts
export function useActiveCourse(courses: CourseOption[], loading: boolean): string
```

Общий хук, используемый обоими сайдбарами:
1. Читает `currentCourse` из `useCourseStore`
2. Если текущий курс есть в списке — возвращает его
3. Если нет — переключает store на первый доступный курс
4. Фоллбэк: `'development'`

## Массовое открытие курсов (Bulk Enrollment)

> **Дата добавления:** 2026-02-05

Позволяет super-admin массово выдавать доступ к курсам для списка студентов.

### Как работает

1. Super-admin открывает `/admin/users` → «Массово открыть курсы»
2. Вводит список email (через запятую, новую строку или `;`)
3. Выбирает курсы для открытия
4. Нажимает «Применить»

### Cloud Functions

- **`bulkEnrollStudents`** — основная функция:
  - Для существующих пользователей: обновляет роль на `student`, добавляет `courseAccess`
  - Для незарегистрированных: создаёт pending-приглашение (`users/pending_{base64(email)}`)
  - Обработка идёт параллельно чанками по 10 email
- **`getStudentEmailLists`** — получение сохранённых списков email
- **`saveStudentEmailList`** — сохранение списка для повторного использования

### Pending-приглашения

Для незарегистрированных email создаётся документ:
```
users/pending_{base64url(email)}
  ├── email: string
  ├── role: "student"
  ├── courseAccess: { [courseId]: true }
  └── createdAt: Timestamp
```

При регистрации (`onUserCreate`) проверяется наличие pending-документа. Если найден — пользователь получает роль и доступ к курсам автоматически.

### Ключевые файлы

- **`src/components/BulkStudentAccessModal.tsx`** — UI модалки
- **`src/lib/adminFunctions.ts`** — клиентские обёртки Cloud Functions
- **`functions/src/bulkEnrollment.ts`** — Cloud Functions
- **`functions/src/lib/shared.ts`** — общие утилиты (`toPendingUid`, `extractCourseAccess`, `normalizeEmailList`)

## Известные проблемы

### MP-5: Заглушка не работает в clinical/general курсах
**Статус:** 🔴 Открыто (добавлено в `docs/processes/audit-backlog.md`)

**Проблема:**
Заглушка (placeholder) не отображается корректно для страниц курсов клинической и общей психологии, даже когда все sections пустые.

**Сделанные исправления:**
1. ✅ Исправлена проверка контента в `PeriodPage.tsx:125-130` — теперь проверяет не только наличие ключей, но и реальный контент
2. ✅ Добавлен динамический текст заглушки в зависимости от курса

**Требуется доработка:**
- Протестировать в браузере работу заглушки на `/clinical/*` и `/general/*`
- Проверить debug-лог в консоли
- При необходимости добавить дополнительное логирование

## Тестирование

### Чеклист для тестирования
- [ ] Все три курса корректно отображаются в навигации
- [ ] Переключение между курсами работает без перезагрузки
- [ ] CTA-кнопки на главной странице ведут на правильные курсы
- [ ] Админ-панель позволяет редактировать все три курса
- [ ] Переключатель курсов в админке работает корректно
- [ ] Заглушки отображаются для незаполненных тем
- [ ] Текст заглушки корректен для каждого типа курса
- [ ] URL sharing работает (прямые ссылки на темы)
- [ ] Browser back/forward navigation работает корректно

### Команды для тестирования
```bash
# Валидация
npm run validate

# E2E smoke тесты
npm run test:e2e:prod

# Проверка build
npm run build

# Запуск dev сервера
npm run dev
```

## Миграция и deployment

### Шаги для деплоя
1. **Создать индексы Firestore:**
   ```bash
   firebase deploy --only firestore:indexes
   ```

2. **Импортировать данные:**
   ```bash
   node scripts/import-general-psychology.cjs
   # Аналогично для clinical если нужно
   ```

3. **Инициализировать главную страницу:**
   ```bash
   node scripts/init-homepage.cjs
   ```

4. **Деплой приложения:**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## Рекомендации для разработки

1. **При добавлении нового курса:**
   - Создать конфигурацию в `src/routes/` (новый модуль + регистрация в `index.ts`)
   - Добавить хук загрузки данных в `src/hooks/`
   - Обновить типы в `src/types/content.ts`
   - Создать индекс в `firestore.indexes.json`
   - Обновить `AppShell.tsx` и `AppRoutes.tsx`

2. **При изменении формата данных:**
   - Обновить типы в `src/types/content.ts`
   - Обновить компоненты редактирования
   - Обновить скрипты импорта
   - Обеспечить обратную совместимость

3. **Логирование:**
   - Использовать `debugLog` для отладки загрузки данных
   - Добавлять метаданные в логи (courseType, periodId, etc.)
   - Следовать правилам из `../architecture/guidelines.md`

## Связанные документы

- [README.md](../README.md) — общее описание проекта
- [Audit Backlog](../processes/audit-backlog.md) — текущие задачи и техдолг
- [Architecture Guidelines](../architecture/guidelines.md) — архитектурные правила

---

**История изменений:**
- 2026-02-05: Добавлены динамические курсы, sidebar-компоненты, useActiveCourse, bulk enrollment
- 2025-11-21: Добавлена система персистентного хранения курса (useCourseStore + localStorage)
- 2025-11-21: Добавлена интеграция тестов с мультикурсовой системой
- 2025-11-19: Первая версия документа (интеграция 3 курсов)
