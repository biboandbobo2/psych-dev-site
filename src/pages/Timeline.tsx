// Timeline component with bulk event creation support
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  NODE_RADIUS,
  MIN_SCALE,
  MAX_SCALE,
  SPHERE_META,
  SAVE_DEBOUNCE_MS,
} from './timeline/constants';
import { screenToWorld, clamp, parseAge, removeUndefined } from './timeline/utils';
import { IconPickerButton } from './timeline/components/IconPickerButton';
import { PeriodizationSelector } from './timeline/components/PeriodizationSelector';
import { PeriodizationLayer } from './timeline/components/PeriodizationLayer';
import { PeriodBoundaryModal } from './timeline/components/PeriodBoundaryModal';
import { BulkEventCreator } from './timeline/components/BulkEventCreator';
import { SaveEventAsNoteButton } from './timeline/components/SaveEventAsNoteButton';
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

  // Adaptive node radius based on zoom level
  // При отдалении (k маленький) - кружки больше, при приближении - меньше
  // Используем обратную пропорцию: radius = baseRadius / k
  const baseRadius = 15; // Уменьшено на 1/4 (было 20)
  const adaptiveRadius = clamp(baseRadius / transform.k, 9, 38);

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
      {/* Left controls */}
      <div className="fixed top-4 left-4 z-40">
        <aside
          className="w-36 space-y-3 rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-xl backdrop-blur-md sm:w-40"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          <div className="flex items-center gap-2 pr-6">
            <Link
              to="/profile"
              className="flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 px-3 py-2 text-amber-900 shadow-md transition-all duration-200 hover:border-amber-300 hover:from-amber-100 hover:to-yellow-100"
            >
              <span className="text-sm">←</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide">Выход</span>
            </Link>
            <div className="relative">
              <button
                type="button"
                ref={downloadButtonRef}
                title="Скачать таймлайн"
                onClick={() => setDownloadMenuOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:text-slate-900"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M12 3v12" />
                  <path d="M7.5 10.5 12 15l4.5-4.5" />
                  <path d="M5 17h14" />
                </svg>
              </button>

              {downloadMenuOpen && (
                <div
                  ref={downloadMenuRef}
                  className="absolute right-0 top-full z-50 mt-3 w-40 rounded-2xl border border-slate-200 bg-white shadow-lg backdrop-blur-md"
                >
                  <div className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                    Скачать
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => handleDownload('json')}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload('png')}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      PNG (изображение)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload('pdf')}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      PDF (отчёт)
                    </button>
                  </div>
                  <div className="h-2" />
                </div>
              )}
            </div>
          </div>

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
              onBoundaryClick={(periodIndex) => {
                setPeriodBoundaryModal({ periodIndex });
              }}
            />

            {/* Time scale - vertical, on the left of life line */}
            {Array.from({ length: Math.floor(ageMax / 5) + 1 }, (_, i) => i * 5).map((age) => {
              const rightLabel = birthBaseYear !== null ? `${birthBaseYear + age}` : null;

              return (
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
                    x={LINE_X_POSITION - 35}
                    y={worldHeight - age * YEAR_PX + 5}
                    fontSize={42}
                    textAnchor="end"
                    fill="#475569"
                    fontWeight="500"
                    fontFamily="Georgia, serif"
                  >
                    {age}
                  </text>
                  {rightLabel && (
                    <text
                      x={LINE_X_POSITION + 35}
                      y={worldHeight - age * YEAR_PX + 5}
                      fontSize={42}
                      textAnchor="start"
                      fill="#475569"
                      fontWeight="500"
                      fontFamily="Georgia, serif"
                    >
                      {rightLabel}
                    </text>
                  )}
                </g>
              );
            })}

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
                setBirthSelected(false);
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
                setBirthSelected(false);
              }}
              className="cursor-pointer"
              style={{ cursor: 'pointer' }}
            />

            {/* Birth marker */}
            <g
              onClick={(e) => {
                e.stopPropagation();
                selectBirth();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="cursor-pointer"
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={LINE_X_POSITION}
                cy={worldHeight}
                r={adaptiveRadius * 0.8}
                fill="#ffffff"
                stroke={birthSelected ? '#38bdf8' : '#0f172a'}
                strokeWidth={birthSelected ? 5 : 3}
              />
              <text
                x={LINE_X_POSITION}
                y={worldHeight + adaptiveRadius * 1.8}
                fontSize={16}
                textAnchor="middle"
                fontWeight={birthSelected ? '700' : '600'}
                fill={birthSelected ? '#0ea5e9' : '#0f172a'}
                fontFamily="Georgia, serif"
              >
                👶 Рождение
              </text>
            </g>

            {/* Current age marker */}
            <g>
              <circle cx={LINE_X_POSITION} cy={worldHeight - currentAge * YEAR_PX} r={adaptiveRadius * 0.5} fill="#3b82f6" />
              <text
                x={LINE_X_POSITION - adaptiveRadius - 12}
                y={worldHeight - currentAge * YEAR_PX + 4}
                fontSize={16}
                fontWeight="600"
                fill="#1d4ed8"
                textAnchor="end"
                fontFamily="Georgia, serif"
              >
                Сейчас · {formattedCurrentAge} лет
              </text>
              {currentYearLabel !== null && (
                <text
                  x={LINE_X_POSITION + adaptiveRadius + 12}
                  y={worldHeight - currentAge * YEAR_PX + 4}
                  fontSize={16}
                  fontWeight="600"
                  fill="#1d4ed8"
                  textAnchor="start"
                  fontFamily="Georgia, serif"
                >
                  {currentYearLabel}
                </text>
              )}
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
                      setBirthSelected(false);
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
                          data-icon-id={node.iconId ?? undefined}
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
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>Таймлайн жизни</h2>
              <div className="flex items-center gap-2">
                {/* Periodization selector */}
                <PeriodizationSelector value={selectedPeriodization} onChange={setSelectedPeriodization} />
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
          </div>

          {birthSelected && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-amber-900" style={{ fontFamily: 'Georgia, serif' }}>
                  Профиль рождения
                </h3>
                <button
                  onClick={handleBirthCancel}
                  className="px-2 py-1 text-xs rounded-lg bg-white/80 text-amber-700 hover:bg-white transition"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Закрыть
                </button>
              </div>

              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleBirthSave();
                }}
              >
                <label className="block">
                  <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
                    Дата рождения
                  </span>
                  <input
                    type="date"
                    value={birthFormDate}
                    onChange={(e) => setBirthFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition text-sm bg-white"
                    style={{ fontFamily: 'Georgia, serif' }}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
                    Город / место
                  </span>
                  <input
                    type="text"
                    value={birthFormPlace}
                    onChange={(e) => setBirthFormPlace(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition text-sm bg-white"
                    placeholder="Например: Москва"
                    style={{ fontFamily: 'Georgia, serif' }}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
                    Обстоятельства
                  </span>
                  <textarea
                    value={birthFormNotes}
                    onChange={(e) => setBirthFormNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition text-sm bg-white resize-none"
                    rows={3}
                    placeholder="Добавьте детали..."
                    style={{ fontFamily: 'Georgia, serif' }}
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!birthHasChanges}
                    className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBirthFormDate('');
                      setBirthFormPlace('');
                      setBirthFormNotes('');
                    }}
                    className="px-4 py-2.5 bg-white/80 text-amber-700 rounded-xl border border-amber-200 hover:bg-white transition text-sm"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Очистить
                  </button>
                </div>
              </form>
            </div>
          )}

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

              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center gap-2 p-2.5 rounded-xl border border-green-200 hover:bg-white/50 transition cursor-pointer bg-white/30">
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
                <SaveEventAsNoteButton
                  eventTitle={formEventLabel}
                  eventAge={formEventAge}
                  eventNotes={formEventNotes}
                  eventSphere={formEventSphere}
                  createNote={createNote}
                  onSuccess={() => {
                    // Показываем уведомление об успешном сохранении
                    alert('Событие сохранено в заметки!');
                  }}
                />
              </div>

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

            {/* Bulk event creator button - only show when not editing */}
            {!formEventId && (
              <button
                type="button"
                onClick={() => setShowBulkCreator(true)}
                className="w-full mt-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-blue-700 rounded-xl hover:from-blue-100 hover:to-cyan-100 transition font-medium text-xs"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                📝 Создать много событий
              </button>
            )}

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
                      <div className="flex items-center gap-2">
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
                          type="button"
                          onClick={updateBranchLength}
                          className="px-3 py-2 bg-purple-400 hover:bg-purple-500 text-white rounded-xl transition text-xs font-medium"
                          style={{ fontFamily: 'Georgia, serif' }}
                          title="Применить"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={deleteBranch}
                          className="px-3 py-2 bg-red-200 hover:bg-red-300 text-red-800 rounded-xl transition text-xs font-medium"
                          style={{ fontFamily: 'Georgia, serif' }}
                          title="Удалить ветку"
                        >
                          🗑️
                        </button>
                      </div>
                    </label>
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

                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center gap-2 p-2.5 rounded-xl border border-blue-200 hover:bg-white/50 transition cursor-pointer bg-white/30">
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
                    <SaveEventAsNoteButton
                      eventTitle={formEventLabel}
                      eventAge={formEventAge}
                      eventNotes={formEventNotes}
                      eventSphere={formEventSphere}
                      createNote={createNote}
                      onSuccess={() => {
                        // Показываем уведомление об успешном сохранении
                        alert('Событие сохранено в заметки!');
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-4 py-2.5 bg-blue-400 text-white rounded-xl hover:bg-blue-500 transition font-medium text-sm"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    + Добавить событие
                  </button>
                </form>

                {/* Bulk event creator button for branch */}
                <button
                  type="button"
                  onClick={() => setShowBulkCreator(true)}
                  className="w-full mt-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-blue-700 rounded-xl hover:from-blue-100 hover:to-cyan-100 transition font-medium text-xs"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  📝 Создать много событий
                </button>
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

      {/* Periodization Boundary Modal */}
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
