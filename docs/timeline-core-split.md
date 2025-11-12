# План дробления core-чанка Timeline

## Цель
Понизить вес основного `timeline` чанка (~4.8 МБ) без потери функциональности. Пока визуальные части вынесены (Canvas, панели, модалки), но в core всё ещё находится логика хуков (state/history/drag-drop), экспортёры и branch-интеракции. Нужно разделить логику по смыслу таким образом, чтобы при первом рендере грузился только UI-каркас + минимальные shared-хуки, а взаимодействия подгружались по необходимости.

## Опорные принципы
1. **Lazy по сценариям, не по файлам.** Дробление должно ориентироваться на пользовательские сценарии (drag/drop, export, ветвление). Одна lazy-обёртка может объединять несколько хуков, если они всегда нужны вместе.
2. **Не возвращать shared-хуки в main chunk.** `useNotes`, `useAuthStore`, `usePeriods` и др. остаются в `src/hooks/*` и никак не импортируют компоненты страниц. Это предотвращает рост initial bundle при разбиении.
3. **Обязательно `Suspense` + `PageLoader`.** Каждый новый lazy-компонент должен оборачиваться в `Suspense` с понятным skeleton-й, чтобы UI оставался интерактивным.
4. **Происходит постепенный rollout.** Сначала только вынести UI в `Timeline`, потом - данные. Отдельный документ фиксирует статусы и команды (`npm run build`, `npm run test`).

## Структура задачи
1. **Создать или выделить контейнер `TimelineInteractions`.** Одна из стратегий — вынести сложную бизнес-логику (хуки, обработчики drag/drop, branch, history, export) в отдельный компонент, который грузится `lazy`. Схема:
   - `Timeline.tsx` рендерит UI (панели, холст, модалки) и передаёт `props` (nodes, edges, handlers) в `TimelineInteractions`, но вызывает его лениво:
     ```tsx
     const TimelineInteractions = lazy(() => import('./timeline/TimelineInteractions'));
     <Suspense fallback={<PageLoader label="Подключаем интерактив" />}>
       <TimelineInteractions ...props />
     </Suspense>
     ```
   - `TimelineInteractions` импортирует все хуки (`useTimelineState`, `useTimelineHistory`, `useTimelineDragDrop`, `useTimelineBranch`, `useTimelineCRUD`, `useDownloadMenu`, экспортёры) и передаёт значения обратно в UI через render-props или контекст.
2. **Ленивая обработка экспорта.** Вынести `exportTimelineJSON/PNG/PDF` и `useDownloadMenu` с `DownloadMenu` в `lazy` модуль (или сделать `lazy` мемо для самой кнопки скачивания). Тогда экспортный код загрузится только после открытия меню.
3. **Подключение drag/drop/history.** Вместо использования строк `useTimelineDragDrop` в `Timeline.tsx` — переместить логику в `TimelineInteractions`. UI (Canvas) просто получает `handlers` и используем `useCallback` для передачи. Пока логика не загружена, можно показывать skeleton или блокировать определённые действия.
4. **Роутинг хуков.** Добавить manualChunk `timeline-hooks` или `timeline-business` в `vite.config.js`, чтобы указанная логика ушла в соседний файл:
   ```ts
   if (id.includes('/src/pages/timeline/hooks/') || id.includes('TimelineInteractions')) return 'timeline-hooks';
   ```
5. **Документация.** Обновить `docs/lazy-loading-migration.md` (раздел 4.4) и новые документ (`docs/timeline-core-split.md`), фиксируя шаги, команды (`npm run build`, `npm run test`), статусы chunk-ов до/после и какие lazy-блоки добавлены.
6. **Тесты и e2e.** После каждого этапа запускается `npm run test`, а ручной сценарий должен покрывать: drag/drop, branch extend, export и opening Timeline. Убедитесь, что fallback работает в slow-network (см. `docs/lazy-loading-migration.md` этап 5.2).

## Шаги реализации
1. Создать `src/pages/timeline/TimelineInteractions.tsx` (или аналог) — входные пропсы: состояния from `useTimelineState` (или экспортируйте через возвращаемый объект) и обработчики. Внутри инициализировать хуки и передать результат `props.children` или `Context`. Основной component `Timeline.tsx` остаётся UI (панели/контролы) без heavy hook импорта.
2. Переместить `useTimelineDragDrop`, `useTimelineBranch`, `useTimelineCRUD`, `useTimelineHistory` внутрь `TimelineInteractions`. Убедиться, что `nodes`, `edges`, `setNodes`, `setEdges` передаются в UI (Холст) через props или контекст.
3. Слева, справа, экспорт, модалки уже ленивы, но нужно обновить `PageLoader`-fallback, чтобы показывалось сообщение типа «Подключаем интерактив» или «Загружаем экспорт».
4. Настроить manualChunks (в `vite.config.js`), добавить правило `timeline-hooks`. Пересобрать и зафиксировать результаты (см. раздел 4.4.1/4.4.2).
5. Добавить новые `Suspense` окружения в UI (если ещё не сделано) при использовании данных из `TimelineInteractions`. Тестировать `npm run test` и ручные сценарии.

## Команды и проверки
- `npm run build` после каждого рефакторинга — фиксировать размеры chunk-ов, особенно `timeline`, `timeline-hooks`, `timeline-canvas`, `timeline-left-panel`, `timeline-right-panel`, `timeline-bulk`, `timeline-help`. Обновлять таблицу (можно добавить в doc).\n- `npm run test` и manual e2e (drag/drop → export → save).\n- Lighthouse прогон после всех этапов (см. `docs/lazy-loading-migration.md`).

## Риски и меры
1. **Недоступность хуков до загрузки.** Решение: вынести `TimelineInteractions` и компоненты, пользуясь `Suspense` и `PageLoader`, а UI получает `props` только после загрузки.
2. **Дубли shared-хуков.** Документируем, что только `src/hooks/*` импортирует shared state; новые lazy-модули не трогают `useAuthStore`, `useNotes` напрямую.
3. **Перегрузка запросами.** Не дробим каждую функцию; объединяем drag/drop + history + export в 2–3 чанка, загружаемых по событию.
4. **Сложности тестирования компонента.** Обновить `Vitest`/`rtl` тесты, чтобы `Suspense` не ломал проверку (например, `waitForElementToBeRemoved`), и документировать manual сценарии в `docs/lazy-loading-migration.md` (раздел 5.2).

> После завершения каждого шага возвращайтесь к `docs/timeline-core-split.md` и `docs/lazy-loading-migration.md`, чтобы фиксировать прогресс и обновлять размеры чанков/метрики. Это поможет выполнить задачу последовательно и без потери контекста.
