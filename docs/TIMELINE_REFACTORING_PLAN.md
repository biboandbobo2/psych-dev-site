# План рефакторинга системы таймлайна

**Дата создания:** 2025-11-07
**Текущее состояние:** ~4589 строк кода
**Целевое состояние:** ~3000-3500 строк (сокращение на 25-35%)

## 🔗 Связанные документы

- 📋 **[Главная документация](./README.md)** - навигация по всем документам проекта
- 📅 **[Гайд по системе таймлайна](./TimelineGuide.md)** - полное описание текущей архитектуры
- 📐 **[Архитектурные рекомендации](./ARCHITECTURE_GUIDELINES.md)** - правила и best practices
- 🔧 **[План рефакторинга тестов](./TESTS_REFACTORING_PLAN.md)** - параллельный план рефакторинга
- 🛠️ **[План рефакторинга основной части](./CORE_REFACTORING_PLAN.md)** - рефакторинг админки, заметок, профиля
- 📚 **[Система тестов](./TESTS_SYSTEM_GUIDE.md)** - связанная система (интеграция через заметки)

---

## Содержание

1. [Текущее состояние и проблемы](#текущее-состояние-и-проблемы)
2. [Стратегия рефакторинга](#стратегия-рефакторинга)
3. [Подготовка](#подготовка)
4. [Phase 1: Быстрые победы](#phase-1-быстрые-победы-1-2-дня)
5. [Phase 2: Средний рефакторинг](#phase-2-средний-рефакторинг-3-5-дней)
6. [Phase 3: Глубокий рефакторинг](#phase-3-глубокий-рефакторинг-1-2-недели)
7. [Чеклисты тестирования](#чеклисты-тестирования)
8. [Процедуры отката](#процедуры-отката)
9. [Метрики успеха](#метрики-успеха)

---

## Текущее состояние и проблемы

### Статистика кода

```
ОСНОВНОЙ КОМПОНЕНТ:
    2109 строк - Timeline.tsx                    ❗️ КРИТИЧЕСКАЯ ПРОБЛЕМА

ХУКИ:
      88 строк - useTimeline.ts                  ✅ Хорошо
      93 строк - useTimelineHistory.ts           ✅ Хорошо

МОДУЛИ (src/pages/timeline/):
     115 строк - types.ts                        ✅ Хорошо
      62 строк - constants.ts                    ✅ Хорошо
      61 строк - utils.ts                        ✅ Хорошо

КОМПОНЕНТЫ (src/pages/timeline/components/):
     263 строк - BulkEventCreator.tsx            ⚠️  На грани
     243 строк - SaveEventAsNoteButton.tsx       ⚠️  На грани
     150 строк - PeriodBoundaryModal.tsx         ✅ Приемлемо
     118 строк - PeriodizationSelector.tsx       ✅ Хорошо
     112 строк - IconPickerButton.tsx            ✅ Хорошо
      92 строк - PeriodizationLayer.tsx          ✅ Хорошо

УТИЛИТЫ (src/pages/timeline/utils/):
     632 строк - exporters.ts                    ⚠️  Можно разбить
      74 строк - ageToRange.ts                   ✅ Хорошо

ДАННЫЕ (src/pages/timeline/data/):
     465 строк - periodizations.ts               ✅ Данные, приемлемо

ИТОГО: ~4589 строк
```

### Основные проблемы

1. **Timeline.tsx (2109 строк)** - монолитный компонент
   - Смешивает UI-рендеринг, бизнес-логику, обработку событий
   - Сложно тестировать
   - Высокая когнитивная нагрузка
   - Множественные состояния (34+ useState)

2. **exporters.ts (632 строки)** - три экспортера в одном файле
   - JSON, PNG, PDF экспорт смешаны
   - Сложно поддерживать

3. **Крупные компоненты на грани:**
   - BulkEventCreator.tsx (263 строки)
   - SaveEventAsNoteButton.tsx (243 строки)

### Положительные стороны

✅ Отличная модульная структура (types, constants, utils)
✅ Хуки небольшие и сфокусированные
✅ TypeScript используется последовательно
✅ Компоненты хорошо разделены по папкам
✅ Нет дублирования кода
✅ Есть документация (TimelineGuide.md)

---

## Стратегия рефакторинга

### Принципы

1. **Инкрементальность**: изменения малыми шагами с коммитами после каждой задачи
2. **Обратная совместимость**: функциональность не меняется
3. **Безопасность**: каждый этап тестируется перед следующим
4. **Измеримость**: отслеживаем метрики (строки кода, количество компонентов)

### Приоритеты

**Высокий:**
- Разбить Timeline.tsx (2109→300-400 строк)
- Извлечь Canvas в отдельный компонент
- Разделить панели на компоненты

**Средний:**
- Разделить exporters.ts
- Оптимизировать BulkEventCreator и SaveEventAsNoteButton

**Низкий:**
- Добавить unit-тесты
- Оптимизация производительности

---

## Подготовка

### Шаг 1: Создание резервной копии

```bash
# Создаём тег для текущего состояния
git tag -a timeline-refactor-start -m "Timeline before refactoring"
git push origin timeline-refactor-start

# Создаём ветку для рефакторинга
git checkout -b refactor/timeline
```

### Шаг 2: Анализ зависимостей

```bash
# Проверяем, где используется Timeline.tsx
grep -r "Timeline" src/ --include="*.tsx" --include="*.ts"

# Проверяем импорты
grep -r "from.*timeline" src/ --include="*.tsx" --include="*.ts"
```

### Шаг 3: Базовые тесты

Создать простой тест для проверки, что таймлайн рендерится:

```typescript
// src/pages/__tests__/Timeline.test.tsx
import { render } from '@testing-library/react';
import Timeline from '../Timeline';

describe('Timeline', () => {
  it('should render without crashing', () => {
    const { container } = render(<Timeline />);
    expect(container).toBeInTheDocument();
  });
});
```

**Коммит:** `test: add basic Timeline rendering test`

---

## Phase 1: Быстрые победы (1-2 дня)

### Задача 1.1: Разделить exporters.ts

**Проблема:** 632 строки в одном файле, три разных экспортера

**Решение:** Создать отдельные файлы для каждого экспортера

#### Шаги:

1. Создать `src/pages/timeline/utils/exporters/exportJSON.ts`:

```typescript
import type { TimelineData } from '../../types';

export function exportTimelineJSON(data: TimelineData, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

2. Создать `src/pages/timeline/utils/exporters/exportPNG.ts`:

```typescript
export async function exportTimelinePNG(svg: SVGSVGElement, filename: string) {
  // Переместить логику экспорта PNG сюда
  // ... (код из exporters.ts)
}
```

3. Создать `src/pages/timeline/utils/exporters/exportPDF.ts`:

```typescript
import type { TimelineData, Periodization } from '../../types';

export async function exportTimelinePDF(
  svg: SVGSVGElement,
  data: TimelineData,
  periodization: Periodization | null,
  filename: string
) {
  // Переместить логику экспорта PDF сюда
  // ... (код из exporters.ts)
}
```

4. Создать `src/pages/timeline/utils/exporters/index.ts`:

```typescript
export { exportTimelineJSON } from './exportJSON';
export { exportTimelinePNG } from './exportPNG';
export { exportTimelinePDF } from './exportPDF';
```

5. Обновить импорты в Timeline.tsx:

```typescript
// Было:
import { exportTimelineJSON, exportTimelinePNG, exportTimelinePDF } from './timeline/utils/exporters';

// Стало:
import { exportTimelineJSON, exportTimelinePNG, exportTimelinePDF } from './timeline/utils/exporters';
```

6. Удалить старый файл `exporters.ts`

**Результат:** 632 строки → 3 файла по ~200 строк
**Коммит:** `refactor(timeline): split exporters into separate files`

**Тестирование:**
- ✅ JSON экспорт работает
- ✅ PNG экспорт работает
- ✅ PDF экспорт работает
- ✅ Нет регрессии функциональности

---

### Задача 1.2: Извлечь константы событий

**Проблема:** В Timeline.tsx есть магические числа для размеров и отступов

**Решение:** Добавить константы в `constants.ts`

```typescript
// src/pages/timeline/constants.ts

// Существующие константы...

/**
 * Базовый радиус кружка события (адаптивный)
 */
export const BASE_NODE_RADIUS = 15;

/**
 * Минимальный радиус кружка события при зуме
 */
export const MIN_NODE_RADIUS = 9;

/**
 * Максимальный радиус кружка события при зуме
 */
export const MAX_NODE_RADIUS = 38;

/**
 * Ширина толстой линии для клика по ветке
 */
export const BRANCH_CLICK_WIDTH = 24;

/**
 * Ширина обычной линии для клика по ветке (не выбрана)
 */
export const BRANCH_CLICK_WIDTH_UNSELECTED = 12;
```

**Коммит:** `refactor(timeline): extract event size constants`

---

## Phase 2: Средний рефакторинг (3-5 дней)

### Задача 2.1: Извлечь панели из Timeline.tsx

**Проблема:** Timeline.tsx содержит код для левой и правой панелей

**Решение:** Создать отдельные компоненты для панелей

#### Шаг 1: Создать TimelineLeftPanel

Создать `src/pages/timeline/components/TimelineLeftPanel.tsx`:

```typescript
import { Link } from 'react-router-dom';
import { SPHERE_META, MIN_SCALE, MAX_SCALE, LINE_X_POSITION } from '../constants';
import type { NodeT, Transform } from '../types';

interface TimelineLeftPanelProps {
  currentAge: number;
  ageMax: number;
  onCurrentAgeChange: (age: number) => void;
  viewportAge: number;
  onViewportAgeChange: (age: number) => void;
  transform: Transform;
  onTransformChange: (transform: Transform) => void;
  nodes: NodeT[];
  onClearAll: () => void;
  downloadMenuOpen: boolean;
  onDownloadMenuToggle: () => void;
  onDownloadSelect: (type: 'json' | 'png' | 'pdf') => void;
  downloadButtonRef: React.RefObject<HTMLButtonElement>;
  downloadMenuRef: React.RefObject<HTMLDivElement>;
  worldHeight: number;
  birthBaseYear: number | null;
  formattedCurrentAge: string;
  currentYearLabel: number | null;
}

export function TimelineLeftPanel({
  currentAge,
  ageMax,
  onCurrentAgeChange,
  viewportAge,
  onViewportAgeChange,
  transform,
  onTransformChange,
  nodes,
  onClearAll,
  downloadMenuOpen,
  onDownloadMenuToggle,
  onDownloadSelect,
  downloadButtonRef,
  downloadMenuRef,
  worldHeight,
}: TimelineLeftPanelProps) {
  return (
    <div className="fixed top-4 left-4 z-40">
      <aside
        className="w-36 space-y-3 rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-xl backdrop-blur-md sm:w-40"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {/* ... код левой панели из Timeline.tsx ... */}
      </aside>
    </div>
  );
}
```

**Размер:** ~200 строк
**Коммит:** `refactor(timeline): extract TimelineLeftPanel component`

#### Шаг 2: Создать TimelineRightPanel

Создать `src/pages/timeline/components/TimelineRightPanel.tsx`:

```typescript
import type { SaveStatus } from '../types';
import { PeriodizationSelector } from './PeriodizationSelector';
import { TimelineEventForm } from './TimelineEventForm';
import { TimelineBirthForm } from './TimelineBirthForm';
import { TimelineBranchEditor } from './TimelineBranchEditor';

interface TimelineRightPanelProps {
  saveStatus: SaveStatus;
  selectedPeriodization: string | null;
  onPeriodizationChange: (id: string | null) => void;
  birthSelected: boolean;
  // ... остальные пропсы
}

export function TimelineRightPanel(props: TimelineRightPanelProps) {
  return (
    <aside className="fixed right-0 top-0 bottom-0 w-80 border-l border-purple-200 bg-gradient-to-b from-purple-50 to-blue-50 overflow-y-auto z-30">
      {/* ... код правой панели ... */}
    </aside>
  );
}
```

**Размер:** ~150 строк
**Коммит:** `refactor(timeline): extract TimelineRightPanel component`

#### Шаг 3: Обновить Timeline.tsx

```typescript
// Timeline.tsx
import { TimelineLeftPanel } from './timeline/components/TimelineLeftPanel';
import { TimelineRightPanel } from './timeline/components/TimelineRightPanel';

export default function Timeline() {
  // ... state ...

  return (
    <div className="...">
      <TimelineLeftPanel
        currentAge={currentAge}
        ageMax={ageMax}
        // ... props
      />

      {/* Canvas остаётся здесь пока */}

      <TimelineRightPanel
        saveStatus={saveStatus}
        selectedPeriodization={selectedPeriodization}
        // ... props
      />
    </div>
  );
}
```

**Результат:** Timeline.tsx 2109 → ~1700 строк
**Коммит:** `refactor(timeline): use extracted panel components`

---

### Задача 2.2: Извлечь формы в отдельные компоненты

#### Создать TimelineEventForm

`src/pages/timeline/components/TimelineEventForm.tsx`:

```typescript
import type { Sphere, EventIconId } from '../types';
import { SPHERE_META } from '../constants';
import { IconPickerButton } from './IconPickerButton';
import { SaveEventAsNoteButton } from './SaveEventAsNoteButton';

interface TimelineEventFormProps {
  formEventId: string | null;
  formEventAge: string;
  formEventLabel: string;
  formEventNotes: string;
  formEventSphere: Sphere | undefined;
  formEventIsDecision: boolean;
  formEventIcon: EventIconId | null;
  onAgeChange: (age: string) => void;
  onLabelChange: (label: string) => void;
  onNotesChange: (notes: string) => void;
  onSphereChange: (sphere: Sphere | undefined) => void;
  onIsDecisionChange: (isDecision: boolean) => void;
  onIconChange: (icon: EventIconId | null) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onDelete: () => void;
  hasFormChanges: boolean;
  createNote: (note: any) => Promise<void>;
}

export function TimelineEventForm(props: TimelineEventFormProps) {
  // ... код формы события ...
}
```

**Размер:** ~150 строк
**Коммит:** `refactor(timeline): extract TimelineEventForm component`

#### Создать TimelineBirthForm

`src/pages/timeline/components/TimelineBirthForm.tsx`:

```typescript
interface TimelineBirthFormProps {
  birthFormDate: string;
  birthFormPlace: string;
  birthFormNotes: string;
  onDateChange: (date: string) => void;
  onPlaceChange: (place: string) => void;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onClear: () => void;
  hasChanges: boolean;
}

export function TimelineBirthForm(props: TimelineBirthFormProps) {
  // ... код формы рождения ...
}
```

**Размер:** ~80 строк
**Коммит:** `refactor(timeline): extract TimelineBirthForm component`

#### Создать TimelineBranchEditor

`src/pages/timeline/components/TimelineBranchEditor.tsx`:

```typescript
interface TimelineBranchEditorProps {
  selectedEdge: EdgeT | null;
  branchYears: string;
  ageMax: number;
  onBranchYearsChange: (years: string) => void;
  onUpdateBranchLength: () => void;
  onDeleteBranch: () => void;
  onClose: () => void;
}

export function TimelineBranchEditor(props: TimelineBranchEditorProps) {
  // ... код редактора веток ...
}
```

**Размер:** ~70 строк
**Коммит:** `refactor(timeline): extract TimelineBranchEditor component`

**Результат после всех форм:** Timeline.tsx ~1700 → ~1400 строк

---

### Задача 2.3: Извлечь Canvas в отдельный компонент

**Проблема:** SVG-холст занимает ~600 строк в Timeline.tsx

**Решение:** Создать TimelineCanvas

`src/pages/timeline/components/TimelineCanvas.tsx`:

```typescript
import type { NodeT, EdgeT, BirthDetails, Transform } from '../types';
import { PeriodizationLayer } from './PeriodizationLayer';
import { getPeriodizationById } from '../data/periodizations';
import {
  YEAR_PX,
  LINE_X_POSITION,
  SPHERE_META,
  BASE_NODE_RADIUS,
  MIN_NODE_RADIUS,
  MAX_NODE_RADIUS,
} from '../constants';
import { clamp } from '../utils';

interface TimelineCanvasProps {
  svgRef: React.RefObject<SVGSVGElement>;
  transform: Transform;
  onWheel: (e: React.WheelEvent<SVGSVGElement>) => void;
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: () => void;
  worldWidth: number;
  worldHeight: number;
  ageMax: number;
  currentAge: number;
  nodes: NodeT[];
  edges: EdgeT[];
  birthDetails: BirthDetails;
  selectedPeriodization: string | null;
  selectedId: string | null;
  selectedBranchX: number | null;
  draggingNodeId: string | null;
  birthSelected: boolean;
  birthBaseYear: number | null;
  formattedCurrentAge: string;
  currentYearLabel: number | null;
  onNodeClick: (nodeId: string) => void;
  onNodeDragStart: (e: React.PointerEvent, nodeId: string) => void;
  onSelectBirth: () => void;
  onSelectBranchX: (x: number | null) => void;
  onPeriodBoundaryClick: (periodIndex: number) => void;
  cursorClass: string;
}

export function TimelineCanvas(props: TimelineCanvasProps) {
  const {
    svgRef,
    transform,
    worldWidth,
    worldHeight,
    ageMax,
    currentAge,
    nodes,
    edges,
    selectedPeriodization,
    birthBaseYear,
    formattedCurrentAge,
    currentYearLabel,
    // ...
  } = props;

  const adaptiveRadius = clamp(
    BASE_NODE_RADIUS / transform.k,
    MIN_NODE_RADIUS,
    MAX_NODE_RADIUS
  );

  return (
    <div className="absolute inset-0">
      <svg
        ref={svgRef}
        className={`w-full h-full ${props.cursorClass}`}
        onWheel={props.onWheel}
        onPointerDown={props.onPointerDown}
        onPointerMove={props.onPointerMove}
        onPointerUp={props.onPointerUp}
        data-world-width={worldWidth}
        data-world-height={worldHeight}
      >
        <g data-export-root="true" transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* Background */}
          <rect x={0} y={-100} width={worldWidth} height={worldHeight + 200} fill="#ffffff" />

          {/* Periodization layer */}
          <PeriodizationLayer
            periodization={selectedPeriodization ? getPeriodizationById(selectedPeriodization) ?? null : null}
            ageMax={ageMax}
            worldHeight={worldHeight}
            canvasWidth={worldWidth}
            onBoundaryClick={props.onPeriodBoundaryClick}
          />

          {/* Time scale */}
          {/* ... шкала возраста ... */}

          {/* Life line */}
          {/* ... линия жизни ... */}

          {/* Birth marker */}
          {/* ... маркер рождения ... */}

          {/* Current age marker */}
          {/* ... маркер текущего возраста ... */}

          {/* Vertical branches (edges) */}
          {/* ... ветки ... */}

          {/* Events */}
          {/* ... события ... */}
        </g>
      </svg>
    </div>
  );
}
```

**Размер:** ~400 строк
**Коммит:** `refactor(timeline): extract TimelineCanvas component`

**Результат:** Timeline.tsx ~1400 → ~800 строк

---

### Задача 2.4: Извлечь бизнес-логику в хуки

#### Создать useTimelineEvents хук

`src/pages/timeline/hooks/useTimelineEvents.ts`:

```typescript
import { useState, useCallback } from 'react';
import type { NodeT, EdgeT } from '../types';
import { LINE_X_POSITION } from '../constants';

export function useTimelineEvents() {
  const [nodes, setNodes] = useState<NodeT[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const addNode = useCallback((node: Omit<NodeT, 'id'>) => {
    const newNode: NodeT = {
      ...node,
      id: crypto.randomUUID(),
    };
    setNodes((prev) => [...prev, newNode]);
    return newNode.id;
  }, []);

  const updateNode = useCallback((id: string, updates: Partial<NodeT>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setSelectedId(null);
  }, []);

  return {
    nodes,
    setNodes,
    selectedId,
    setSelectedId,
    draggingNodeId,
    setDraggingNodeId,
    addNode,
    updateNode,
    deleteNode,
  };
}
```

**Коммит:** `refactor(timeline): extract useTimelineEvents hook`

#### Создать useTimelineBranches хук

`src/pages/timeline/hooks/useTimelineBranches.ts`:

```typescript
import { useState, useCallback } from 'react';
import type { EdgeT } from '../types';

export function useTimelineBranches() {
  const [edges, setEdges] = useState<EdgeT[]>([]);
  const [selectedBranchX, setSelectedBranchX] = useState<number | null>(null);

  const addEdge = useCallback((edge: Omit<EdgeT, 'id'>) => {
    const newEdge: EdgeT = {
      ...edge,
      id: crypto.randomUUID(),
    };
    setEdges((prev) => [...prev, newEdge]);
    return newEdge.id;
  }, []);

  const updateEdge = useCallback((id: string, updates: Partial<EdgeT>) => {
    setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, []);

  const deleteEdge = useCallback((id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return {
    edges,
    setEdges,
    selectedBranchX,
    setSelectedBranchX,
    addEdge,
    updateEdge,
    deleteEdge,
  };
}
```

**Коммит:** `refactor(timeline): extract useTimelineBranches hook`

#### Создать useTimelineTransform хук

`src/pages/timeline/hooks/useTimelineTransform.ts`:

```typescript
import { useState, useCallback } from 'react';
import type { Transform } from '../types';
import { MIN_SCALE, MAX_SCALE, LINE_X_POSITION } from '../constants';
import { clamp } from '../utils';

export function useTimelineTransform(initialTransform: Transform = { x: 50, y: 100, k: 1 }) {
  const [transform, setTransform] = useState<Transform>(initialTransform);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scaleBy = 1 + -e.deltaY * 0.001;
    const newK = clamp(transform.k * scaleBy, MIN_SCALE, MAX_SCALE);

    const centerY = window.innerHeight / 2;
    const lineScreenX = transform.x + LINE_X_POSITION * transform.k;

    setTransform({
      k: newK,
      x: lineScreenX - LINE_X_POSITION * newK,
      y: transform.y + (centerY - transform.y) * (1 - newK / transform.k),
    });
  }, [transform]);

  const startPanning = useCallback((x: number, y: number) => {
    setIsPanning(true);
    setLastPointer({ x, y });
  }, []);

  const updatePanning = useCallback((x: number, y: number) => {
    if (isPanning && lastPointer) {
      const dx = x - lastPointer.x;
      const dy = y - lastPointer.y;
      setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
      setLastPointer({ x, y });
    }
  }, [isPanning, lastPointer]);

  const stopPanning = useCallback(() => {
    setIsPanning(false);
    setLastPointer(null);
  }, []);

  return {
    transform,
    setTransform,
    isPanning,
    handleWheel,
    startPanning,
    updatePanning,
    stopPanning,
  };
}
```

**Коммит:** `refactor(timeline): extract useTimelineTransform hook`

**Результат:** Timeline.tsx ~800 → ~400 строк

---

## Phase 3: Глубокий рефакторинг (1-2 недели)

### Задача 3.1: Оптимизировать BulkEventCreator (263→180 строк)

**Проблема:** Компонент смешивает UI и логику парсинга

**Решение:** Извлечь логику парсинга в утилиту

`src/pages/timeline/utils/parseBulkEvents.ts`:

```typescript
import type { NodeT, EdgeT } from '../types';
import { parseAge } from './index';

export interface BulkEventInput {
  age: number;
  label: string;
}

export function parseBulkEventsText(text: string): BulkEventInput[] {
  const lines = text.trim().split('\n').filter(line => line.trim());
  const events: BulkEventInput[] = [];

  for (const line of lines) {
    const match = line.match(/^(\d+(?:[.,]\d+)?)\s*[,;:]\s*(.+)$/);
    if (match) {
      const age = parseAge(match[1]);
      const label = match[2].trim();
      if (label) {
        events.push({ age, label });
      }
    }
  }

  return events;
}

export function validateBulkEvents(
  events: BulkEventInput[],
  ageMax: number,
  selectedEdge?: EdgeT | null
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const event of events) {
    if (event.age < 0 || event.age > ageMax) {
      errors.push(`Возраст ${event.age} выходит за пределы 0-${ageMax}`);
    }

    if (selectedEdge) {
      if (event.age < selectedEdge.startAge || event.age > selectedEdge.endAge) {
        errors.push(
          `Возраст ${event.age} не попадает в диапазон ветки (${selectedEdge.startAge}-${selectedEdge.endAge})`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

Обновить BulkEventCreator для использования утилит.

**Результат:** BulkEventCreator 263 → ~180 строк
**Коммит:** `refactor(timeline): extract bulk events parsing logic`

---

### Задача 3.2: Оптимизировать SaveEventAsNoteButton (243→150 строк)

**Проблема:** Компонент содержит много вычислений и форматирования

**Решение:** Извлечь форматирование в утилиту

`src/pages/timeline/utils/formatEventAsNote.ts`:

```typescript
import type { Sphere } from '../types';
import { ageToRange } from './ageToRange';
import { AGE_RANGE_LABELS } from '../../../types/notes';
import { SPHERE_META } from '../constants';

export interface EventData {
  age: number;
  title: string;
  notes: string;
  sphere?: Sphere;
}

export function formatEventAsNote(event: EventData): {
  title: string;
  content: string;
  ageRange: string;
} {
  const ageRange = ageToRange(event.age);
  const ageRangeLabel = AGE_RANGE_LABELS[ageRange];
  const sphereLabel = event.sphere ? SPHERE_META[event.sphere].label : 'Не указано';

  const content = `**Возраст:** ${event.age} лет
**Период:** ${ageRangeLabel}
**Сфера жизни:** ${sphereLabel}

${event.notes ? `**Подробности:**\n${event.notes}` : ''}`.trim();

  return {
    title: event.title,
    content,
    ageRange,
  };
}
```

**Результат:** SaveEventAsNoteButton 243 → ~150 строк
**Коммит:** `refactor(timeline): extract event formatting logic`

---

### Задача 3.3: Добавить unit-тесты для утилит

#### Тесты для parseBulkEvents

`src/pages/timeline/utils/__tests__/parseBulkEvents.test.ts`:

```typescript
import { parseBulkEventsText, validateBulkEvents } from '../parseBulkEvents';

describe('parseBulkEventsText', () => {
  it('should parse valid events', () => {
    const text = `
      18, Поступил в университет
      22, Первая работа
      25,5, Повышение
    `;
    const events = parseBulkEventsText(text);

    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({ age: 18, label: 'Поступил в университет' });
    expect(events[1]).toEqual({ age: 22, label: 'Первая работа' });
    expect(events[2]).toEqual({ age: 25.5, label: 'Повышение' });
  });

  it('should handle different separators', () => {
    const text = '18: Event 1\n22; Event 2\n25, Event 3';
    const events = parseBulkEventsText(text);
    expect(events).toHaveLength(3);
  });

  it('should ignore invalid lines', () => {
    const text = `
      18, Valid event
      Invalid line without comma
      Not a number, Event
    `;
    const events = parseBulkEventsText(text);
    expect(events).toHaveLength(1);
  });
});

describe('validateBulkEvents', () => {
  it('should validate age range', () => {
    const events = [
      { age: 18, label: 'Event 1' },
      { age: 150, label: 'Event 2' }, // Invalid
    ];

    const result = validateBulkEvents(events, 100);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it('should validate branch age range', () => {
    const events = [{ age: 25, label: 'Event' }];
    const selectedEdge = {
      id: '1',
      x: 2100,
      startAge: 18,
      endAge: 22,
      color: '#000',
      nodeId: 'node1',
    };

    const result = validateBulkEvents(events, 100, selectedEdge);
    expect(result.valid).toBe(false);
  });
});
```

**Коммит:** `test(timeline): add tests for parseBulkEvents`

#### Тесты для formatEventAsNote

`src/pages/timeline/utils/__tests__/formatEventAsNote.test.ts`:

```typescript
import { formatEventAsNote } from '../formatEventAsNote';

describe('formatEventAsNote', () => {
  it('should format event with all fields', () => {
    const event = {
      age: 18,
      title: 'Поступил в университет',
      notes: 'МГУ, факультет психологии',
      sphere: 'education' as const,
    };

    const result = formatEventAsNote(event);

    expect(result.title).toBe('Поступил в университет');
    expect(result.content).toContain('18 лет');
    expect(result.content).toContain('Образование');
    expect(result.content).toContain('МГУ, факультет психологии');
    expect(result.ageRange).toBe('adolescence');
  });

  it('should handle event without notes', () => {
    const event = {
      age: 25,
      title: 'Событие',
      notes: '',
    };

    const result = formatEventAsNote(event);
    expect(result.content).not.toContain('Подробности:');
  });
});
```

**Коммит:** `test(timeline): add tests for formatEventAsNote`

#### Тесты для ageToRange

`src/pages/timeline/utils/__tests__/ageToRange.test.ts`:

```typescript
import { ageToRange } from '../ageToRange';

describe('ageToRange', () => {
  it('should return correct range for infancy', () => {
    expect(ageToRange(0)).toBe('infancy');
    expect(ageToRange(1)).toBe('infancy');
    expect(ageToRange(2)).toBe('infancy');
  });

  it('should return correct range for preschool', () => {
    expect(ageToRange(3)).toBe('preschool');
    expect(ageToRange(6)).toBe('preschool');
  });

  it('should handle boundary cases (prefer older period)', () => {
    expect(ageToRange(7)).toBe('primary-school'); // Граница 7 лет
    expect(ageToRange(10)).toBe('middle-school'); // Граница 10 лет
  });

  it('should handle very old ages', () => {
    expect(ageToRange(80)).toBe('late-adulthood');
    expect(ageToRange(100)).toBe('late-adulthood');
  });
});
```

**Коммит:** `test(timeline): add tests for ageToRange`

---

### Задача 3.4: Оптимизация производительности

#### Мемоизация дорогих вычислений

В TimelineCanvas добавить мемоизацию:

```typescript
import { useMemo } from 'react';

export function TimelineCanvas(props: TimelineCanvasProps) {
  // Мемоизация адаптивного радиуса
  const adaptiveRadius = useMemo(
    () => clamp(BASE_NODE_RADIUS / props.transform.k, MIN_NODE_RADIUS, MAX_NODE_RADIUS),
    [props.transform.k]
  );

  // Мемоизация отфильтрованных событий
  const visibleNodes = useMemo(
    () => props.nodes.filter(node =>
      typeof node.age === 'number' && !isNaN(node.age)
    ),
    [props.nodes]
  );

  // Мемоизация отфильтрованных веток
  const visibleEdges = useMemo(
    () => props.edges.filter(edge =>
      typeof edge.x === 'number' &&
      typeof edge.startAge === 'number' &&
      typeof edge.endAge === 'number' &&
      !isNaN(edge.x) &&
      !isNaN(edge.startAge) &&
      !isNaN(edge.endAge)
    ),
    [props.edges]
  );

  // ...
}
```

**Коммит:** `perf(timeline): add memoization for expensive calculations`

---

### Задача 3.5: Документация обновлений

Обновить TimelineGuide.md с информацией о новой структуре:

```markdown
## Новая структура компонентов (после рефакторинга)

### Основной компонент
- **Timeline.tsx** (~400 строк) - координирует работу дочерних компонентов

### Панели
- **TimelineLeftPanel.tsx** (~200 строк) - левая панель управления
- **TimelineRightPanel.tsx** (~150 строк) - правая панель с формами

### Canvas
- **TimelineCanvas.tsx** (~400 строк) - SVG-холст с визуализацией

### Формы
- **TimelineEventForm.tsx** (~150 строк) - форма события
- **TimelineBirthForm.tsx** (~80 строк) - форма профиля рождения
- **TimelineBranchEditor.tsx** (~70 строк) - редактор веток

### Хуки
- **useTimelineEvents.ts** (~80 строк) - управление событиями
- **useTimelineBranches.ts** (~60 строк) - управление ветками
- **useTimelineTransform.ts** (~100 строк) - управление трансформацией холста
- **useTimelineHistory.ts** (~93 строки) - undo/redo

### Утилиты
- **parseBulkEvents.ts** (~80 строк) - парсинг массового создания событий
- **formatEventAsNote.ts** (~50 строк) - форматирование события как заметки
- **exportJSON.ts** (~30 строк) - экспорт в JSON
- **exportPNG.ts** (~280 строк) - экспорт в PNG
- **exportPDF.ts** (~320 строк) - экспорт в PDF
```

**Коммит:** `docs(timeline): update guide with new structure`

---

## Чеклисты тестирования

### После каждого коммита

- [ ] Приложение запускается без ошибок (`npm run dev`)
- [ ] TypeScript компилируется без ошибок (`npm run build`)
- [ ] Нет ошибок в консоли браузера

### Функциональное тестирование (Phase 1)

**Экспорт:**
- [ ] JSON экспорт создаёт корректный файл
- [ ] PNG экспорт создаёт изображение
- [ ] PDF экспорт создаёт PDF-документ
- [ ] Все форматы содержат актуальные данные

### Функциональное тестирование (Phase 2)

**Левая панель:**
- [ ] Изменение текущего возраста обновляет линию жизни
- [ ] Ползунок прокрутки перемещает вьюпорт
- [ ] Ползунок масштаба изменяет zoom
- [ ] Статистика событий отображается корректно
- [ ] Кнопка "Очистить всё" работает

**Правая панель:**
- [ ] Индикатор сохранения меняет цвет
- [ ] Селектор периодизации работает
- [ ] Формы отображаются корректно

**Canvas:**
- [ ] События отображаются на холсте
- [ ] Ветки отображаются корректно
- [ ] Масштабирование колесом мыши работает
- [ ] Перетаскивание холста работает
- [ ] Перетаскивание событий работает

**Формы:**
- [ ] Создание нового события работает
- [ ] Редактирование события сохраняет изменения
- [ ] Удаление события работает
- [ ] Валидация полей работает

### Регрессионное тестирование (Phase 3)

**Все сценарии использования:**
- [ ] Создание события на основной линии
- [ ] Создание события на ветке
- [ ] Перемещение события влево/вправо
- [ ] Создание ветки от события
- [ ] Изменение длины ветки
- [ ] Удаление ветки (события возвращаются на родительскую линию)
- [ ] Массовое создание событий
- [ ] Сохранение события как заметки
- [ ] Сохранение заметки как события
- [ ] Редактирование профиля рождения
- [ ] Выбор периодизации развития
- [ ] Клик по границе периодов
- [ ] Undo/Redo операций
- [ ] Горячие клавиши (Cmd+Z, Cmd+Shift+Z, Delete, Escape)

**Автосохранение:**
- [ ] Данные сохраняются в Firestore через 10 секунд
- [ ] При перезагрузке страницы данные восстанавливаются
- [ ] Индикатор сохранения показывает корректный статус

**Edge cases:**
- [ ] Пустой таймлайн отображается корректно
- [ ] Таймлайн с 1000+ событиями работает без лагов
- [ ] События с очень длинными названиями не ломают UI
- [ ] Ветки с пересекающимися диапазонами работают корректно
- [ ] Отрицательный возраст отклоняется валидацией
- [ ] Возраст > 100 лет отклоняется валидацией

---

## Процедуры отката

### Откат отдельного коммита

```bash
# Откат последнего коммита (сохранить изменения)
git reset --soft HEAD~1

# Откат последнего коммита (удалить изменения)
git reset --hard HEAD~1

# Откат конкретного коммита
git revert <commit-hash>
```

### Откат к началу рефакторинга

```bash
# Вернуться к тегу timeline-refactor-start
git checkout timeline-refactor-start

# Создать новую ветку от этой точки
git checkout -b refactor/timeline-v2
```

### Откат отдельного файла

```bash
# Вернуть файл к состоянию из конкретного коммита
git checkout <commit-hash> -- path/to/file.tsx
```

---

## Метрики успеха

### Метрики кода

| Метрика | До рефакторинга | После Phase 1 | После Phase 2 | После Phase 3 | Цель |
|---------|----------------|---------------|---------------|---------------|------|
| **Общее количество строк** | 4589 | 4500 | 3800 | 3200 | 3000-3500 |
| **Timeline.tsx** | 2109 | 2109 | 800 | 400 | <500 |
| **Количество компонентов** | 6 | 6 | 12 | 12 | 10-15 |
| **Максимальный размер компонента** | 2109 | 2109 | 800 | 400 | <500 |
| **Покрытие тестами** | 0% | 5% | 10% | 30% | >25% |

### Метрики производительности

| Метрика | До | После | Цель |
|---------|-----|-------|------|
| **Время рендера (1000 событий)** | ? | ? | <100ms |
| **Размер бандла Timeline** | ? | ? | -15% |
| **Time to Interactive** | ? | ? | <3s |

### Метрики поддерживаемости

| Метрика | До | После | Цель |
|---------|-----|-------|------|
| **Когнитивная сложность Timeline.tsx** | Высокая | Средняя | Низкая |
| **Количество пропсов в Timeline** | 0 (все внутри) | 30+ | <15 |
| **Количество useState в Timeline** | 34 | 10 | <15 |

---

## Заключение

Этот план обеспечивает пошаговый рефакторинг системы таймлайна с фокусом на:

1. **Безопасность**: каждый шаг тестируется, есть процедуры отката
2. **Измеримость**: чёткие метрики успеха
3. **Постепенность**: три фазы с нарастающей сложностью
4. **Поддерживаемость**: итоговый код легче читать и модифицировать

После завершения рефакторинга:
- Timeline.tsx сократится с 2109 до ~400 строк (сокращение на 81%)
- Появится 12 компонентов вместо монолита
- Код будет покрыт тестами на >25%
- Архитектура станет более модульной и поддерживаемой
