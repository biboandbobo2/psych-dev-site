# 🗺️ Routes Reference

> **Дата:** 2026-01-09
> **Статус:** Актуальный справочник

Полный список маршрутов приложения с правами доступа и описанием.

---

## 📋 Содержание

1. [Публичные маршруты](#публичные-маршруты)
2. [Защищённые маршруты](#защищённые-маршруты)
3. [Административные маршруты](#административные-маршруты)
4. [Система ролей](#система-ролей)
5. [Lazy Loading](#lazy-loading)

---

## Публичные маршруты

Доступны всем пользователям (с авторизацией и без).

### Главная страница

| Маршрут | Компонент | Описание |
|---------|-----------|----------|
| `/` | `Home` | Главная страница с описанием курсов и CTA-кнопками |

---

### Курс: Психология развития

**Базовый путь:** `/`

| Маршрут | Описание | Возраст |
|---------|----------|---------|
| `/intro` | Вводное занятие | - |
| `/prenatal` | Пренатальное развитие | До рождения |
| `/0-1` | Младенчество | 0-1 год |
| `/1-3` | Ранний возраст | 1-3 года |
| `/3-6` | Дошкольный возраст | 3-6 лет |
| `/7-9` | Младший школьный возраст | 7-9 лет |
| `/10-13` | Подростковый возраст | 10-13 лет |
| `/14-18` | Юность | 14-18 лет |
| `/19-22` | Молодость (ранняя) | 19-22 года |
| `/22-27` | Молодость (поздняя) | 22-27 лет |
| `/28-40` | Зрелость | 28-40 лет |
| `/40-65` | Средний возраст | 40-65 лет |
| `/66-80` | Пожилой возраст | 66-80 лет |
| `/80-plus` | Долголетие | 80+ лет |

**Компонент:** `PeriodDetail` (src/pages/PeriodDetail.tsx)

---

### Курс: Клиническая психология

**Базовый путь:** `/clinical`

**Требование:** `courseAccess.clinical === true` (выдаётся Super Admin)

| Маршрут | Описание |
|---------|----------|
| `/clinical/intro` | Вводное занятие |
| `/clinical/1` | Тема 1: Патопсихология |
| `/clinical/2` | Тема 2: Расстройства личности |
| `/clinical/3` | Тема 3: Аффективные расстройства |
| `/clinical/4` | Тема 4: Психотические расстройства |
| `/clinical/5` | Тема 5: Невротические расстройства |
| `/clinical/6` | Тема 6: Психосоматика |
| `/clinical/7` | Тема 7: Зависимости |
| `/clinical/8` | Тема 8: Детская клиническая психология |
| `/clinical/9` | Тема 9: Геронтопсихология |
| `/clinical/10` | Тема 10: Методы психодиагностики |
| `/clinical/11` | Тема 11: Психотерапевтические подходы |
| `/clinical/12` | Тема 12: Кризисная интервенция |

**Компонент:** `ClinicalTopicDetail` (src/pages/ClinicalTopicDetail.tsx)

---

### Курс: Общая психология

**Базовый путь:** `/general`

**Требование:** `courseAccess.general === true` (выдаётся Super Admin)

| Маршрут | Описание |
|---------|----------|
| `/general/1` | Тема 1: История психологии |
| `/general/2` | Тема 2: Восприятие |
| `/general/3` | Тема 3: Внимание |
| `/general/4` | Тема 4: Память |
| `/general/5` | Тема 5: Мышление |
| `/general/6` | Тема 6: Речь |
| `/general/7` | Тема 7: Воображение |
| `/general/8` | Тема 8: Эмоции |
| `/general/9` | Тема 9: Чувства |
| `/general/10` | Тема 10: Мотивация |
| `/general/11` | Тема 11: Воля |
| `/general/12` | Тема 12: Личность |

**Компонент:** `GeneralTopicDetail` (src/pages/GeneralTopicDetail.tsx)

---

### Научный поиск

| Маршрут | Компонент | Описание |
|---------|-----------|----------|
| `/search` | `ResearchSearch` | Поиск научных статей (OpenAlex, Semantic Scholar) + AI-помощник (Gemini) |

**Доступ:** открыт всем пользователям через кнопку поиска в header

---

## Защищённые маршруты

Требуют авторизации (`request.auth != null`).

### Профиль и инструменты

| Маршрут | Компонент | Описание | Lazy |
|---------|-----------|----------|------|
| `/profile` | `UserProfile` | Профиль пользователя | ✅ |
| `/notes` | `NotesPage` | Создание и просмотр заметок | ✅ |
| `/timeline` | `TimelinePage` | Интерактивный таймлайн жизни | ✅ |

**Lazy Loading:** Эти страницы загружаются через `React.lazy` (см. `src/pages/lazy.ts`)

---

### Система тестирования

| Маршрут | Компонент | Описание | Lazy |
|---------|-----------|----------|------|
| `/tests` | `TestsOverview` | Список всех доступных тестов | ✅ |
| `/tests/dynamic/:testId` | `TestPage` | Прохождение теста из Firestore | ✅ |

**Динамические тесты (Firestore):**
- Создаются через админ-панель (`/admin/content` → "Создать тест")
- Рубрики: курс целиком или конкретные возрастные периоды
- 1-20 вопросов с 4 вариантами ответа
- Система разблокировки уровней (`prerequisiteTestId`)

**См. подробности:** [docs/guides/testing-system.md](../guides/testing-system.md)

---

### Legacy тесты

| Маршрут | Компонент | Описание | Разблокировка |
|---------|-----------|----------|---------------|
| `/tests/authors` | `AuthorsTest` | Уровень 1: Авторы и термины | Доступен сразу |
| `/tests/authors/level2` | `AuthorsTestLevel2` | Уровень 2: Цитаты | Требует 10/10 на уровне 1 |
| `/tests/authors/level3` | `AuthorsTestLevel3` | Уровень 3: Термины в контексте | Требует 10/10 на уровне 2 |

**Данные:** хранятся в `src/data/authorsTestData.ts`, `authorsTestLevel2Data.ts`, `authorsTestLevel3Data.ts`

---

## Административные маршруты

Требуют роль **Admin** или **Super Admin**.

### Основная админ-панель

| Маршрут | Компонент | Роль | Описание | Lazy |
|---------|-----------|------|----------|------|
| `/admin` | `AdminDashboard` | Super Admin | Главная админ-панель | ✅ |
| `/admin/users` | `AdminUsers` | Super Admin | Управление пользователями и ролями | ✅ |

---

### Редактирование контента

| Маршрут | Компонент | Роль | Описание | Lazy |
|---------|-----------|------|----------|------|
| `/admin/content` | `AdminContent` | Admin | Единый редактор для всех трёх курсов | ✅ |
| `/admin/content/edit/:periodId?course=development` | `AdminContentEdit` | Admin | Редактирование периода психологии развития | ✅ |
| `/admin/content/edit/:topicId?course=clinical` | `AdminContentEdit` | Admin | Редактирование темы клинической психологии | ✅ |
| `/admin/content/edit/:topicId?course=general` | `AdminContentEdit` | Admin | Редактирование темы общей психологии | ✅ |

**Примечание:** Переключатель курсов на `/admin/content` позволяет выбрать курс для редактирования.

**Firestore коллекции:**
- `development` → `periods/{periodId}`
- `clinical` → `clinical-topics/{topicId}`
- `general` → `general-topics/{topicId}`

---

### Управление темами и книгами

| Маршрут | Компонент | Роль | Описание | Lazy |
|---------|-----------|------|----------|------|
| `/admin/topics` | `AdminTopics` | Admin | Управление темами для заметок | ✅ |
| `/admin/books` | `AdminBooks` | Admin | Управление книгами для RAG-поиска | ✅ |
| `/admin/homepage` | `AdminHomepage` | Admin | Редактор главной страницы | ✅ |

---

### Создание тестов

Тесты создаются через `/admin/content`:
1. Кнопка "Создать тест" внизу списка периодов
2. Заполнение формы (title, description, rubric, questions)
3. Сохранение в Firestore (`tests/{testId}`)

**См. подробности:** [docs/guides/testing-system.md](../guides/testing-system.md)

---

## Система ролей

### Роли и права доступа

| Роль | Доступ | Маршруты |
|------|--------|----------|
| **Гость** | Публичный контент | `/`, `/intro`, `/prenatal`, `/0-1`, ... |
| **Student** | Базовый доступ | + `/profile`, `/notes`, `/tests`, `/timeline` |
| **Student + courseAccess.clinical** | Клиническая психология | + `/clinical/*` |
| **Student + courseAccess.general** | Общая психология | + `/general/*` |
| **Admin** | Редактирование контента | + `/admin/content`, `/admin/topics`, `/admin/books`, `/admin/homepage` |
| **Super Admin** | Полный доступ | + `/admin`, `/admin/users` |

### Гранулярный доступ к курсам

Super Admin может выдать студенту доступ к отдельным курсам через `/admin/users`:

```typescript
// Firestore: users/{userId}
{
  "role": "student",
  "courseAccess": {
    "clinical": true,   // Доступ к клинической психологии
    "general": false    // Нет доступа к общей психологии
  }
}
```

**Проверка доступа:**
```typescript
// src/stores/useAuthStore.ts
const hasClinicalAccess = useAuthStore(state => state.user?.courseAccess?.clinical);
const hasGeneralAccess = useAuthStore(state => state.user?.courseAccess?.general);
```

---

## Lazy Loading

### Конфигурация

**Файл:** `src/pages/lazy.ts`

Все ленивые страницы экспортируются через `React.lazy`:

```typescript
export const LazyTimelinePage = React.lazy(() => import('./TimelinePage'));
export const LazyNotesPage = React.lazy(() => import('./NotesPage'));
export const LazyTestsOverview = React.lazy(() => import('./TestsOverview'));
export const LazyTestPage = React.lazy(() => import('./TestPage'));
export const LazyUserProfile = React.lazy(() => import('./UserProfile'));
export const LazyAdminDashboard = React.lazy(() => import('./Admin/AdminDashboard'));
export const LazyAdminUsers = React.lazy(() => import('./Admin/AdminUsers'));
export const LazyAdminContent = React.lazy(() => import('./Admin/AdminContent'));
export const LazyAdminContentEdit = React.lazy(() => import('./Admin/AdminContentEdit'));
export const LazyAdminTopics = React.lazy(() => import('./Admin/AdminTopics'));
export const LazyAdminBooks = React.lazy(() => import('./Admin/AdminBooks'));
export const LazyAdminHomepage = React.lazy(() => import('./Admin/AdminHomepage'));
```

### Использование в роутинге

**Файл:** `src/app/AppRoutes.tsx`

```typescript
<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/timeline" element={<LazyTimelinePage />} />
    <Route path="/notes" element={<LazyNotesPage />} />
    <Route path="/tests" element={<LazyTestsOverview />} />
    <Route path="/tests/dynamic/:testId" element={<LazyTestPage />} />
    <Route path="/profile" element={<LazyUserProfile />} />

    <Route path="/admin" element={<LazyAdminDashboard />} />
    <Route path="/admin/users" element={<LazyAdminUsers />} />
    <Route path="/admin/content" element={<LazyAdminContent />} />
    <Route path="/admin/content/edit/:periodId" element={<LazyAdminContentEdit />} />
    <Route path="/admin/topics" element={<LazyAdminTopics />} />
    <Route path="/admin/books" element={<LazyAdminBooks />} />
    <Route path="/admin/homepage" element={<LazyAdminHomepage />} />
  </Routes>
</Suspense>
```

### Manual Chunks (Vite)

**Файл:** `vite.config.js`

```javascript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'timeline': ['src/pages/TimelinePage.tsx'],
        'timeline-canvas': ['src/features/timeline/TimelineCanvas.tsx'],
        'timeline-left-panel': ['src/features/timeline/LeftPanel.tsx'],
        'timeline-right-panel': ['src/features/timeline/RightPanel.tsx'],
        'timeline-bulk': ['src/features/timeline/BulkOperations.tsx'],
        'timeline-help': ['src/features/timeline/TimelineHelp.tsx'],
        'tests': ['src/pages/TestsOverview.tsx', 'src/pages/TestPage.tsx'],
        'admin': [
          'src/pages/Admin/AdminDashboard.tsx',
          'src/pages/Admin/AdminUsers.tsx',
          'src/pages/Admin/AdminContent.tsx',
          'src/pages/Admin/AdminTopics.tsx',
          'src/pages/Admin/AdminBooks.tsx',
          'src/pages/Admin/AdminHomepage.tsx'
        ],
        'notes': ['src/pages/NotesPage.tsx'],
        'profile': ['src/pages/UserProfile.tsx'],
      }
    }
  }
}
```

**Целевой размер чанков:** 200-600 KB

**Проверка:** `npm run build` + анализ размеров в консоли

---

## Связанные документы

- 🏗️ [Architecture Overview](../architecture/overview.md) — обзор архитектуры
- 🗄️ [Firestore Schema](firestore-schema.md) — структура данных
- 🧪 [Testing System Guide](../guides/testing-system.md) — система тестирования
- 📘 [Architecture Guidelines](../architecture/guidelines.md) — архитектурные правила

---

**Последнее обновление:** 2026-01-09
**Версия:** 1.0
