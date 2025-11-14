# Обзор планов

> Таблица ниже формируется автоматически. Не редактируйте её вручную — используйте `npm run docs:plans`.

<!-- plans:table:start -->

| Подсистема | План | Документ | Текущий статус | Следующий шаг | Ключевые артефакты |
|------------|------|----------|----------------|---------------|--------------------|
| Core | Refactoring Plan | [docs/REFRACTORING_ARCHIVE.md#core](docs/REFRACTORING_ARCHIVE.md#core) | ✅ Все фазы 1‑6 выполнены, Phase 6 QA описана | Поддерживать docs/qa-smoke-log.md и обновлять audit-backlog.md | Docs, SaveNoteAsEventButton, Notes, notesExport.ts |
| Timeline | Refactoring Plan | [docs/REFRACTORING_ARCHIVE.md#timeline](docs/REFRACTORING_ARCHIVE.md#timeline) | ✅ Фазы 1‑5 завершены, Phase 6 дополнил тесты/релизный блок | Логировать manual smoke / npm run build, синхронизировать TimelineGuide | parseBulkEvents, formatEventAsNote, useTimeline тесты |
| Tests | Refactoring Plan | [docs/REFRACTORING_ARCHIVE.md#tests](docs/REFRACTORING_ARCHIVE.md#tests) | 🟢 Основные задачи (перенос утилит, разбивка тестов) завершены | Поддерживать TestingSystemGuide, запуск ts-prune, обновлять бэклог | src/utils/test*, tests, guides |
| Notes & Exports | Infrastructure | [docs/REFRACTORING_ARCHIVE.md#notes--export--ui-helpers](docs/REFRACTORING_ARCHIVE.md#notes--export--ui-helpers) | ✅ Раздел Notes реорганизован, экспорты вынесены в notesExport.ts | Следить, чтобы новые заметки использовали существующие хуки/принципы | NotesHeader, NoteModal, SaveNoteAsEventButton |
| Архитектура | Guideline | [docs/ARCHITECTURE_GUIDELINES.md](docs/ARCHITECTURE_GUIDELINES.md) | ✅ Актуальные гайды с SRP/DRY/композицией и checklist | Напоминать о принципах перед новым таском (см. README) | Чеклист перед коммитом, state/hooks рекомендации |

<!-- plans:table:end -->

## QA/Smoke статус
- `SaveNoteAsEventButton` юнит-тесты (`src/components/__tests__/SaveNoteAsEventButton.test.tsx`) — ✅ `vitest` проходит.
- `useTimeline` юнит-тесты (`src/hooks/__tests__/useTimeline.test.ts`) — ✅ `vitest` проходит.
- `npm run build` — ✅ проходит, есть warning по размеру чанков (см. `docs/REFRACTORING_ARCHIVE.md`).
- Все ручные smoke (CRUD заметок, экспорт, создание события, админ-флоу) фиксируйте в `docs/qa-smoke-log.md`.

## Аудит проекта (краткий)
1. Подробные рефакторинг-планы перенесены в `docs/REFRACTORING_ARCHIVE.md`; актуальные задачи находятся в `docs/audit-backlog.md`.
2. `docs/TIMELINE_REFACTORING_PLAN.md` и `docs/CORE_REFACTORING_PLAN.md` оставлены как указатели (архив); при обновлении документации используйте `REFRACTORING_ARCHIVE`.
3. Архитектурные принципы (SRP/DRY/композиция) описаны в `docs/ARCHITECTURE_GUIDELINES.md`; добавьте ссылку на них в README (см. соответствующую задачу).

> Обновляйте этот файл после каждой крупной фазы или аудита, чтобы новые участники сразу понимали статус.
