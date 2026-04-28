# Документация проекта

Этот файл служит каталогом документации. В отличие от корневого `README.md`, здесь нет обзора продукта и длинного фич-листа: только структура знаний, входные точки и назначение каждого документа.

## Стартовые точки

- Новый участник проекта: [QUICK_START.md](QUICK_START.md)
- Архитектурный контекст: [architecture/overview.md](architecture/overview.md)
- Обязательные правила перед изменениями: [architecture/guidelines.md](architecture/guidelines.md)
- Workflow разработки и валидации: [development/testing-workflow.md](development/testing-workflow.md)

## Архитектура

- [architecture/overview.md](architecture/overview.md) — высокоуровневая схема приложения и потоков данных
- [architecture/guidelines.md](architecture/guidelines.md) — практические правила по структуре, размерам файлов, логированию и code splitting
- [architecture/principles.md](architecture/principles.md) — короткий чеклист перед задачей или рефакторингом

## Гайды по подсистемам

- [guides/testing-system.md](guides/testing-system.md) — система тестов, редактор, цепочки, import/export
- [guides/timeline.md](guides/timeline.md) — устройство таймлайна и связанные UI/данные
- [guides/multi-course.md](guides/multi-course.md) — мультикурсовая архитектура и dynamic courses
- [guides/lecture-transcript-ai.md](guides/lecture-transcript-ai.md) — видеолекции, transcript pipeline, глобальный transcript search и ИИ по лекциям
- [guides/book-rag.md](guides/book-rag.md) — поиск по книгам и ingestion pipeline
- [guides/feedback-system.md](guides/feedback-system.md) — feedback flow и Telegram-интеграция

## Разработка и процессы

- [development/testing-workflow.md](development/testing-workflow.md) — локальная валидация, хуки, CI-ориентированный workflow
- [processes/qa-smoke-log.md](processes/qa-smoke-log.md) — журнал запусков тестов и smoke-проверок
- [processes/audit-backlog.md](processes/audit-backlog.md) — активный техдолг, backlog и follow-up задачи
- [PLANS_OVERVIEW.md](PLANS_OVERVIEW.md) — сводный статус планов и архивных рефакторингов

## Справка

- [reference/routes.md](reference/routes.md) — маршруты приложения и ограничения доступа
- [reference/firestore-schema.md](reference/firestore-schema.md) — коллекции Firestore, документы и поля
- [reference/perf-metrics.md](reference/perf-metrics.md) — метрики сборки и производительности
- [reference/RESEARCH_SEARCH_ANALYSIS.md](reference/RESEARCH_SEARCH_ANALYSIS.md) — анализ релевантности research search
- [reference/research_search_eval_queries.md](reference/research_search_eval_queries.md) — eval-набор для search

## Безопасность, расходы и эксплуатация

- [SECURITY_BASELINE.md](SECURITY_BASELINE.md) — базовые правила по секретам, env и инцидентам
- [COST_GUARDRAILS.md](COST_GUARDRAILS.md) — guardrails по затратам и cleanup-практики
- [POSTMORTEM_COST_AND_SECURITY.md](POSTMORTEM_COST_AND_SECURITY.md) — контекст принятых решений и последующих действий
- [BRANCH_PROTECTION_SETUP.md](BRANCH_PROTECTION_SETUP.md) — настройка protection rules
- [security/container-scanning-2026-02-01.md](security/container-scanning-2026-02-01.md) — отчёт по container scanning

## Дизайн и идеи

- [design/design-code.md](design/design-code.md) — дизайн-код, палитры и визуальные конвенции
- [design/design-ideas.md](design/design-ideas.md) — идеи интерфейсов
- [ideas/product-ideas.md](ideas/product-ideas.md) — продуктовые и UX-идеи

## Отчёты и архив

- [reports/README.md](reports/README.md) — разовые аудиты, инвентари и отчётные артефакты
- [archive/REFRACTORING_ARCHIVE.md](archive/REFRACTORING_ARCHIVE.md) — сводка завершённых рефакторингов
- [archive/refactoring/](archive/refactoring/) — архивные планы по отдельным инициативам
- [archive/legacy/](archive/legacy/) — устаревшие документы и указатели совместимости

## Корневые документы репозитория

Эти файлы intentionally остаются в корне и не дублируются здесь:

- [`README.md`](../README.md) — краткий обзор репозитория и основные входные точки
- [`CHANGELOG.md`](../CHANGELOG.md) — история изменений
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — contribution rules
- [`AGENTS.md`](../AGENTS.md) — системные инструкции для Codex
- [`PREVIEW_CHECKLIST_VERCEL.md`](../PREVIEW_CHECKLIST_VERCEL.md) — preview smoke-checklist

## Правила обновления

- Меняется архитектура или инженерные правила: обновляй `architecture/*`
- Меняется поведение конкретной подсистемы: обновляй соответствующий `guides/*`
- Запускаются тесты или smoke: добавляй запись в `processes/qa-smoke-log.md`
- Появляется новый техдолг или follow-up: обновляй `processes/audit-backlog.md`
- Появляется разовый аудит или инвентарь: клади его в `reports/`

**Последнее обновление:** 2026-04-28
