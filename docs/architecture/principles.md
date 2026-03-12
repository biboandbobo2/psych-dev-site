# Краткий гайд по архитектурным принципам

Свяжитесь с [guidelines.md](guidelines.md) для подробностей, а здесь — то, что важно помнить перед любой задачей или рефакторингом.

## Основные принципы
1. **SRP и композиция:** каждый компонент или хук отвечает за одну концепцию. Если появляется много `useState`, рассматривайте деление на подкомпоненты или кастомные хуки.
2. **DRY + переиспользуемые хуки:** дублирование логики (например в `Notes`/`Timeline`) стоит вынести в хуки (`useNotes`, `useTimeline`, `useContentEditor`).
3. **Feature-based структура:** добавляйте файлы рядом с функцией (например, `src/pages/notes/components`, `src/pages/admin/topics`).
4. **Управление состоянием:** минимизируйте глобальные контексты, используйте локальные хранилища (например, `useTimeline`) и утилиты (`notesExport.ts`).
5. **Тестируемость:** пишите тесты для критичных потоков (см. [testing-system.md](../guides/testing-system.md) и [audit-backlog.md](../processes/audit-backlog.md)).

## Практические пункты перед задачей
- Проверьте, нет ли похожей логики в `src/hooks` или `src/utils`. Возможно, достаточно расширить существующий хук.
- Оцените размер файла: если он превышает 250–300 строк (за исключением canvas/высокоинтерактивных файлов), подумайте о разбиении.
- Убедитесь, что добавляемые стили используют существующие палитры/стили (см. `theme.ts`, `color.ts`).
- Перед коммитом прогоните `npm run test` (или минимальные `vitest`), а для UI — `npm run build` и ручной smoke, если влияет на ключевые flows.

## Чеклист для рефакторинга
- [ ] Отделил логику в хук/утилиту, если компонент растёт. (`Notes`, `NoteModal`, `SaveNoteAsEventButton` — примеры).
- [ ] Обновил документацию (особенно [audit-backlog.md](../processes/audit-backlog.md) или [REFRACTORING_ARCHIVE.md](../archive/REFRACTORING_ARCHIVE.md)), если затронул архитектурные компоненты.
- [ ] Добавил/обновил тесты для критичного поведения (`SaveNoteAsEventButton`, `useTimeline`).
- [ ] Указал manual smoke/QA в [REFRACTORING_ARCHIVE.md](../archive/REFRACTORING_ARCHIVE.md) или [PLANS_OVERVIEW.md](../PLANS_OVERVIEW.md).

Ссылки: см. [guidelines.md](guidelines.md) для примеров и шаблонов кода и [PLANS_OVERVIEW.md](../PLANS_OVERVIEW.md) для текущих статусов.
