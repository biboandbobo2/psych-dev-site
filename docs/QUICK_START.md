# 🚀 Быстрый старт

> **Время:** 5-10 минут
> **Цель:** Запустить проект локально и сделать первый коммит

---

## 1. Установка (30 сек)

```bash
git clone https://github.com/your-repo/psych-dev-site.git
cd psych-dev-site
npm install
```

---

## 2. Настройка окружения (1 мин)

Создай файл `.env.local` в корне проекта:

```bash
# Firebase (клиент)
VITE_FIREBASE_API_KEY=AIzaSyCJrB77CvgaZQ6Ig8DG0p3d9N5S5ZH5srw
VITE_FIREBASE_AUTH_DOMAIN=psych-dev-site-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=psych-dev-site-prod
VITE_FIREBASE_STORAGE_BUCKET=psych-dev-site-prod.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1006911372271
VITE_FIREBASE_APP_ID=1:1006911372271:web:b7e9b4371c8ece412e941a
```

> 💡 **Полный список переменных:** [reference/env-variables.md](reference/env-variables.md)

---

## 3. Запуск (10 сек)

```bash
npm run dev
```

Открой http://localhost:5173 — сайт должен загрузиться.

### Тестовый деплой

**Ветка:** `red-background`

**Тестовый URL:** https://psych-dev-site-git-red-background-alexey-zykovs-projects.vercel.app

⚠️ **ВАЖНО:** Основное тестирование проводим на этом адресе, а не локально! Каждый push в ветку `red-background` автоматически деплоится на Vercel.

---

## 4. Проверка перед коммитом (2 мин)

### Прочитай ключевые правила

**ОБЯЗАТЕЛЬНО:** [architecture/guidelines.md](architecture/guidelines.md) — 10 минут чтения

**Ключевые моменты:**
- ✅ Файлы < 500 строк
- ✅ Используй `debugLog/debugError` вместо `console.*`
- ✅ Компоненты < 300 строк
- ✅ Single Responsibility Principle

### Запусти валидацию

```bash
npm run validate
```

Команда проверит:
- ESLint
- Запрещённые `console.*`
- Инициализацию модулей
- Production build

**Время:** ~5-10 секунд

---

## 5. Первый коммит

Git hooks автоматически проверят твой код:

```bash
git add .
git commit -m "feat: my first commit"
# ✅ Pre-commit hook: lint + check-console + check:init

git push
# ✅ Pre-push hook: validate (full validation)
```

---

## 6. Куда дальше?

### 📚 Основные гайды
- [Система тестирования](guides/testing-system.md) — создание и управление тестами
- [Timeline система](guides/timeline.md) — интерактивная карта событий жизни
- [Мультикурсовая система](guides/multi-course.md) — 3 курса в одном приложении

### 🏗️ Архитектура
- [Обзор архитектуры](architecture/overview.md) ← **рекомендуется**
- [Архитектурные правила](architecture/guidelines.md)
- [Принципы проектирования](architecture/principles.md)

### 🛠️ Разработка
- [Testing workflow](development/testing-workflow.md) — как тестировать код
- [Процессы проекта](processes/) — QA лог, audit backlog

### 📖 Справка
- [Firestore схема](reference/firestore-schema.md) — структура данных
- [Маршруты приложения](reference/routes.md) — все URL
- [Метрики производительности](reference/perf-metrics.md)

---

## 🆘 Частые проблемы

### Pre-commit hook не проходит

**Ошибка:** `console.* обнаружены`

**Решение:**
```typescript
// ❌ Было
console.log('test');

// ✅ Стало
import { debugLog } from '@/lib/debug';
debugLog('test');
```

### Build падает с ошибкой

**Ошибка:** `Cannot access uninitialized variable`

**Решение:** Прочитай [architecture/guidelines.md#module-initialization-testing](architecture/guidelines.md#module-initialization-testing)

### Не знаю с чего начать

1. Прочитай [architecture/overview.md](architecture/overview.md) (15 минут)
2. Изучи структуру проекта: `src/pages/`, `src/components/`, `src/hooks/`
3. Посмотри примеры кода в существующих компонентах
4. Задавай вопросы!

---

**Последнее обновление:** 2026-01-08
