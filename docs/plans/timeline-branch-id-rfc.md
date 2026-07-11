# RFC: `branchId` вместо координатной идентичности веток

Статус: **фазы 1–3 реализованы** (фаза 1 — `feature/timeline-branch-id`,
2026-07-09; фазы 2–3 — `feature/timeline-branch-id-phase2`, 2026-07-11).
Контекст: продолжение `docs/plans/timeline-invariant-audit.md` (раздел
«Предложения по улучшению», пункт 1) и разбора дефектов biography-импорта
(Д-B1/Д-B4/Д-B7).

## Итог реализации (2026-07-11)

- **Членство — по ссылке**: `buildTimelineTree` группирует события по
  `node.branchId === edge.id`; координата `parentX === edge.x` осталась
  fallback'ом ТОЛЬКО для legacy-узлов без ссылки (и работает как механизм
  досева при загрузке). Класс Д5 закрыт для всех данных со ссылкой —
  см. `timelineTree.branchId.test.ts` (drag/delete при shared-x не трогают
  чужие события).
- **Normalize лечит ссылку**: висячий `branchId` снимается (узел лечится
  координатно), при валидной ссылке с разъехавшимся `parentX` презентация
  подтягивается к `edge.x` с сохранением per-node смещения. Досев
  отсутствующего `branchId` — как в фазе 1. Идемпотентно (I4).
- **Все писатели проставляют ссылку**: `handleFormSubmit`/`quickCreateEvent`
  (useTimelineCRUD), `BulkEventCreator`, миграция в
  `applyBranchDeletionToFlat` (мигранты получают `branchId` линии origin,
  внучатые — своей выжившей ветки), biography-рендер (фаза 1). Drag
  `branchId` не меняет — drag стал чистой презентацией.
- **Фаза 3, сознательное отклонение от исходного плана**: `claimFreeX`-walk,
  B12-walk в `extendBranch` и уникальность x в `pickBranchX`/спурах
  СОХРАНЕНЫ — но уже не как защита идентичности (это делает ссылка), а как
  презентация: две ветки на одном x рисуются друг на друге и нечитаемы.
  `validEdgeXs`-healing (B5) сохранён для legacy-узлов без ссылки.
  Комментарии в коде обновлены соответственно.

## 1. Текущая координатная модель и её проблемы

В wire-формате таймлайна (Firestore) принадлежность события ветке закодирована
**координатой**, а не ссылкой по id:

- `NodeT { id, age, x?, parentX?, label, … }` — событие.
  `parentX === undefined | LINE_X_POSITION (2000)` → событие на главной линии;
  иначе `parentX` должен равняться `x` некоторой ветки.
- `EdgeT { id, x, startAge, endAge, color, nodeId, label? }` — ветка. Растёт из
  события `nodeId`, живёт в окне `[startAge, endAge]`; её «адрес» — координата `x`.
- Связь «событие принадлежит ветке» = `node.parentX === edge.x`. **Ссылки по id
  между узлом и веткой нет.**

Следствие — `x` перегружен двумя ролями: (а) презентация (куда рисовать) и
(б) идентичность (кому принадлежит событие). Как только две ветки делят один
`x` с пересекающимися возрастными окнами, роль (б) становится неоднозначной:

- `buildTimelineTree` ([src/pages/timeline/utils/timelineTree.ts](../../src/pages/timeline/utils/timelineTree.ts))
  группирует события по `parentX` (`nodesByParentX`) и разрешает коллизию
  `claimedNodeIds` — события достаются той ветке, которую обход встретил первой
  (детерминированно, но произвольно).
- `normalizeImportedTimelineData` ([src/pages/timeline/persistence.ts](../../src/pages/timeline/persistence.ts))
  на каждой загрузке лечит orphan-узлы по `validEdgeXs` (множество `x` живых
  веток) — тоже матчинг по координате.

Это первопричина целого класса дефектов, зафиксированных в аудитах:

| Дефект | Где | Что происходит |
|--------|-----|----------------|
| Д5 | `timelineTree.invariants.test.ts` (2 × `it.fails`) | При shared-x членство в дереве произвольно; drag/delete трогают чужие события и переписывают их `parentX`. Помечено «ограничение формата — не исправить без смены wire». |
| Д-B1 | biography-рендер | Спур на своей же координате-родителе уводил события основной ветки. |
| Д-B4 | biography-рендер | `pickBranchX` при занятых слотах парковал ветку на занятый `x` → события двух арок сливались. |
| Д-B7 | biography-рендер + `pickBranchX` | Лейн-шеринг «с непересекающимися окнами» отдавал события обеих веток одной при первой же загрузке. |

Все симптомы **залечены** запретами (нельзя делить `x`, спур ищет свободную
линию, `pickBranchX` гарантирует уникальность `x`), но корень — **координатная
идентичность** — остаётся. Каждая новая операция обязана вручную поддерживать
инвариант «разные ветки → разные `x`», иначе класс Д5 воскресает.

## 2. Предлагаемая модель

Добавить в `NodeT` опциональное поле:

```ts
branchId?: string; // id ветки-родителя (EdgeT.id); undefined → главная линия
```

- `node.branchId === edge.id` — событие принадлежит ветке `edge`. Ссылка по **id**,
  устойчивая к любым совпадениям `x`.
- `node.branchId === undefined` — событие на главной линии.
- `x` / `parentX` **остаются** и продолжают отвечать за презентацию (куда рисовать
  событие/ветку). Они перестают быть *источником истины о принадлежности* —
  но не исчезают: рендер, drag, экспорт по-прежнему работают с координатами.

Инвариант согласованности (в норме поддерживается операциями, лечится на
загрузке): если `branchId` задан, то существует `edge` с `edge.id === branchId`,
и `node.parentX === edge.x`.

## 3. Обратная совместимость

Старые Firestore-документы `branchId` не содержат. Ломать их нельзя.

- **Чтение с fallback.** `normalizeImportedTimelineData` досеивает `branchId`,
  если его нет: принадлежность выводится из текущего детерминированного дерева
  (`buildTimelineTree`, т.е. по координате — ровно как сейчас) и записывается в
  `branchId`. Поведение отрисовки не меняется — `x`/`parentX` остаются как есть.
- **Существующий `branchId` уважается.** Если узел уже несёт `branchId`
  (новый/пересохранённый документ), досев его **не трогает** (fallback только
  для отсутствующего поля). Это и есть «читать по ссылке, если она есть».
- **Запись.** Новые документы из pipeline-рендера и (в фазе 2) операций несут
  `branchId` с рождения. При пересохранении старого документа он обогащается
  досеянным `branchId`.
- **Идемпотентность (I4).** `normalize(normalize(d)) ≡ normalize(d)`: первый
  проход досеивает `branchId`, второй видит его заданным и сохраняет. Досеянное
  значение равно тому, что даёт дерево, поэтому фикспойнт устойчив.

`branchId` — **производное** поле (дублирует связь, уже закодированную
`parentX`+топологией). Поэтому в семантическом сравнении `canonical`
([graphGen.ts](../../src/pages/timeline/utils/__tests__/graphGen.ts)) оно
исключается наравне с координатами `x`/`parentX`: досев производного указателя
— не изменение пользовательских данных.

## 4. Что упрощается после полной миграции (фазы 2–3)

- `buildTimelineTree` вырождается в **group-by `branchId`**: события ветки — это
  `nodes.filter(n => n.branchId === edge.id)`, без `nodesByParentX`,
  `claimedNodeIds` и арбитража коллизий.
- Исчезает весь класс **shared-x багов**: два `edge` могут иметь одинаковый `x`
  (например, визуально наложенные ветки) — принадлежность однозначна по id.
- Исчезают **`claimFreeX`-walk'и**: `applyBranchDeletionToFlat`
  ([timelineTree.ts](../../src/pages/timeline/utils/timelineTree.ts)) и B12-walk в
  `extendBranch` подбирали свободный `x`, только чтобы не сломать координатную
  идентичность. С `branchId` `x` — чистая презентация, коллизия безвредна.
- `pickBranchX` ([server/api/timelineBiographyHeuristics.ts](../../server/api/timelineBiographyHeuristics.ts))
  больше **не обязан гарантировать уникальность `x`** (комментарий Д-B7); может
  переиспользовать слоты — принадлежность несёт `branchId`.
- Спур-логика в biography-рендере
  ([server/api/timelineBiographyQuality.ts](../../server/api/timelineBiographyQuality.ts))
  теряет `while (takenXs.has(subX)) subX += 40` — коллизия `x` спура перестаёт
  «переезжать» события.

## 5. Риски: все места, где принадлежность сейчас берётся по `x`

Это **общий продакшн-код** (не только biography). Полная миграция (фаза 2/3)
затрагивает каждое из этих мест. Фаза 1 их **не меняет** — только добавляет поле
и досев.

**Читатели членства (источник истины — `x`):**

1. `buildTimelineTree` (timelineTree.ts) — `nodesByParentX` по `parentX`,
   сопоставление с `edge.x`, арбитраж `claimedNodeIds`. Ядро всей топологии;
   от него зависят drag/delete/age-edit. Фаза 2: group-by `branchId`.
2. `findParentBranch` / `findEventInTree` / `collectDescendantIds`
   (timelineTree.ts) — производны от дерева (то есть от `x`). Станут производны
   от `branchId` автоматически после (1).
3. `normalizeImportedTimelineData` (persistence.ts) — B5-healing по
   `validEdgeXs` (множество `x` живых веток, ~стр. 106) + оконное лечение через
   дерево. Фаза 2: healing по `branchId`.

**Писатели, обязанные держать `parentX` (в фазе 2 — и `branchId`) в синхроне:**

4. `useTimelineCRUD` ([hooks/useTimelineCRUD.ts](../../src/pages/timeline/hooks/useTimelineCRUD.ts))
   — `addEvent`/`updateNode` пишут `parentX = branchEdge.x` (валидатор B11 уже
   берёт ветку из дерева через `findParentBranch`). Фаза 2: писать и `branchId`.
5. `useTimelineBranch` ([hooks/useTimelineBranch.ts](../../src/pages/timeline/hooks/useTimelineBranch.ts))
   — `extendBranch` проверяет коллизию `edges.some(e => e.x === proposedBranchX)`
   и B12-walk; B14-валидатор берёт ветку из дерева. Фаза 3: коллизия `x`
   перестаёт быть проблемой.
6. `useTimelineDragDrop` ([hooks/useTimelineDragDrop.ts](../../src/pages/timeline/hooks/useTimelineDragDrop.ts))
   → `applyDragToTree` — переписывает `x`/`parentX` перемещаемого поддерева.
   Фаза 2: `branchId` не меняется при drag (drag — чистая презентация), что
   само по себе устраняет «тихую перепривязку» Д5.
7. `applyBranchDeletionToFlat` (timelineTree.ts) — миграция событий на
   родительскую линию, `claimFreeX` подбирает свободный `x`. Фаза 3: `claimFreeX`
   удаляется, событиям проставляется `branchId` новой ветки/undefined.
8. **Biography-рендер** `buildTimelineDataFromBiographyPlan`
   (timelineBiographyQuality.ts) — создаёт main-события (главная линия),
   anchor-события веток (`parentX = branch.x`), спур-события (`parentX = subX`);
   `pickBranchX` + спур-`takenXs` держат уникальность `x`. **Фаза 1 уже
   проставляет `branchId` здесь** (см. ниже).

**Прочие потребители `x` — только презентация, миграция их не трогает:**
SVG-рендер веток/событий, экспортеры (`utils/exporters/*`), poster —
работают с `x` как с координатой и остаются как есть.

## 6. Фазовый план

- **Фаза 1 (этот PR, аддитивно, без слома wire):**
  1. `branchId?: string` в `NodeT` (types.ts) и в wire-типе pipeline
     (`BiographyTimelineData.nodes`, timelineBiographyTypes.ts).
  2. `normalizeImportedTimelineData` досеивает `branchId` из дерева, если его
     нет; существующий — сохраняет. Отрисовка (`x`/`parentX`) не меняется.
  3. `buildTimelineDataFromBiographyPlan` проставляет `branchId` параллельно с
     `parentX` при создании anchor- и спур-узлов веток.
  4. `canonical` исключает `branchId` как производное поле.
  5. **Операции на `branchId` НЕ переводятся** — членство по-прежнему из дерева
     (по `x`). Никакого изменения поведения, только новое поле + досев.
- **Фаза 2:** перевести читателей членства на `branchId` (`buildTimelineTree` →
  group-by; normalize-healing по `branchId`), писателей — проставлять `branchId`
  (CRUD/branch/drag/deleteBranch). Drag перестаёт менять `branchId` → Д5 закрыт.
  **Обязательно** добавить в normalize лечение висячего/чужого `branchId`
  (указывает на несуществующую ветку или на ветку, чей `x ≠ parentX`): в фазе 1
  такой `branchId` инертен (никто не разыменовывает), но как только членство
  поедет на ссылку — рассинхрон станет источником багов. Лечить детерминированно
  из дерева, как сейчас лечится координата.
- **Фаза 3:** убрать координатный матчинг и его костыли (`claimFreeX`-walk'и,
  уникальность `x` в `pickBranchX` и спурах, `validEdgeXs`-healing). `x` — чистая
  презентация; ветки могут делить `x` без последствий.

## 7. Критерии приёмки фазы 1

- Контракт зелёный: `npx vitest run src/pages/timeline` (178 тестов),
  `tests/api/`, `tests/benchmark/`.
- Новые тесты (test-first): досев членства из дерева; уважение заданного
  `branchId`; идемпотентность досева; проставление `branchId` в pipeline-рендере
  (anchor + спур), консистентное с `parentX`.
- Бенчмарк-реплей (0 токенов): структурные метрики
  (`refViolations`/`normalizeEdits`/`sharedX`/`eventsOutsideWindow`) остаются 0,
  coverage не меняется — `branchId` не читается ни одной метрикой, поэтому
  аддитивен по построению.
- `npm run typecheck:api`, `npm run typecheck:functions` зелёные.
