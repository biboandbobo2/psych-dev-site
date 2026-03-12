# Обзор планов

> Таблица ниже формируется автоматически. Не редактируйте её вручную — используйте `npm run docs:plans`.

<!-- plans:table:start -->

| Подсистема | План | Документ | Текущий статус | Следующий шаг | Ключевые артефакты |
|------------|------|----------|----------------|---------------|--------------------|
| Core | Refactoring Plan | [archive/REFRACTORING_ARCHIVE.md#core](archive/REFRACTORING_ARCHIVE.md#core) | ✅ Все фазы 1‑6 выполнены, Phase 6 QA описана | Поддерживать `docs/processes/qa-smoke-log.md` и обновлять backlog | Docs, SaveNoteAsEventButton, Notes, notesExport.ts |
| Timeline | Refactoring Plan | [archive/REFRACTORING_ARCHIVE.md#timeline](archive/REFRACTORING_ARCHIVE.md#timeline) | ✅ Фазы 1‑5 завершены, Phase 6 дополнил тесты/релизный блок | Логировать manual smoke / `npm run build`, синхронизировать Timeline guide | parseBulkEvents, formatEventAsNote, useTimeline тесты |
| Tests | Refactoring Plan | [archive/REFRACTORING_ARCHIVE.md#tests](archive/REFRACTORING_ARCHIVE.md#tests) | 🟢 Основные задачи (перенос утилит, разбивка тестов) завершены | Поддерживать testing guide, запуск ts-prune, обновлять бэклог | src/utils/test*, tests, guides |
| Notes & Exports | Infrastructure | [archive/REFRACTORING_ARCHIVE.md#notes--export--ui-helpers](archive/REFRACTORING_ARCHIVE.md#notes--export--ui-helpers) | ✅ Раздел Notes реорганизован, экспорты вынесены в notesExport.ts | Следить, чтобы новые заметки использовали существующие хуки/принципы | NotesHeader, NoteModal, SaveNoteAsEventButton |
| Архитектура | Guideline | [architecture/guidelines.md](architecture/guidelines.md) | ✅ Актуальные гайды с SRP/DRY/композицией и checklist | Напоминать о принципах перед новым таском (см. README) | Чеклист перед коммитом, state/hooks рекомендации |

<!-- plans:table:end -->

## QA/Smoke статус
- `SaveNoteAsEventButton` юнит-тесты (`src/components/__tests__/SaveNoteAsEventButton.test.tsx`) — ✅ `vitest` проходит.
- `useTimeline` юнит-тесты (`src/hooks/__tests__/useTimeline.test.ts`) — ✅ `vitest` проходит.
- `npm run build` — ✅ проходит, есть warning по размеру чанков (см. `docs/archive/REFRACTORING_ARCHIVE.md`).
- Все ручные smoke (CRUD заметок, экспорт, создание события, админ-флоу) фиксируйте в `docs/processes/qa-smoke-log.md`.

## Аудит проекта (краткий)
1. Подробные рефакторинг-планы перенесены в `docs/archive/REFRACTORING_ARCHIVE.md`; актуальные задачи находятся в `docs/processes/audit-backlog.md`.
2. `docs/archive/legacy/TIMELINE_REFACTORING_PLAN.md` и `docs/archive/legacy/CORE_REFACTORING_PLAN.md` оставлены как указатели; при обновлении документации используйте `REFRACTORING_ARCHIVE`.
3. Корневой `README.md` уже сокращён до роли entrypoint; глубокие guide/reference/process документы живут в `docs/*`.
4. Последний полный review-pass сохранён в `docs/reports/CODE_REVIEW_2026-03-12.md`; новые runtime/documentation follow-up задачи синхронизируются через `docs/processes/audit-backlog.md`.

> Обновляйте этот файл после каждой крупной фазы или аудита, чтобы новые участники сразу понимали статус.
