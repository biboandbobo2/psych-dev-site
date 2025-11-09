// Timeline component with bulk event creation support
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth/AuthProvider';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Icon, type EventIconId } from '../components/Icon';
import { EVENT_ICON_MAP } from '../data/eventIcons';
import { useNotes } from '../hooks/useNotes';

// Импорт типов, констант, утилит и компонентов из модулей
import type {
  Sphere,
  NodeT,
  BirthDetails,
  EdgeT,
  TimelineData,
  HistoryState,
  SaveStatus,
  Transform,
} from './timeline/types';
import {
  YEAR_PX,
  DEFAULT_AGE_MAX,
  DEFAULT_CURRENT_AGE,
  LINE_X_POSITION,
  MIN_SCALE,
  MAX_SCALE,
  SPHERE_META,
  SAVE_DEBOUNCE_MS,
  BASE_NODE_RADIUS,
  MIN_NODE_RADIUS,
  MAX_NODE_RADIUS,
  BRANCH_CLICK_WIDTH,
  BRANCH_CLICK_WIDTH_UNSELECTED,
} from './timeline/constants';
import { screenToWorld, clamp, parseAge, removeUndefined } from './timeline/utils';
import { IconPickerButton } from './timeline/components/IconPickerButton';
import { PeriodizationSelector } from './timeline/components/PeriodizationSelector';
import { PeriodBoundaryModal } from './timeline/components/PeriodBoundaryModal';
import { BulkEventCreator } from './timeline/components/BulkEventCreator';
import { SaveEventAsNoteButton } from './timeline/components/SaveEventAsNoteButton';
import { TimelineLeftPanel } from './timeline/components/TimelineLeftPanel';
import { TimelineRightPanel } from './timeline/components/TimelineRightPanel';
import { TimelineCanvas } from './timeline/components/TimelineCanvas';
import { PERIODIZATIONS, getPeriodizationById } from './timeline/data/periodizations';
import { exportTimelineJSON, exportTimelinePNG, exportTimelinePDF } from './timeline/utils/exporters';


// ============ MAIN COMPONENT ============

export default function Timeline() {
  const { user } = useAuth();
  const svgRef = useRef<SVGSVGElement>(null);
  const { createNote } = useNotes();

  // State
  const [currentAge, setCurrentAge] = useState(DEFAULT_CURRENT_AGE);
  const [ageMax, setAgeMax] = useState(DEFAULT_AGE_MAX);
  const [nodes, setNodes] = useState<NodeT[]>([]);
  const [edges, setEdges] = useState<EdgeT[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 50, y: 100, k: 1 });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showHelp, setShowHelp] = useState(false);
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
  const [birthDetails, setBirthDetails] = useState<BirthDetails>({});
  const [birthFormDate, setBirthFormDate] = useState('');
  const [birthFormPlace, setBirthFormPlace] = useState('');
  const [birthFormNotes, setBirthFormNotes] = useState('');
  const [birthSelected, setBirthSelected] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

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

  // Periodization state
  const [selectedPeriodization, setSelectedPeriodization] = useState<string | null>(null);
  const [periodBoundaryModal, setPeriodBoundaryModal] = useState<{ periodIndex: number } | null>(null);

  // Bulk event creation state
  const [showBulkCreator, setShowBulkCreator] = useState(false);

  // Computed
  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedId), [nodes, selectedId]);
  const selectedEdge = useMemo(() => edges.find((e) => e.x === selectedBranchX), [edges, selectedBranchX]);
  const birthHasChanges = useMemo(() => {
    const normalized = {
      date: birthDetails.date ?? '',
      place: birthDetails.place ?? '',
      notes: birthDetails.notes ?? '',
    };
    return (
      birthFormDate !== normalized.date ||
      birthFormPlace !== normalized.place ||
      birthFormNotes !== normalized.notes
    );
  }, [birthDetails, birthFormDate, birthFormPlace, birthFormNotes]);

  useEffect(() => {
    if (birthSelected) {
      setBirthFormDate(birthDetails.date ?? '');
      setBirthFormPlace(birthDetails.place ?? '');
      setBirthFormNotes(birthDetails.notes ?? '');
    }
  }, [birthDetails, birthSelected]);

  const birthDateObj = useMemo(() => {
    if (!birthDetails.date) return null;
    const parsed = new Date(birthDetails.date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [birthDetails.date]);
  const birthBaseYear = birthDateObj ? birthDateObj.getFullYear() : null;
  const formattedCurrentAge = useMemo(() => {
    if (Number.isNaN(currentAge)) return '0';
    return Number.isInteger(currentAge) ? `${currentAge}` : currentAge.toFixed(1);
  }, [currentAge]);
  const currentYearLabel = useMemo(() => {
    if (birthBaseYear === null || Number.isNaN(currentAge)) return null;
    return birthBaseYear + Math.round(currentAge);
  }, [birthBaseYear, currentAge]);
  const exportFilenamePrefix = useMemo(() => {
    const now = new Date();
    const iso = now.toISOString();
    return `timeline-${iso.split('T')[0]}`;
  }, []);

  useEffect(() => {
    if (!downloadMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (downloadMenuRef.current?.contains(target)) return;
      if (downloadButtonRef.current?.contains(target)) return;
      setDownloadMenuOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [downloadMenuOpen]);

  const handleDownloadMenuToggle = () => {
    setDownloadMenuOpen((prev) => !prev);
  };

  async function handleDownload(type: 'json' | 'png' | 'pdf') {
    setDownloadMenuOpen(false);
    const exportPayload = {
      currentAge,
      ageMax,
      nodes,
      edges,
      birthDetails: { ...birthDetails },
      selectedPeriodization,
    };

    try {
      if (type === 'json') {
        exportTimelineJSON(exportPayload, `${exportFilenamePrefix}.json`);
        return;
      }

      if (!svgRef.current) {
        throw new Error('SVG not ready for export');
      }

      if (type === 'png') {
        await exportTimelinePNG(svgRef.current, `${exportFilenamePrefix}.png`);
        return;
      }

      const periodization = selectedPeriodization
        ? getPeriodizationById(selectedPeriodization) ?? null
        : null;
      await exportTimelinePDF(svgRef.current, exportPayload, periodization, `${exportFilenamePrefix}.pdf`);
    } catch (error) {
      console.error('Export failed', error);
    }
  }

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

  const handleViewportAgeChange = (age: number) => {
    setViewportAge(age);
    const viewportHeight = window.innerHeight;
    const targetY = worldHeight - age * YEAR_PX;
    setTransform((prev) => ({
      ...prev,
      y: viewportHeight / 2 - targetY * prev.k,
    }));
  };

  const handleScaleChange = (newScale: number) => {
    setTransform((prev) => {
      const centerY = window.innerHeight / 2;
      const lineScreenX = prev.x + LINE_X_POSITION * prev.k;
      return {
        k: newScale,
        x: lineScreenX - LINE_X_POSITION * newScale,
        y: prev.y + (centerY - prev.y) * (1 - newScale / prev.k),
      };
    });
  };

  // Adaptive node radius based on zoom level
  // При отдалении (k маленький) - кружки больше, при приближении - меньше
  // Используем обратную пропорцию: radius = baseRadius / k
  const adaptiveRadius = clamp(BASE_NODE_RADIUS / transform.k, MIN_NODE_RADIUS, MAX_NODE_RADIUS);

  // ============ HISTORY (UNDO/REDO) ============

  function saveToHistory(customNodes?: NodeT[], customEdges?: EdgeT[], customBirth?: BirthDetails) {
    const nodesToSave = customNodes ?? nodes;
    const edgesToSave = customEdges ?? edges;
    const birthToSave = customBirth ?? birthDetails;

    const newState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodesToSave)),
      edges: JSON.parse(JSON.stringify(edgesToSave)),
      birth: { ...birthToSave },
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
      setBirthDetails(prevState.birth);
      setHistoryIndex(historyIndex - 1);
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setBirthDetails(nextState.birth);
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

  function selectBirth() {
    setBirthSelected(true);
    setSelectedId(null);
    setSelectedBranchX(null);
    clearForm();
    setBirthFormDate(birthDetails.date ?? '');
    setBirthFormPlace(birthDetails.place ?? '');
    setBirthFormNotes(birthDetails.notes ?? '');
  }

  function handleBirthSave() {
    const trimmedPlace = birthFormPlace.trim();
    const trimmedNotes = birthFormNotes.trim();

    const updated: BirthDetails = {
      date: birthFormDate ? birthFormDate : undefined,
      place: trimmedPlace ? trimmedPlace : undefined,
      notes: trimmedNotes ? trimmedNotes : undefined,
    };

    setBirthDetails(updated);
    setBirthSelected(false);
    saveToHistory(nodes, edges, updated);
  }

  function handleBirthCancel() {
    setBirthFormDate(birthDetails.date ?? '');
    setBirthFormPlace(birthDetails.place ?? '');
    setBirthFormNotes(birthDetails.notes ?? '');
    setBirthSelected(false);
  }

  function handleBulkCreate(events: Omit<NodeT, 'id'>[]) {
    const newNodes: NodeT[] = events.map((event) => ({
      ...event,
      id: crypto.randomUUID(),
    }));

    const updatedNodes = [...nodes, ...newNodes];
    setNodes(updatedNodes);
    saveToHistory(updatedNodes, edges);
  }

  function handleExtendBranchForBulk(newEndAge: number) {
    if (!selectedEdge) return;

    const updatedEdges = edges.map((e) =>
      e.id === selectedEdge.id ? { ...e, endAge: newEndAge } : e
    );
    setEdges(updatedEdges);
    saveToHistory(nodes, updatedEdges);
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

  const handleHideBranchEditor = () => {
    setSelectedBranchX(null);
  };

  const handleOpenBulkCreator = () => {
    setShowBulkCreator(true);
  };

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
    setBirthSelected(false);
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

  const handlePeriodBoundaryClick = (periodIndex: number) => {
    setPeriodBoundaryModal({ periodIndex });
  };

  const handleSelectBranch = (x: number) => {
    setSelectedBranchX(x);
    setBirthSelected(false);
  };

  const handleClearSelection = () => {
    setSelectedBranchX(null);
    setBirthSelected(false);
  };

  function handleNodeClick(nodeId: string) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setSelectedId(nodeId);
    setBirthSelected(false);
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
        setSelectedBranchX(null);
        setBirthSelected(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, historyIndex, history]);

  // ============ FIRESTORE SAVE/LOAD ============

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
      const hasBirthData = Boolean(birthDetails.date || birthDetails.place || birthDetails.notes);
      if (nodes.length > 0 || edges.length > 0 || hasBirthData || selectedPeriodization) {
        saveToFirestore({ currentAge, ageMax, nodes, edges, birthDetails, selectedPeriodization });
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [nodes, edges, birthDetails, currentAge, ageMax, selectedPeriodization, user]);

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
          setBirthDetails(data.birthDetails || {});
          setSelectedPeriodization(data.selectedPeriodization ?? null);

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
        setBirthDetails({});
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
      <TimelineLeftPanel
        currentAge={currentAge}
        ageMax={ageMax}
        viewportAge={viewportAge}
        scale={transform.k}
        nodes={nodes}
        downloadMenuOpen={downloadMenuOpen}
        downloadButtonRef={downloadButtonRef}
        downloadMenuRef={downloadMenuRef}
        onCurrentAgeChange={(value) => setCurrentAge(value)}
        onViewportAgeChange={handleViewportAgeChange}
        onScaleChange={handleScaleChange}
        onDownloadMenuToggle={handleDownloadMenuToggle}
        onDownloadSelect={handleDownload}
        onClearAll={handleClearAll}
      />

      <TimelineCanvas
        svgRef={svgRef}
        transform={transform}
        worldWidth={worldWidth}
        worldHeight={worldHeight}
        ageMax={ageMax}
        currentAge={currentAge}
        nodes={nodes}
        edges={edges}
        selectedPeriodization={selectedPeriodization}
        selectedId={selectedId}
        selectedBranchX={selectedBranchX}
        draggingNodeId={draggingNodeId}
        birthSelected={birthSelected}
        birthBaseYear={birthBaseYear}
        formattedCurrentAge={formattedCurrentAge}
        currentYearLabel={currentYearLabel}
        cursorClass={cursorClass}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onNodeClick={handleNodeClick}
        onNodeDragStart={handleNodeDragStart}
        onPeriodBoundaryClick={handlePeriodBoundaryClick}
        onSelectBranch={handleSelectBranch}
        onClearSelection={handleClearSelection}
        onSelectBirth={selectBirth}
      />

      <TimelineRightPanel
        saveStatus={saveStatus}
        selectedPeriodization={selectedPeriodization}
        onPeriodizationChange={setSelectedPeriodization}
        birthSelected={birthSelected}
        birthFormDate={birthFormDate}
        birthFormPlace={birthFormPlace}
        birthFormNotes={birthFormNotes}
        onBirthDateChange={setBirthFormDate}
        onBirthPlaceChange={setBirthFormPlace}
        onBirthNotesChange={setBirthFormNotes}
        onBirthSave={handleBirthSave}
        onBirthCancel={handleBirthCancel}
        birthHasChanges={birthHasChanges}
        formEventId={formEventId}
        formEventAge={formEventAge}
        onFormEventAgeChange={setFormEventAge}
        formEventLabel={formEventLabel}
        onFormEventLabelChange={setFormEventLabel}
        formEventSphere={formEventSphere}
        onFormEventSphereChange={(value) => setFormEventSphere(value)}
        formEventIsDecision={formEventIsDecision}
        onFormEventIsDecisionChange={setFormEventIsDecision}
        formEventIcon={formEventIcon}
        onFormEventIconChange={setFormEventIcon}
        formEventNotes={formEventNotes}
        onFormEventNotesChange={setFormEventNotes}
        hasFormChanges={hasFormChanges}
        onEventFormSubmit={handleFormSubmit}
        onClearForm={clearForm}
        onDeleteEvent={deleteNode}
        createNote={createNote}
        selectedBranchX={selectedBranchX}
        selectedEdge={selectedEdge}
        branchYears={branchYears}
        onBranchYearsChange={setBranchYears}
        onUpdateBranchLength={updateBranchLength}
        onDeleteBranch={deleteBranch}
        onHideBranchEditor={handleHideBranchEditor}
        onExtendBranch={extendBranch}
        selectedNode={selectedNode}
        edges={edges}
        ageMax={ageMax}
        onOpenBulkCreator={handleOpenBulkCreator}
        undo={undo}
        redo={redo}
        historyIndex={historyIndex}
        historyLength={history.length}
      />

      {/* Periodization Boundary Modal */}      {/* Periodization Boundary Modal */}
      {periodBoundaryModal && selectedPeriodization && (() => {
        const periodization = getPeriodizationById(selectedPeriodization);
        if (!periodization) return null;

        const periodBefore = periodization.periods[periodBoundaryModal.periodIndex];
        const periodAfter = periodization.periods[periodBoundaryModal.periodIndex + 1];

        if (!periodBefore || !periodAfter) return null;

        return (
          <PeriodBoundaryModal
            periodization={periodization}
            periodBefore={periodBefore}
            periodAfter={periodAfter}
            age={periodAfter.startAge}
            onClose={() => setPeriodBoundaryModal(null)}
          />
        );
      })()}

      {/* Bulk Event Creator Modal */}
      {showBulkCreator && (
        <BulkEventCreator
          onClose={() => setShowBulkCreator(false)}
          onCreate={handleBulkCreate}
          onExtendBranch={handleExtendBranchForBulk}
          ageMax={ageMax}
          selectedBranchX={selectedBranchX}
          selectedEdge={selectedEdge}
          branchSphere={selectedEdge ? (() => {
            const originNode = nodes.find((n) => n.id === selectedEdge.nodeId);
            return originNode?.sphere;
          })() : undefined}
        />
      )}

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
