# ТЗ: Кабинет автора курса

> **Дата:** 2026-08-29
> **Заказчик:** Алексей
> **Статус:** готово к выполнению
> **Формат:** самодостаточный промпт для выполняющей сессии Claude Code. Выполнять из корня `psych-dev-site`.

---

## Роль и обязательная подготовка

Ты — разработчик проекта psych-dev-site (React 19 + TypeScript + Vite + Firebase + Zustand). Перед началом прочитай:

- корневой `CLAUDE.md` — непереговорные инварианты (логирование, lazy loading, лимит Vercel-функций, деплой-политика);
- `docs/architecture/guidelines.md`;
- `docs/guides/multi-course.md` — система курсов и `editableCourses`;
- `docs/guides/product-telemetry.md`;
- `docs/development/testing-workflow.md`.

Карта текущего состояния ниже проверена по коду 2026-08-29. **Перед правками перепроверь каждый факт** — если файл/строка уехали, найди актуальное место, а не правь вслепую.

## Бизнес-цель

Академия запускает направление «размещение внешних курсов»: приглашённый автор получает админ-доступ строго к своему курсу — «кабинет автора». Сегодня админка этому мешает: любой админ видит **все** курсы (включая core development/clinical/general), а Firestore-правило на `feature_events` позволяет любому админу вычитать телеметрию всей платформы. Нужно: админ видит и администрирует только курсы из своих прав + видит телеметрию только по своим курсам.

## Карта текущего состояния

**Права.** Custom claim `editableCourses` (плоский `string[]`) пишется в `functions/src/makeAdmin.ts:82-93` одновременно в claim и в Firestore-зеркало `users/{uid}.adminEditableCourses`. Клиент читает **только зеркало**: `src/stores/useAuthStore.ts:337-345` → стор-поле `adminEditableCourses`. Готовый хелпер `canEditCourse(role, adminEditableCourses, courseId)` — `src/types/user.ts:125-133` (super-admin → всегда true), тесты в `src/types/user.test.ts:81-98`. **Образец нужной фильтрации уже есть**: `src/pages/admin/questions/AdminLectureQuestions.tsx:48-79` фильтрует список курсов по `canEditCourse`, включая синхронизацию `?course=` и фолбэк.

**Известный рассинхрон.** Фоновый `getIdTokenResult(true)` в `src/stores/useAuthStore.ts:225-247` обновляет только `role` и `coAdmin` — `editableCourses` из claim не читается никогда. UI-истина (зеркало) и rules-истина (claim в токене, живёт до часа) могут расходиться: «кнопка активна, запись отклонена».

**Админка.** Единственный источник списка курсов — `src/hooks/useCourses.ts:93` (`buildCourseOptions` всегда подмешивает core-курсы из `CORE_COURSE_LIST`, `src/constants/courses.ts:37-41`; про роли не знает). Сайдбар `src/components/AdminCourseSidebar.tsx:75` и `src/pages/AdminContent.tsx:45` берут нефильтрованный список. Активный курс — `useActiveCourse` (`src/hooks/useActiveCourse.ts:13-31`) с хардкод-фолбэком `'development'` (`:20`). Занятия чужого курса грузятся всегда (`loadPeriods`, `AdminContent.tsx:89-117`). Кнопка «Добавить курс» видна всем админам (`AdminCourseSidebar.tsx:272-279`), хотя rules отклонят создание не-суперадмином — существующий баг. Карандаш переименовать/скрыть/удалить — для каждого курса всем админам (`AdminCourseSidebar.tsx:389-402`, удаление `:230-266`). Эвристика по `document.referrer` в `AdminContent.tsx:57-78` может выставить чужой курс. Кнопка «Создать тест» без гейта (`src/pages/admin/content/AdminContentToolbar.tsx:42-48`).

**Rules уже ограничивают запись** — UI-фильтрация будет косметикой поверх корректной безопасности: `firestore.rules:230-257` (`periods`/`clinical-topics`/`general-topics`/`courses`/`lessons` — write через `canEditCourse(courseId)`), legacy-коллекции `:205-229`, `courseNavIndex` `:246-249`. Чтение контента везде публичное. Регрессия покрыта `tests/integration/firestoreRules.test.ts:760-850`.

**Телеметрия.** `src/pages/admin/telemetry/AdminTelemetry.tsx:59-65` читает `feature_events` напрямую из Firestore (однополевой запрос по `createdAt`, без limit), агрегация на клиенте `:90-119`. Поле `courseId` в модели строки уже парсится (`:16`, `:74`), но не используется. **Rules: `firestore.rules:500-501` — `allow read: if isAdmin()`** — любой админ может вычитать всю коллекцию: это дыра, закрыть обязательно до выдачи внешних админок. Композитных индексов на `feature_events` нет вовсе. События без `courseId`: `research_search` (`src/features/researchSearch/hooks/useResearchSearch.ts:161`), `book_rag_question` (`useBookAnswer.ts:91`), `selection_search` (`VideoTranscriptPanel.tsx:131`). Роут `/superadmin/telemetry` — `src/app/AppRoutes.tsx:197-206`: `RequireAdmin` + инлайн `isSuperAdmin ? <AdminTelemetry/> : <Navigate/>`. Второй блок страницы `AdminPageVisits` — трафик лендингов, обычному админу показывать нельзя.

## Объём работ

Работа делится на три этапа. **A и B — к выполнению; C — спроектировать и согласовать с Алексеем до реализации.** Каждый этап — отдельная серия коммитов (логика PR); внутри этапа — по одному законченному шагу за раз, после каждого шага — релевантные тесты.

### Этап A — границы кабинета

1. **Новый хук `useEditableCourses()`** рядом с `useCourses` (обёртка: `useCourses({ includeUnpublished: true })` + фильтр `canEditCourse` по `userRole`/`adminEditableCourses` из `useAuthStore`). **`useCourses` не трогать** — у него ~24 потребителя в студенческом UI.
2. **Фильтрация сайдбара** `AdminCourseSidebar.tsx`: список курсов и `useActiveCourse` получают отфильтрованный список. Для админа с пустым `editableCourses` — заглушка «У вас пока нет курсов в управлении» вместо пустого сайдбара.
3. **Фильтрация `AdminContent.tsx`**: тот же список перед `useActiveCourse`; ранний выход при пустых правах; `loadPeriods` не выполняется, если `!canEditActiveCourse`.
4. **`useActiveCourse.ts`**: убрать хардкод-фолбэк `'development'` (параметризовать или возвращать первый элемент переданного списка / null-состояние). Учесть персистентный `useCourseStore.currentCourse`, указывающий на чужой курс, — переключать на первый доступный.
5. **Referrer-эвристика** `AdminContent.tsx:57-78`: выставлять курс только если он проходит `canEditCourse`.
6. **Гейты кнопок**: «Добавить курс» — только super-admin; карандаш/«Удалить курс» — только для курсов, проходящих `canEditCourse` (после п.2 в списке останутся только свои, но проверь отдельно); «Создать тест» — по `canEditActiveCourse`.
7. **Дропдауны выбора курса** в `CreateLessonModal.tsx`, `CourseIntroEditor.tsx`, `TestEditorModal` (селектор курса) — только свои курсы, через тот же `useEditableCourses`.
8. **Синхронизация claim ↔ стор**: в `useAuthStore.ts:225-247` читать `editableCourses` из `getIdTokenResult` и использовать его как источник для `adminEditableCourses` (зеркало — фолбэк до прихода токена). Цель: UI не показывает курс, куда rules не пустят. Обновить `useAuthStore`-тесты.
9. Супер-админ не теряет ничего: видит все курсы, все кнопки — прогнать сценарий явно.

### Этап B — телеметрия по курсу

1. **Rules**: `feature_events` read → `isSuperAdmin() || (isAdmin() && canEditCourse(resource.data.get('courseId', '')))` (точную форму сверь с существующими хелперами в `firestore.rules`). Помни семантику list-запросов Firestore: запрос обычного админа обязан содержать `where('courseId','==',...)`, иначе упадёт целиком. Документы без `courseId` останутся доступны только супер-админу — это желаемое поведение.
2. **Композитный индекс** `feature_events`: `courseId ASC + createdAt DESC` в `firestore.indexes.json`.
3. **UI**: пустить обычного админа к телеметрии (роут `/admin/telemetry` рядом с остальными админскими, либо разгейтить существующий — выбери меньшую правку и обнови `routes.md`). Для админа: селектор курса из `useEditableCourses` (образец — `AdminLectureQuestions.tsx:48-79`), запрос с `where('courseId','==',...)`, скрыть `<AdminPageVisits/>` и ссылку «← Админ-панель» на `/superadmin`. Для супер-админа всё как сейчас + опциональный фильтр по курсу.
4. **Дописать `courseId`** в события `selection_search` (`VideoTranscriptPanel.tsx`) и `research_search` (`useResearchSearch.ts`), где курс известен по контексту; `book_rag_question` не трогать (курса может не быть по смыслу). Обновить словарь событий в `docs/guides/product-telemetry.md`.
5. **Тесты rules**: переписать блок `tests/integration/firestoreRules.test.ts:851-955` — «админ читает только события своего курса», «супер-админ читает всё», «запрос без where у админа падает».
6. **Деплой-политика (обязательно):** изменения `firestore.rules` и `firestore.indexes.json` — показать diff, перечислить что меняется и почему безопасно, **дождаться явного одобрения Алексея** перед любым `firebase deploy`. До деплоя rules прогнать `npm run validate` и integration-тесты на эмуляторе.

### Этап C — дашборд автора (спроектировать, согласовать, потом делать)

Цель: `/admin` для обычного админа — не редирект, а «кабинет»: карточки моих курсов (занятий опубликовано / черновиков, вопросов студентов без ответа, мини-сводка телеметрии за 4 недели), быстрые ссылки на контент / вопросы / телеметрию / «О курсе». Требования: минимализм (мало кнопок), переиспользование существующих хуков, никакой новой инфраструктуры. **До вёрстки — показать Алексею текстовый макет и получить одобрение** (правило: дизайн обсуждается до правок).

## Критерии приёмки

1. Аккаунт-админ с `editableCourses: ['x']` видит в сайдбаре и `/admin/content` только курс `x`; занятия чужих курсов не грузятся и не отображаются; в дропдаунах создания урока/теста/вводной — только `x`.
2. Тот же аккаунт не видит кнопок «Добавить курс», не видит карандаша на чужих курсах, «Создать тест» доступна только на своём.
3. Админ с пустым `editableCourses` видит заглушку, а не чужой контент и не пустой экран.
4. Телеметрия: админ открывает сводку только по своим курсам; попытка запроса без фильтра по курсу отклоняется rules; `AdminPageVisits` ему не виден.
5. Супер-админ: поведение не изменилось ни в одном сценарии (курсы, кнопки, телеметрия целиком).
6. Смена прав отражается в UI без «кнопка есть — запись падает» (claim-синхронизация).
7. `npm run validate` зелёный; integration rules-тесты зелёные; новые unit-тесты на `useEditableCourses` есть.

## Верификация

- После каждого шага: релевантные Vitest-тесты; в конце этапа — `npm run validate`.
- Rules: integration-тесты на эмуляторе (см. `docs/development/testing-workflow.md`).
- Если трогаешь `functions/` (не планируется, но если) — `npm run typecheck:functions` + `cd functions && npm test -- --run`; в относительных импортах `.js`.
- Ручной смоук админки (Playwright MCP или руками) под ролью admin и super-admin — сценарии из критериев приёмки; результат — в `docs/processes/qa-smoke-log.md`.

## Документация (обновить вместе с кодом)

- `docs/reference/routes.md` — роут телеметрии, таблица ролей;
- `docs/guides/product-telemetry.md` — per-course чтение, индекс (убрать «composite-индексы не нужны»), словарь событий;
- `docs/reference/firestore-schema.md` — правило чтения `feature_events`;
- `docs/guides/multi-course.md` — раздел «Кабинет автора»;
- `docs/processes/qa-smoke-log.md` — прогон смоука.
- Финал — скилл `/finish`.

## Ограничения процесса

- Никаких `console.*` — только `debugLog`/`debugError` из `@/lib/debug`.
- Не добавлять файлы в `api/` (лимит Vercel-функций).
- Минимальные хирургические правки: не рефакторить соседнее, соблюдать существующий стиль, barrel exports.
- Коммиты по шагам с понятными сообщениями; **push — только после финального коммита этапа**, не после каждого.
- Ничего не деплоить в Firebase (rules, indexes, functions) без явного одобрения.

## Перепроверка (для ревьюирующей сессии)

По завершении этапа A и этапа B: запустить `/code-review high` по диффу этапа; пройтись по критериям приёмки 1–7 как по чек-листу; отдельно проверить, что `useCourses` не изменён и студенческий UI (`/home`, `/profile`, StudentCourseSidebar, GuestLanding) ведёт себя как раньше.
