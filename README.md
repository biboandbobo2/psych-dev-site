# Psych Dev Site

Образовательная платформа по психологии с тремя курсами, интерактивными инструментами и AI-функциями. Репозиторий содержит клиент на React/Vite, API-слой на Vercel Functions и Firebase-инфраструктуру.

## Что здесь есть

- 3 основных курса: психология развития, клиническая психология, общая психология
- динамические курсы с уроками в Firestore
- заметки, тесты, таймлайн жизни, поиск по исследованиям и книгам
- админские сценарии для контента, пользователей и публикации материалов

## Стек

- React 19 + TypeScript + Vite
- Firebase: Firestore, Auth, Storage, Cloud Functions
- Zustand для state management
- Vercel для фронтенда и `/api/*`

## С чего начать

- Быстрый локальный запуск: [docs/QUICK_START.md](docs/QUICK_START.md)
- Каталог всей документации: [docs/README.md](docs/README.md)
- Архитектурный обзор: [docs/architecture/overview.md](docs/architecture/overview.md)
- Архитектурные правила: [docs/architecture/guidelines.md](docs/architecture/guidelines.md)
- Workflow тестирования и валидации: [docs/development/testing-workflow.md](docs/development/testing-workflow.md)
- Маршруты приложения: [docs/reference/routes.md](docs/reference/routes.md)
- Firestore схема: [docs/reference/firestore-schema.md](docs/reference/firestore-schema.md)
- История изменений: [CHANGELOG.md](CHANGELOG.md)

## Ключевые разделы продукта

### Курсы и маршруты

- Публичные курсы: `/`, `/clinical/*`, `/general/*`
- Динамические курсы: `/course/{courseId}/{lessonId}`
- Пользовательские инструменты: `/notes`, `/tests`, `/timeline`, `/profile`
- Админские зоны: `/admin/content`, `/admin/users`, `/admin/topics`, `/admin/books`

Полный список URL и назначений см. в [docs/reference/routes.md](docs/reference/routes.md).

### Данные и Firestore

- Основные коллекции контента: `periods`, `clinical-topics`, `general-topics`, `courses`
- Пользовательские данные: `notes`, `testResults`, `timelines`
- Служебные данные и AI-фичи: книги, transcript jobs, feedback, admin tasks

Подробная схема коллекций, документов и полей описана в [docs/reference/firestore-schema.md](docs/reference/firestore-schema.md).

## Разработка

```bash
npm install
npm run dev
```

Перед изменениями в коде сначала прочитай [docs/architecture/guidelines.md](docs/architecture/guidelines.md). Перед коммитом используй как минимум:

```bash
npm run validate
```

Если меняешь поведение или инфраструктуру тестов, см. [docs/development/testing-workflow.md](docs/development/testing-workflow.md) и фиксируй прогоны в [docs/processes/qa-smoke-log.md](docs/processes/qa-smoke-log.md).

## Деплой и окружения

- Основная ветка: `main`
- Production URL: `https://psych-dev-site.vercel.app`
- Preview-checklist: [PREVIEW_CHECKLIST_VERCEL.md](PREVIEW_CHECKLIST_VERCEL.md)
- Правила безопасности и env: [docs/SECURITY_BASELINE.md](docs/SECURITY_BASELINE.md)
- Контроль затрат: [docs/COST_GUARDRAILS.md](docs/COST_GUARDRAILS.md)

Cloud Functions и Firebase-ресурсы деплойятся отдельно; перед любым прод-деплоем сверяйся с проектными инструкциями и связанными docs.
