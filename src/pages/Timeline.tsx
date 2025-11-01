import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth/AuthProvider';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Icon, type EventIconId } from '../components/Icon';
import { EVENT_ICONS, EVENT_ICON_MAP } from '../data/eventIcons';

// ============ TYPES ============

type Sphere =
  | 'education' // Образование
  | 'career' // Карьера
  | 'family' // Семья
  | 'health' // Здоровье
  | 'friends' // Друзья
  | 'place' // Место/переезд
  | 'finance' // Финансы
  | 'hobby' // Хобби
  | 'other'; // Другое

type NodeT = {
  id: string;
  age: number;
  x?: number; // X-координата для перемещения влево/вправо от линии жизни
  parentX?: number; // X-координата родительской линии (от которой была создана горизонталь)
  label: string;
  notes?: string;
  sphere?: Sphere;
  isDecision: boolean;
  iconId?: EventIconId;
};

type EdgeT = {
  id: string;
  x: number; // X-координата ветки
  startAge: number; // Возраст начала (где событие)
  endAge: number; // Возраст конца
  color: string; // Цвет (от сферы события)
  nodeId: string; // ID события, от которого идёт ветка
};

type TimelineData = {
  currentAge: number;
  ageMax: number;
  nodes: NodeT[];
  edges: EdgeT[];
};

type HistoryState = {
  nodes: NodeT[];
  edges: EdgeT[];
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ============ CONSTANTS ============

const YEAR_PX = 80; // Пиксели на год по вертикали
const DEFAULT_AGE_MAX = 100;
const DEFAULT_CURRENT_AGE = 25;
const LINE_X_POSITION = 2000; // X-координата линии жизни (центр холста)
const NODE_RADIUS = 20;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;

const SPHERE_META: Record<Sphere, { color: string; label: string; emoji: string }> = {
  education: { color: '#a5b4fc', label: 'Образование', emoji: '🎓' }, // Пастельный индиго
  career: { color: '#7dd3fc', label: 'Карьера', emoji: '💼' }, // Пастельный голубой
  family: { color: '#fca5a5', label: 'Семья', emoji: '❤️' }, // Пастельный красный
  health: { color: '#86efac', label: 'Здоровье', emoji: '💪' }, // Пастельный зелёный
  friends: { color: '#fcd34d', label: 'Друзья', emoji: '🤝' }, // Пастельный оранжевый
  place: { color: '#c4b5fd', label: 'Место/переезд', emoji: '🏠' }, // Пастельный фиолетовый
  finance: { color: '#6ee7b7', label: 'Финансы', emoji: '💰' }, // Пастельный изумрудный
  hobby: { color: '#f9a8d4', label: 'Хобби', emoji: '🎨' }, // Пастельный розовый
  other: { color: '#cbd5e1', label: 'Другое', emoji: '⭐' }, // Пастельный серый
};

// ============ UTILITIES ============

function screenToWorld(
  e: React.PointerEvent | React.WheelEvent,
  svg: SVGSVGElement | null,
  transform: { x: number; y: number; k: number }
) {
  if (!svg) return { x: 0, y: 0 };
  const rect = svg.getBoundingClientRect();
  const screenX = 'clientX' in e ? e.clientX : 0;
  const screenY = 'clientY' in e ? e.clientY : 0;
  return {
    x: (screenX - rect.left - transform.x) / transform.k,
    y: (screenY - rect.top - transform.y) / transform.k,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseAge(value: string): number {
  // Заменяем запятую на точку и убираем лидирующие нули
  const cleaned = value.replace(',', '.').replace(/^0+(?=\d)/, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

type IconPickerTone = 'emerald' | 'sky';

function IconPickerButton({
  value,
  onChange,
  tone,
}: {
  value: EventIconId | null;
  onChange: (value: EventIconId | null) => void;
  tone: IconPickerTone;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toneClasses = tone === 'emerald'
    ? {
        button: 'border-emerald-200 hover:border-emerald-300',
        active: 'border-emerald-400 shadow-md',
        header: 'text-emerald-700',
        popover: 'border-emerald-200',
        reset: 'border-emerald-200 text-emerald-600 hover:bg-emerald-50',
      }
    : {
        button: 'border-sky-200 hover:border-sky-300',
        active: 'border-sky-400 shadow-md',
        header: 'text-sky-700',
        popover: 'border-sky-200',
        reset: 'border-slate-200 text-slate-600 hover:bg-slate-100',
      };

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-8 w-8 items-center justify-center rounded-xl border bg-white/85 text-lg transition ${toneClasses.button}`}
        title="Выбрать пиктограмму события"
      >
        {value ? (
          <Icon name={value} size={24} />
        ) : (
          <span aria-hidden="true">🖼️</span>
        )}
      </button>
      {open && (
        <div
          ref={popoverRef}
          className={`absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border ${toneClasses.popover} bg-white/95 p-3 shadow-2xl backdrop-blur-md`}
        >
          <div className={`mb-2 text-xs font-semibold uppercase tracking-[0.2em] ${toneClasses.header}`}>
            Пиктограмма
          </div>
          <div className="grid grid-cols-5 gap-2">
            {EVENT_ICONS.map((icon) => {
              const isActive = value === icon.id;
              return (
                <button
                  type="button"
                  key={icon.id}
                  onClick={() => {
                    onChange(icon.id);
                    setOpen(false);
                  }}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-white/85 transition ${
                    isActive ? toneClasses.active : 'border-transparent hover:border-slate-200'
                  }`}
                  title={icon.name}
                >
                  <Icon name={icon.id} size={30} />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`mt-3 w-full rounded-xl border bg-white/85 px-3 py-1.5 text-xs font-medium transition ${toneClasses.reset}`}
          >
            Без пиктограммы
          </button>
        </div>
      )}
    </div>
  );
}


// ============ MAIN COMPONENT ============

export default function Timeline() {
  const { user } = useAuth();
  const svgRef = useRef<SVGSVGElement>(null);

  // State
  const [currentAge, setCurrentAge] = useState(DEFAULT_CURRENT_AGE);
  const [ageMax, setAgeMax] = useState(DEFAULT_AGE_MAX);
  const [nodes, setNodes] = useState<NodeT[]>([]);
  const [edges, setEdges] = useState<EdgeT[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 50, y: 100, k: 1 });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showHelp, setShowHelp] = useState(false);
  const [showSaveTooltip, setShowSaveTooltip] = useState(false);
  const [initialViewportSet, setInitialViewportSet] = useState(false);

  // Panning state
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null);

  // Dragging event state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartNodeX, setDragStartNodeX] = useState<number>(LINE_X_POSITION); // Исходная X-координата события

  // History state (Undo/Redo)
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Form state for adding/editing event
  const [formEventId, setFormEventId] = useState<string | null>(null);
  const [formEventAge, setFormEventAge] = useState<string>('');
  const [formEventLabel, setFormEventLabel] = useState('');
  const [formEventNotes, setFormEventNotes] = useState('');
  const [formEventSphere, setFormEventSphere] = useState<Sphere | undefined>(undefined);
  const [formEventIsDecision, setFormEventIsDecision] = useState(false);
  const [formEventIcon, setFormEventIcon] = useState<EventIconId | null>(null);

  // Original values when editing (to detect changes)
  const [originalFormValues, setOriginalFormValues] = useState<{
    age: string;
    label: string;
    notes: string;
    sphere: Sphere | undefined;
    isDecision: boolean;
    iconId: EventIconId | null;
  } | null>(null);

  // Viewport scroll state
  const [viewportAge, setViewportAge] = useState<number>(currentAge);

  // Branch extension state
  const [branchYears, setBranchYears] = useState<string>('5');

  // Selected branch X coordinate (for placing new events)
  const [selectedBranchX, setSelectedBranchX] = useState<number | null>(null);

  // Computed
  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedId), [nodes, selectedId]);
  const selectedEdge = useMemo(() => edges.find((e) => e.x === selectedBranchX), [edges, selectedBranchX]);

  // Check if form has changes (for edit mode)
  const hasFormChanges = useMemo(() => {
    if (!formEventId || !originalFormValues) return false;

    return (
      formEventAge !== originalFormValues.age ||
      formEventLabel !== originalFormValues.label ||
      formEventNotes !== originalFormValues.notes ||
      formEventSphere !== originalFormValues.sphere ||
      formEventIsDecision !== originalFormValues.isDecision ||
      formEventIcon !== originalFormValues.iconId
    );
  }, [formEventId, originalFormValues, formEventAge, formEventLabel, formEventNotes, formEventSphere, formEventIsDecision, formEventIcon]);

  // Автоматический подхват сферы при выборе ветки
  useEffect(() => {
    // Только если создаём новое событие (не редактируем существующее)
    if (formEventId !== null) return;

    // Только если выбрана ветка
    if (selectedBranchX !== null) {
      // Найти любую ветку с этой X-координатой
      const selectedEdge = edges.find((e) => e.x === selectedBranchX);
      if (selectedEdge) {
        // Найти исходное событие этой ветки
        const originNode = nodes.find((n) => n.id === selectedEdge.nodeId);
        if (originNode && originNode.sphere) {
          // Автоматически установить сферу в select
          setFormEventSphere(originNode.sphere);
        }
      }
    }
    // Если ветка не выбрана - не меняем сферу (пользователь мог выбрать вручную)
  }, [selectedBranchX, edges, nodes, formEventId]);

  // Установить длину ветки при выборе
  useEffect(() => {
    if (selectedEdge) {
      const length = selectedEdge.endAge - selectedEdge.startAge;
      setBranchYears(length.toString());
    }
  }, [selectedEdge]);

  const worldWidth = 4000;
  const worldHeight = ageMax * YEAR_PX + 500;

  // Adaptive node radius based on zoom level
  // При отдалении (k маленький) - кружки больше, при приближении - меньше
  // Используем обратную пропорцию: radius = baseRadius / k
  const baseRadius = 15; // Уменьшено на 1/4 (было 20)
  const adaptiveRadius = clamp(baseRadius / transform.k, 9, 38);

  // ============ HISTORY (UNDO/REDO) ============

  function saveToHistory(customNodes?: NodeT[], customEdges?: EdgeT[]) {
    const newState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(customNodes ?? nodes)),
      edges: JSON.parse(JSON.stringify(customEdges ?? edges)),
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);

    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }

    setHistory(newHistory);
  }

  function undo() {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }

  // ============ CRUD OPERATIONS ============

  function handleFormSubmit() {
    if (!formEventLabel.trim()) return;

    if (!formEventAge.trim()) {
      alert('Пожалуйста, укажите возраст события');
      return;
    }

    const parsedAge = parseAge(formEventAge);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > ageMax) {
      alert(`Возраст должен быть от 0 до ${ageMax} лет`);
      return;
    }

    if (formEventId) {
      // Edit existing event
      const updatedNodes = nodes.map((n) =>
        n.id === formEventId
          ? {
              ...n,
              age: parsedAge,
              label: formEventLabel,
              notes: formEventNotes,
              sphere: formEventSphere,
              isDecision: formEventIsDecision,
              iconId: formEventIcon ?? undefined,
              x: n.x ?? LINE_X_POSITION,
              parentX: n.parentX,
            }
          : n
      );
      setNodes(updatedNodes);
      saveToHistory(updatedNodes, edges);
    } else {
      // Add new event
      let eventX = LINE_X_POSITION;
      let eventSphere = formEventSphere;

      // Если выбрана ветка, проверяем попадает ли возраст в её диапазон
      if (selectedBranchX !== null) {
        // Ищем edge с нужной X-координатой, который покрывает указанный возраст
        const selectedEdge = edges.find(
          (e) => e.x === selectedBranchX && parsedAge >= e.startAge && parsedAge <= e.endAge
        );

        if (selectedEdge) {
          // Возраст попадает в диапазон ветки
          eventX = selectedBranchX;

          // Берём сферу от исходного события ветки (всегда, если не указана вручную)
          if (!eventSphere) {
            const originNode = nodes.find((n) => n.id === selectedEdge.nodeId);
            if (originNode && originNode.sphere) {
              eventSphere = originNode.sphere;
            }
          }
        } else {
          // Если не нашли точное совпадение, попробуем найти любую ветку с этой X-координатой
          // и взять сферу от её исходного события (для автоподхвата)
          const anyEdgeAtX = edges.find((e) => e.x === selectedBranchX);
          if (anyEdgeAtX) {
            // Автоподхват сферы даже если возраст не в диапазоне
            if (!eventSphere) {
              const originNode = nodes.find((n) => n.id === anyEdgeAtX.nodeId);
              if (originNode && originNode.sphere) {
                eventSphere = originNode.sphere;
              }
            }

            alert(
              `Возраст события (${parsedAge} лет) не попадает в диапазон выбранной ветки (${anyEdgeAtX.startAge}-${anyEdgeAtX.endAge} лет). Событие будет добавлено на основную линию жизни.`
            );
          }
        }
      }

      const node: NodeT = {
        id: crypto.randomUUID(),
        age: parsedAge,
        x: eventX,
        parentX: selectedBranchX ?? undefined, // Запоминаем родительскую линию
        label: formEventLabel,
        notes: formEventNotes,
        sphere: eventSphere,
        isDecision: formEventIsDecision,
        iconId: formEventIcon ?? undefined,
      };
      const newNodes = [...nodes, node];
      setNodes(newNodes);
      setSelectedId(node.id);
      saveToHistory(newNodes, edges);
    }

    // Clear form
    clearForm();
  }

  function clearForm() {
    setFormEventId(null);
    setFormEventAge('');
    setFormEventLabel('');
    setFormEventNotes('');
    setFormEventSphere(undefined);
    setFormEventIsDecision(false);
    setFormEventIcon(null);
    setSelectedId(null);
    setOriginalFormValues(null);
  }

  function updateNode(id: string, updates: Partial<NodeT>) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  }

  function deleteNode(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    // Также удаляем все ветки связанные с этим событием
    setEdges((prev) => prev.filter((e) => e.nodeId !== id));
    clearForm();
    saveToHistory();
  }

  function extendBranch() {
    if (!selectedNode || !selectedNode.sphere) return;

    const nodeX = selectedNode.x ?? LINE_X_POSITION;
    if (nodeX === LINE_X_POSITION) {
      alert('Событие должно быть не на основной линии жизни');
      return;
    }

    const years = parseFloat(branchYears);
    if (isNaN(years) || years <= 0) {
      alert('Введите корректное количество лет');
      return;
    }

    const meta = SPHERE_META[selectedNode.sphere];
    const edge: EdgeT = {
      id: crypto.randomUUID(),
      x: nodeX,
      startAge: selectedNode.age,
      endAge: selectedNode.age + years,
      color: meta.color,
      nodeId: selectedNode.id,
    };

    const newEdges = [...edges, edge];
    setEdges(newEdges);
    saveToHistory(nodes, newEdges);

    // Очищаем форму и снимаем выбор
    clearForm();
    setBranchYears('5'); // Сбрасываем на значение по умолчанию
  }

  // ============ BRANCH MANAGEMENT ============

  function updateBranchLength() {
    if (!selectedEdge) return;

    const years = parseFloat(branchYears);
    if (isNaN(years) || years <= 0) {
      alert('Введите корректное количество лет');
      return;
    }

    const newEndAge = selectedEdge.startAge + years;

    // Проверка на максимальный возраст
    if (newEndAge > ageMax) {
      alert(`Максимальный возраст: ${ageMax} лет`);
      return;
    }

    // Обновить ветку
    const updatedEdges = edges.map((e) => (e.id === selectedEdge.id ? { ...e, endAge: newEndAge } : e));
    setEdges(updatedEdges);
    saveToHistory(nodes, updatedEdges);
  }

  function deleteBranch() {
    if (!selectedEdge) return;

    const confirmed = window.confirm('Удалить эту ветку? Все события на ней будут перенесены на родительскую линию.');
    if (!confirmed) return;

    // Найти родительскую линию удаляемой ветки
    const originNode = nodes.find((n) => n.id === selectedEdge.nodeId);
    const branchParentX = originNode?.parentX ?? LINE_X_POSITION;

    // Обновить parentX у всех событий на этой ветке
    const updatedNodes = nodes.map((node) => {
      if (node.parentX === selectedEdge.x) {
        return { ...node, parentX: branchParentX === LINE_X_POSITION ? undefined : branchParentX };
      }
      return node;
    });

    // Удалить ветку
    const updatedEdges = edges.filter((e) => e.id !== selectedEdge.id);

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setSelectedBranchX(null); // Снять выделение
    saveToHistory(updatedNodes, updatedEdges);
  }

  // ============ EVENT HANDLERS ============

  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const scaleBy = 1 + -e.deltaY * 0.001;
    const newK = clamp(transform.k * scaleBy, MIN_SCALE, MAX_SCALE);

    // Масштабируем относительно линии жизни (LINE_X_POSITION)
    // Это гарантирует что линия жизни остаётся в центре при масштабировании
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Текущая позиция линии жизни на экране
    const lineScreenX = transform.x + LINE_X_POSITION * transform.k;
    const lineScreenY = transform.y + centerY / transform.k * transform.k;

    // Новая позиция после масштабирования
    const newTransform = {
      k: newK,
      x: lineScreenX - LINE_X_POSITION * newK,
      y: transform.y + (centerY - transform.y) * (1 - newK / transform.k),
    };
    setTransform(newTransform);
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    setIsPanning(true);
    setLastPointer({ x: e.clientX, y: e.clientY });
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    // Сначала проверяем drag событий
    if (draggingNodeId) {
      handleNodeDragMove(e);
      return;
    }

    // Затем panning
    if (isPanning && lastPointer) {
      const dx = e.clientX - lastPointer.x;
      const dy = e.clientY - lastPointer.y;
      setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
      setLastPointer({ x: e.clientX, y: e.clientY });
    }
  }

  function handlePointerUp() {
    handleNodeDragEnd();
    setIsPanning(false);
    setLastPointer(null);
  }

  function handleNodeClick(nodeId: string) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setSelectedId(nodeId);
    setFormEventId(nodeId);
    const ageStr = node.age.toString();
    setFormEventAge(ageStr);
    setFormEventLabel(node.label);
    setFormEventNotes(node.notes || '');
    setFormEventSphere(node.sphere);
    setFormEventIsDecision(node.isDecision);
    setFormEventIcon(node.iconId ?? null);

    // Save original values for change detection
    setOriginalFormValues({
      age: ageStr,
      label: node.label,
      notes: node.notes || '',
      sphere: node.sphere,
      isDecision: node.isDecision,
      iconId: node.iconId ?? null,
    });
  }

  function handleNodeDragStart(e: React.PointerEvent, nodeId: string) {
    e.stopPropagation();
    const worldPoint = screenToWorld(e, svgRef.current, transform);
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setDraggingNodeId(nodeId);
    setDragStartX(worldPoint.x);
    setDragStartNodeX(node.x ?? LINE_X_POSITION); // Запоминаем исходную x-координату события
  }

  function handleNodeDragMove(e: React.PointerEvent) {
    if (!draggingNodeId) return;

    e.stopPropagation();
    const worldPoint = screenToWorld(e, svgRef.current, transform);
    const node = nodes.find((n) => n.id === draggingNodeId);
    if (!node) return;

    const newX = worldPoint.x;
    const oldX = node.x ?? LINE_X_POSITION; // Используем ТЕКУЩУЮ координату события!
    const deltaX = newX - oldX;

    // Рекурсивно обновляем события и ветки
    function updateRecursively(
      currentNodes: NodeT[],
      currentEdges: EdgeT[],
      fromX: number,
      toX: number
    ): { nodes: NodeT[]; edges: EdgeT[] } {
      let updatedNodes = [...currentNodes];
      let updatedEdges = [...currentEdges];

      // Находим ID событий, у которых parentX === fromX (до обновления)
      const childNodeIds = updatedNodes.filter((n) => n.parentX === fromX).map((n) => n.id);

      // Обновляем parentX и x для этих событий
      updatedNodes = updatedNodes.map((n) => {
        if (n.parentX === fromX) {
          // Определяем текущую позицию события
          const currentX = n.x ?? LINE_X_POSITION;

          // Если событие на родительской линии (не смещено), переносим на новую линию
          // Если событие смещено, сохраняем смещение
          const newX = currentX === fromX ? toX : currentX + deltaX;

          return { ...n, x: newX, parentX: toX };
        }
        return n;
      });

      // Для каждого дочернего события обновляем его ветки и рекурсивно обрабатываем
      for (const childNodeId of childNodeIds) {
        // Находим ветки от этого события
        const childEdges = updatedEdges.filter((e) => e.nodeId === childNodeId);

        for (const childEdge of childEdges) {
          const oldEdgeX = childEdge.x;
          const newEdgeX = oldEdgeX + deltaX;

          // Обновляем x-координату ветки
          updatedEdges = updatedEdges.map((e) =>
            e.id === childEdge.id ? { ...e, x: newEdgeX } : e
          );

          // Рекурсивно обновляем потомков на этой ветке
          const result = updateRecursively(updatedNodes, updatedEdges, oldEdgeX, newEdgeX);
          updatedNodes = result.nodes;
          updatedEdges = result.edges;
        }
      }

      return { nodes: updatedNodes, edges: updatedEdges };
    }

    // Обновляем x-координату самого перемещаемого события
    let updatedNodes = nodes.map((n) =>
      n.id === draggingNodeId ? { ...n, x: newX } : n
    );

    // Обновляем x-координату всех веток, связанных с перемещаемым событием
    let updatedEdges = edges.map((edge) =>
      edge.nodeId === draggingNodeId ? { ...edge, x: newX } : edge
    );

    // Рекурсивно обновляем всех детей
    const result = updateRecursively(updatedNodes, updatedEdges, oldX, newX);

    setNodes(result.nodes);
    setEdges(result.edges);
  }

  function handleNodeDragEnd() {
    if (draggingNodeId) {
      saveToHistory();
      setDraggingNodeId(null);
    }
  }

  function handleClearAll() {
    if (confirm('Удалить все события? Это действие нельзя отменить.')) {
      clearForm();
      setNodes([]);
      setEdges([]);
      setSelectedBranchX(null);
      saveToHistory([], []);
    }
  }

  // ============ KEYBOARD SHORTCUTS ============

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInTextField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // Undo/Redo работают всегда
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      if (isInTextField) return;

      if (e.key === 'Delete' && selectedId) {
        deleteNode(selectedId);
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, historyIndex, history]);

  // ============ FIRESTORE SAVE/LOAD ============

  // Функция для удаления undefined значений из объекта (Firestore их не поддерживает)
  function removeUndefined<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => removeUndefined(item)) as T;
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = removeUndefined(obj[key]);
        }
      }
      return cleaned;
    }

    return obj;
  }

  async function saveToFirestore(data: TimelineData) {
    if (!user) return;

    setSaveStatus('saving');
    const docRef = doc(db, 'timelines', user.uid);

    try {
      // Удаляем undefined значения перед сохранением
      const cleanedData = removeUndefined(data);

      await setDoc(
        docRef,
        {
          userId: user.uid,
          updatedAt: serverTimestamp(),
          data: cleanedData,
        },
        { merge: true }
      );

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
    }
  }

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nodes.length > 0 || edges.length > 0) {
        saveToFirestore({ currentAge, ageMax, nodes, edges });
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [nodes, edges, currentAge, ageMax, user]);

  // Load on mount
  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'timelines', user.uid);
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        const { data } = snap.data();
        if (data) {
          const loadedAge = data.currentAge || DEFAULT_CURRENT_AGE;
          setCurrentAge(loadedAge);
          // Всегда используем DEFAULT_AGE_MAX (100), игнорируем старое значение из базы
          const finalAgeMax = DEFAULT_AGE_MAX;
          setAgeMax(finalAgeMax);

          const normalizedNodes = (data.nodes || []).map((node: any) => ({
            id: node.id,
            age: node.age,
            x: node.x ?? LINE_X_POSITION, // По умолчанию на линии жизни
            parentX: node.parentX, // Сохраняем родительскую линию
            label: node.label || 'Событие',
            notes: node.notes || '',
            sphere: node.sphere || 'other',
            isDecision: node.isDecision ?? false,
            iconId: node.iconId ?? undefined,
          }));
          setNodes(normalizedNodes);

          const normalizedEdges = (data.edges || []).map((edge: any) => ({
            id: edge.id,
            x: edge.x,
            startAge: edge.startAge,
            endAge: edge.endAge,
            color: edge.color,
            nodeId: edge.nodeId,
          }));
          setEdges(normalizedEdges);

          // Set initial viewport after data loads
          if (!initialViewportSet) {
            setTimeout(() => {
              // If user has events or non-default age, center on current age
              // Otherwise, center on birth
              const targetAge = normalizedNodes.length > 0 || loadedAge !== DEFAULT_CURRENT_AGE ? loadedAge : 0;
              // Вычисляем worldHeight с актуальным finalAgeMax
              const currentWorldHeight = finalAgeMax * YEAR_PX + 500;
              const targetY = currentWorldHeight - targetAge * YEAR_PX;
              const viewportHeight = window.innerHeight;
              const viewportWidth = window.innerWidth;

              // Центрируем по линии жизни горизонтально и по возрасту вертикально
              setTransform({
                x: viewportWidth / 2 - LINE_X_POSITION,
                y: viewportHeight / 2 - targetY,
                k: 1,
              });
              setViewportAge(targetAge);
              setInitialViewportSet(true);
            }, 100);
          }
        }
      } else {
        // No data - center on birth
        if (!initialViewportSet) {
          setTimeout(() => {
            // Вычисляем worldHeight с DEFAULT_AGE_MAX
            const currentWorldHeight = DEFAULT_AGE_MAX * YEAR_PX + 500;
            const targetY = currentWorldHeight;
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            // Центрируем по линии жизни горизонтально и по рождению вертикально
            setTransform({
              x: viewportWidth / 2 - LINE_X_POSITION,
              y: viewportHeight / 2 - targetY,
              k: 1,
            });
            setViewportAge(0);
            setInitialViewportSet(true);
          }, 100);
        }
      }
    });
  }, [user]);

  // ============ RENDER ============

  const cursorClass = isPanning ? 'cursor-grabbing' : 'cursor-grab';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-gradient-to-br from-slate-50 to-white overflow-hidden"
    >
      {/* Left controls */}
      <div className="fixed top-4 left-4 z-40">
        <aside
          className="w-36 space-y-3 rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-xl backdrop-blur-md sm:w-40"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          <Link
            to="/profile"
            className="flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 px-3 py-2 text-amber-900 shadow-md transition-all duration-200 hover:border-amber-300 hover:from-amber-100 hover:to-yellow-100"
          >
            <span className="text-sm">←</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide">Выход</span>
          </Link>

          <div className="space-y-3">
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">Мой возраст</span>
              <input
                type="number"
                value={currentAge}
                onChange={(e) => setCurrentAge(Number(e.target.value))}
                min={0}
                max={ageMax}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-lg font-semibold text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">Прокрутка</span>
              <input
                type="range"
                value={viewportAge}
                onChange={(e) => {
                  const age = Number(e.target.value);
                  setViewportAge(age);
                  const targetY = worldHeight - age * YEAR_PX;
                  const viewportHeight = window.innerHeight;
                  setTransform((t) => ({
                    ...t,
                    y: viewportHeight / 2 - targetY * t.k,
                  }));
                }}
                min={0}
                max={ageMax}
                step={1}
                className="accent-blue-500"
              />
              <span className="text-center text-[11px] font-medium text-slate-600">{viewportAge} лет</span>
            </label>

            <label className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">Масштаб</span>
              <input
                type="range"
                orient="vertical"
                value={transform.k}
                onChange={(e) => {
                  const newK = Number(e.target.value);
                  const centerY = window.innerHeight / 2;

                  const lineScreenX = transform.x + LINE_X_POSITION * transform.k;

                  setTransform({
                    k: newK,
                    x: lineScreenX - LINE_X_POSITION * newK,
                    y: transform.y + (centerY - transform.y) * (1 - newK / transform.k),
                  });
                }}
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={0.05}
                className="h-32 w-2 accent-blue-500"
                style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' }}
              />
              <span className="text-[11px] font-medium text-slate-600">{(transform.k * 100).toFixed(0)}%</span>
            </label>

            <div className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-inner">
              <div className="text-center">
                <div className="text-xl font-semibold text-slate-900">{nodes.length}</div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-600">Событий</div>
              </div>
              <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
                {Object.entries(SPHERE_META).map(([key, meta]) => {
                  const count = nodes.filter((n) => n.sphere === key).length;
                  if (count === 0) return null;
                  return (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                        <span className="text-slate-600">{meta.emoji}</span>
                      </div>
                      <span className="font-semibold text-slate-900">{count}</span>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleClearAll}
                className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
              >
                ✕ Очистить всё
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Canvas */}
      <div className="absolute inset-0">
        <svg
          ref={svgRef}
          className={`w-full h-full ${cursorClass}`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
            {/* Background */}
            <rect x={0} y={-100} width={worldWidth} height={worldHeight + 200} fill="#ffffff" />

            {/* Time scale - vertical, on the left of life line */}
            {Array.from({ length: Math.floor(ageMax / 5) + 1 }, (_, i) => i * 5).map((age) => (
              <g key={age}>
                {/* Horizontal line at each 5-year mark */}
                <line
                  x1={0}
                  y1={worldHeight - age * YEAR_PX}
                  x2={worldWidth}
                  y2={worldHeight - age * YEAR_PX}
                  stroke="#e2e8f0"
                  strokeWidth={age % 10 === 0 ? 2 : 1}
                />

                {/* Age label */}
                <text
                  x={LINE_X_POSITION - 30}
                  y={worldHeight - age * YEAR_PX + 5}
                  fontSize={42}
                  textAnchor="end"
                  fill="#475569"
                  fontWeight="500"
                  fontFamily="Georgia, serif"
                >
                  {age}
                </text>
              </g>
            ))}

            {/* Life line - vertical */}
            {/* Solid line from birth to current age */}
            <line
              x1={LINE_X_POSITION}
              y1={worldHeight}
              x2={LINE_X_POSITION}
              y2={worldHeight - currentAge * YEAR_PX}
              stroke="#93c5fd"
              strokeWidth={selectedBranchX === null ? 16 : 11}
              strokeLinecap="round"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBranchX(null);
              }}
              className="cursor-pointer"
              style={{ cursor: 'pointer' }}
            />

            {/* Dashed line from current age to max age */}
            <line
              x1={LINE_X_POSITION}
              y1={worldHeight - currentAge * YEAR_PX}
              x2={LINE_X_POSITION}
              y2={worldHeight - ageMax * YEAR_PX}
              stroke="#cbd5e1"
              strokeWidth={selectedBranchX === null ? 16 : 11}
              strokeLinecap="round"
              strokeDasharray="10 5"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBranchX(null);
              }}
              className="cursor-pointer"
              style={{ cursor: 'pointer' }}
            />

            {/* Birth marker */}
            <g>
              <circle cx={LINE_X_POSITION} cy={worldHeight} r={adaptiveRadius * 0.6} fill="#0f172a" />
              <text x={LINE_X_POSITION + adaptiveRadius + 15} y={worldHeight + 5} fontSize={16} fontWeight="600" fill="#0f172a">
                👶 Рождение
              </text>
            </g>

            {/* Current age marker */}
            <g>
              <circle cx={LINE_X_POSITION} cy={worldHeight - currentAge * YEAR_PX} r={adaptiveRadius * 0.5} fill="#3b82f6" />
              <text
                x={LINE_X_POSITION + adaptiveRadius + 10}
                y={worldHeight - currentAge * YEAR_PX + 5}
                fontSize={14}
                fontWeight="600"
                fill="#3b82f6"
              >
                Сейчас ({currentAge} лет)
              </text>
            </g>

            {/* Vertical branches (edges) */}
            {edges
              .filter((edge) => {
                // Пропускаем ветки с невалидными данными
                return (
                  typeof edge.x === 'number' &&
                  typeof edge.startAge === 'number' &&
                  typeof edge.endAge === 'number' &&
                  !isNaN(edge.x) &&
                  !isNaN(edge.startAge) &&
                  !isNaN(edge.endAge)
                );
              })
              .map((edge) => {
                const isSelected = selectedBranchX === edge.x;
                return (
                  <g key={edge.id}>
                    {/* Невидимая толстая линия для расширенной области клика */}
                    <line
                      x1={edge.x}
                      y1={worldHeight - edge.startAge * YEAR_PX}
                      x2={edge.x}
                      y2={worldHeight - edge.endAge * YEAR_PX}
                    stroke="transparent"
                    strokeWidth={isSelected ? 24 : 12}
                    strokeLinecap="round"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBranchX(edge.x);
                    }}
                    className="cursor-pointer"
                    style={{ cursor: 'pointer' }}
                  />
                  {/* Видимая линия */}
                  <line
                    x1={edge.x}
                    y1={worldHeight - edge.startAge * YEAR_PX}
                    x2={edge.x}
                    y2={worldHeight - edge.endAge * YEAR_PX}
                    stroke={edge.color}
                    strokeWidth={isSelected ? 8 : 4}
                    strokeLinecap="round"
                    opacity={isSelected ? 1 : 0.8}
                    pointerEvents="none"
                  />
                </g>
              );
            })}

            {/* Events */}
            {nodes
              .filter((node) => {
                // Пропускаем события с невалидным возрастом
                return typeof node.age === 'number' && !isNaN(node.age);
              })
              .map((node) => {
                const isSelected = node.id === selectedId;
                const isDragging = node.id === draggingNodeId;
                const meta = node.sphere ? SPHERE_META[node.sphere] : SPHERE_META.other;
                const y = worldHeight - node.age * YEAR_PX;
                const x = node.x ?? LINE_X_POSITION;
                const iconMeta = node.iconId ? EVENT_ICON_MAP[node.iconId] : null;
                const iconSize = adaptiveRadius * 2;

              // Подсвечиваем горизонтальную линию только если выбрана ветка с той же X-координатой
              const isBranchSelected = selectedBranchX !== null && x === selectedBranchX && x !== LINE_X_POSITION;

              // Родительская линия - та, от которой событие было создано
              // Хранится в node.parentX, если undefined - значит от основной линии
              const parentLineX = node.parentX ?? LINE_X_POSITION;

              // Рисовать горизонтальную линию, если событие НЕ на родительской линии
              // Также проверяем, что все координаты валидны
              const shouldDrawHorizontalLine =
                x !== parentLineX &&
                typeof parentLineX === 'number' &&
                typeof x === 'number' &&
                typeof y === 'number' &&
                !isNaN(parentLineX) &&
                !isNaN(x) &&
                !isNaN(y);

              return (
                <g key={node.id}>
                  {/* Веточка - линия от родительской линии к событию */}
                  {shouldDrawHorizontalLine && (
                    <line
                      x1={parentLineX}
                      y1={y}
                      x2={x}
                      y2={y}
                      stroke={meta.color}
                      strokeWidth={isBranchSelected ? 6 : 3}
                      strokeLinecap="round"
                      opacity={isBranchSelected ? 1 : 0.6}
                    />
                  )}

                  {/* Event circle */}
                  <g
                    onPointerDown={(e) => handleNodeDragStart(e, node.id)}
                    onClick={() => !isDragging && handleNodeClick(node.id)}
                    className="cursor-move"
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                  >
                    {iconMeta ? (
                      <>
                        <circle
                          cx={x}
                          cy={y}
                          r={adaptiveRadius}
                          fill="transparent"
                          stroke="transparent"
                          strokeWidth={0}
                        />
                        <image
                          href={`/icons/events/${iconMeta.filename}`}
                          x={x - adaptiveRadius}
                          y={y - adaptiveRadius}
                          width={iconSize}
                          height={iconSize}
                          preserveAspectRatio="xMidYMid meet"
                          pointerEvents="none"
                        />
                      </>
                    ) : (
                      <circle cx={x} cy={y} r={adaptiveRadius} fill="white" stroke={meta.color} strokeWidth={4} />
                    )}

                    {/* Selection highlight */}
                    {isSelected && (
                      <circle cx={x} cy={y} r={adaptiveRadius + 4} fill="none" stroke="#0f172a" strokeWidth={3} opacity={0.8} />
                    )}

                    {/* Decision cross */}
                    {node.isDecision === true && !iconMeta && (
                      <g>
                        <line
                          x1={x - adaptiveRadius * 0.4}
                          y1={y - adaptiveRadius * 0.4}
                          x2={x + adaptiveRadius * 0.4}
                          y2={y + adaptiveRadius * 0.4}
                          stroke={meta.color}
                          strokeWidth={3}
                          strokeLinecap="round"
                        />
                        <line
                          x1={x - adaptiveRadius * 0.4}
                          y1={y + adaptiveRadius * 0.4}
                          x2={x + adaptiveRadius * 0.4}
                          y2={y - adaptiveRadius * 0.4}
                          stroke={meta.color}
                          strokeWidth={3}
                          strokeLinecap="round"
                        />
                      </g>
                    )}

                    {/* Label */}
                    <text
                      x={x + adaptiveRadius + 10}
                      y={y - adaptiveRadius - 5}
                      fontSize={28}
                      fontWeight="500"
                      fill="#0f172a"
                      fontFamily="Georgia, serif"
                    >
                      {node.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Right Sidebar */}
      <aside className="fixed right-0 top-0 bottom-0 w-80 border-l border-purple-200 bg-gradient-to-b from-purple-50 to-blue-50 overflow-y-auto z-30">
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>Таймлайн жизни</h2>
              {/* Save status lamp */}
              <div
                className="relative"
                onMouseEnter={() => setShowSaveTooltip(true)}
                onMouseLeave={() => setShowSaveTooltip(false)}
              >
                <div
                  className={`w-3 h-3 rounded-full transition-colors ${
                    saveStatus === 'saving'
                      ? 'bg-yellow-500 animate-pulse'
                      : saveStatus === 'saved'
                      ? 'bg-green-500'
                      : saveStatus === 'error'
                      ? 'bg-red-500'
                      : 'bg-slate-300'
                  }`}
                />
                {/* Tooltip */}
                {showSaveTooltip && (
                  <div className="absolute left-5 top-0 z-50 w-48 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-xl">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-slate-300 rounded-full" />
                        <span>Ожидание</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <span>Сохранение...</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>Сохранено</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span>Ошибка</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Unified Event Form - show when no branch selected OR editing an event */}
          {(!selectedBranchX || formEventId) && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
                {formEventId ? 'Редактировать событие' : 'Новое событие'}
              </h3>
              <div className="flex items-center gap-2">
                <IconPickerButton value={formEventIcon} onChange={setFormEventIcon} tone="emerald" />
                {formEventId && (
                  <button
                    onClick={clearForm}
                    className="px-2 py-1 text-xs rounded-lg bg-white/80 text-slate-600 hover:bg-white transition"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Отменить
                  </button>
                )}
              </div>
            </div>

            {/* Selected branch indicator */}
            {!formEventId && selectedBranchX !== null && (() => {
              const selectedEdge = edges.find((e) => e.x === selectedBranchX);
              return (
                <div className="mb-3 p-2 bg-purple-100 border border-purple-300 rounded-lg">
                  <p className="text-xs text-purple-900" style={{ fontFamily: 'Georgia, serif' }}>
                    <span className="font-semibold">📍 Выбрана ветка</span>
                    <br />
                    {selectedEdge ? (
                      <>
                        Диапазон: {selectedEdge.startAge}-{selectedEdge.endAge} лет
                        <br />
                        Новое событие в этом диапазоне будет добавлено на ветку
                      </>
                    ) : (
                      'Новое событие будет добавлено на выбранную ветку'
                    )}
                  </p>
                </div>
              );
            })()}
            {!formEventId && selectedBranchX === null && (
              <div className="mb-3 p-2 bg-blue-100 border border-blue-300 rounded-lg">
                <p className="text-xs text-blue-900" style={{ fontFamily: 'Georgia, serif' }}>
                  <span className="font-semibold">📍 Основная линия</span>
                  <br />
                  Новое событие будет добавлено на основную линию жизни
                </p>
              </div>
            )}

            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleFormSubmit();
              }}
            >
              <label className="block">
                <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
                  Возраст (лет)
                </span>
                <input
                  type="text"
                  value={formEventAge}
                  onChange={(e) => setFormEventAge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition text-sm bg-white"
                  style={{ fontFamily: 'Georgia, serif' }}
                  placeholder="Например: 25 или 25,5"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
                  Название
                </span>
                <input
                  type="text"
                  value={formEventLabel}
                  onChange={(e) => setFormEventLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition text-sm bg-white"
                  style={{ fontFamily: 'Georgia, serif' }}
                  placeholder="Например: Поступил в университет"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
                  Сфера жизни (опционально)
                </span>
                <select
                  value={formEventSphere || ''}
                  onChange={(e) => setFormEventSphere(e.target.value ? (e.target.value as Sphere) : undefined)}
                  className="w-full px-3 py-2 rounded-xl border border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition bg-white text-sm"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  <option value="">Не указано</option>
                  {Object.entries(SPHERE_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.emoji} {meta.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-green-200 hover:bg-white/50 transition cursor-pointer bg-white/30">
                <input
                  type="checkbox"
                  checked={formEventIsDecision}
                  onChange={(e) => setFormEventIsDecision(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-xs font-medium text-slate-700" style={{ fontFamily: 'Georgia, serif' }}>
                  ✕ Это было моё решение
                </span>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
                  Подробности
                </span>
                <textarea
                  value={formEventNotes}
                  onChange={(e) => setFormEventNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition resize-none text-sm bg-white"
                  style={{ fontFamily: 'Georgia, serif' }}
                  rows={3}
                  placeholder="Опишите контекст..."
                />
              </label>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={formEventId ? !hasFormChanges : false}
                  className="flex-1 px-4 py-2.5 bg-green-400 text-white rounded-xl hover:bg-green-500 transition font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {formEventId ? 'Сохранить' : '+ Добавить'}
                </button>
                {formEventId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Удалить это событие?')) {
                        deleteNode(formEventId);
                      }
                    }}
                    className="px-4 py-2.5 bg-red-200 hover:bg-red-300 text-red-800 rounded-xl transition font-medium text-sm"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            </form>

            {/* Branch extension - only show when event is not on main life line AND doesn't have a branch yet */}
            {formEventId &&
              selectedNode &&
              (selectedNode.x ?? LINE_X_POSITION) !== LINE_X_POSITION &&
              !edges.some((e) => e.nodeId === selectedNode.id) && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <label className="block mb-2">
                  <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
                    Продолжить ветку (лет)
                  </span>
                  <input
                    type="number"
                    value={branchYears}
                    onChange={(e) => setBranchYears(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition text-sm bg-white"
                    style={{ fontFamily: 'Georgia, serif' }}
                    min={1}
                    max={ageMax - selectedNode.age}
                    step={1}
                  />
                </label>
                <button
                  type="button"
                  onClick={extendBranch}
                  className="w-full px-4 py-2.5 bg-purple-400 text-white rounded-xl hover:bg-purple-500 transition font-medium text-sm"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  ↑ Продолжить ветку
                </button>
              </div>
            )}
          </div>
          )}

          {/* Branch editor - show when branch is selected */}
          {selectedBranchX && !formEventId && (
            <>
              {/* Branch settings */}
              {selectedEdge && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4 border border-purple-200 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
                      Редактор ветки
                    </h3>
                    <button
                      onClick={() => setSelectedBranchX(null)}
                      className="px-2 py-1 text-xs rounded-lg bg-white/80 text-slate-600 hover:bg-white transition"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      Закрыть
                    </button>
                  </div>

                  {/* Branch info */}
                  <div className="mb-3 p-3 bg-white/60 rounded-xl border border-purple-200">
                    <div className="text-sm text-slate-700" style={{ fontFamily: 'Georgia, serif' }}>
                      <div className="font-semibold mb-1">
                        Диапазон: {selectedEdge.endAge - selectedEdge.startAge} лет
                      </div>
                      <div className="text-xs text-slate-600">
                        ({selectedEdge.startAge} - {selectedEdge.endAge} лет)
                      </div>
                    </div>
                  </div>

                  {/* Length input */}
                  <div className="mb-3">
                    <label className="block mb-2">
                      <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
                        Длина ветки (лет)
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={branchYears}
                          onChange={(e) => setBranchYears(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-purple-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition text-sm bg-white"
                          style={{ fontFamily: 'Georgia, serif' }}
                          min={1}
                          max={ageMax - selectedEdge.startAge}
                          step={1}
                        />
                        <button
                          onClick={updateBranchLength}
                          className="px-3 py-2 bg-purple-400 hover:bg-purple-500 text-white rounded-xl transition text-xs font-medium"
                          style={{ fontFamily: 'Georgia, serif' }}
                          title="Применить"
                        >
                          ✓
                        </button>
                      </div>
                    </label>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={deleteBranch}
                    className="w-full px-3 py-2 bg-red-200 hover:bg-red-300 text-red-800 rounded-xl transition text-sm font-medium"
                    style={{ fontFamily: 'Georgia, serif' }}
                    title="Удалить ветку"
                  >
                    🗑️
                  </button>

                  <div className="mt-3 text-xs text-slate-600" style={{ fontFamily: 'Georgia, serif' }}>
                    💡 События на ветке перейдут на родительскую линию
                  </div>
                </div>
              )}

              {/* Event creation form */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-200 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
                    Новое событие на ветке
                  </h3>
                  <IconPickerButton value={formEventIcon} onChange={setFormEventIcon} tone="sky" />
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleFormSubmit();
                  }}
                  className="space-y-3"
                >
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
                      Возраст
                    </span>
                    <input
                      type="text"
                      value={formEventAge}
                      onChange={(e) => setFormEventAge(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition text-sm bg-white"
                      style={{ fontFamily: 'Georgia, serif' }}
                      placeholder="Например: 25 или 25,5"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
                      Название
                    </span>
                    <input
                      type="text"
                      value={formEventLabel}
                      onChange={(e) => setFormEventLabel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition text-sm bg-white"
                      style={{ fontFamily: 'Georgia, serif' }}
                      placeholder="Например: Поступил в университет"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
                      Сфера жизни
                    </span>
                    <select
                      value={formEventSphere || ''}
                      onChange={(e) => setFormEventSphere(e.target.value ? (e.target.value as Sphere) : undefined)}
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition bg-white text-sm"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      <option value="">Не указано</option>
                      {Object.entries(SPHERE_META).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.emoji} {meta.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-blue-200 hover:bg-white/50 transition cursor-pointer bg-white/30">
                    <input
                      type="checkbox"
                      checked={formEventIsDecision}
                      onChange={(e) => setFormEventIsDecision(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-xs text-slate-700" style={{ fontFamily: 'Georgia, serif' }}>
                      ✕ Это было моё решение
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="w-full px-4 py-2.5 bg-blue-400 text-white rounded-xl hover:bg-blue-500 transition font-medium text-sm"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    + Добавить событие
                  </button>
                </form>
              </div>
            </>
          )}

          {/* Undo/Redo controls - moved from left */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-3 border border-amber-200 shadow-sm">
            <div className="flex gap-2">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-amber-300 bg-white hover:bg-amber-50 transition disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-1"
                style={{ fontFamily: 'Georgia, serif' }}
                title="Отменить (Cmd+Z)"
              >
                <span>←</span>
                <span>Отменить</span>
              </button>

              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-amber-300 bg-white hover:bg-amber-50 transition disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-1"
                style={{ fontFamily: 'Georgia, serif' }}
                title="Повторить (Cmd+Shift+Z)"
              >
                <span>Повторить</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Как пользоваться таймлайном</h2>
                <button onClick={() => setShowHelp(false)} className="p-2 rounded-xl hover:bg-slate-100 transition">
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-slate-700">
                <section>
                  <h3 className="font-semibold text-lg mb-2">🎯 Что это?</h3>
                  <p className="leading-relaxed">
                    Таймлайн жизни растет снизу вверх. Сплошная линия - ваша прожитая жизнь, пунктир - будущее.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-lg mb-2">📝 Как добавлять события</h3>
                  <ul className="space-y-2">
                    <li>1. Укажите свой текущий возраст слева</li>
                    <li>2. Используйте форму справа для добавления событий</li>
                    <li>3. Выберите возраст, название и сферу жизни</li>
                    <li>4. Отметьте крестиком, если это было ваше решение</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-lg mb-2">🎨 Сферы жизни</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(SPHERE_META).map(([key, meta]) => (
                      <div key={key} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: meta.color }} />
                        <span>
                          {meta.emoji} {meta.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <h3 className="font-semibold text-amber-900 mb-2">⚠️ Важно</h3>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    Данные автоматически сохраняются каждые 10 секунд. Используйте колёсико мыши для масштабирования и перетаскивайте
                    холст для перемещения.
                  </p>
                </section>
              </div>

              <button onClick={() => setShowHelp(false)} className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition">
                Понятно!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
