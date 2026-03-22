// Timeline component with bulk event creation support
import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { flushSync } from 'react-dom';
import { Icon, type EventIconId } from '../components/Icon';
import { EVENT_ICON_MAP } from '../data/eventIcons';
import { useNotes } from '../hooks/useNotes';
import { PageLoader } from '../components/ui';
import { debugError, debugLog } from '../lib/debug';
import { buildAuthorizedHeaders } from '../lib/apiAuth';
import { buildGeminiApiKeyHeader, sanitizeGeminiApiKey } from '../lib/geminiKey';
import { reportAppError } from '../lib/errorHandler';
import { useAuthStore } from '../stores/useAuthStore';

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
  LINE_X_POSITION,
  MIN_SCALE,
  MAX_SCALE,
  SPHERE_META,
  BASE_NODE_RADIUS,
  MIN_NODE_RADIUS,
  MAX_NODE_RADIUS,
  BRANCH_CLICK_WIDTH,
  BRANCH_CLICK_WIDTH_UNSELECTED,
  DEFAULT_CURRENT_AGE,
  DEFAULT_AGE_MAX,
} from './timeline/constants';
import { screenToWorld, clamp, parseAge } from './timeline/utils';
import { IconPickerButton } from './timeline/components/IconPickerButton';
import { PeriodizationSelector } from './timeline/components/PeriodizationSelector';
import { PeriodBoundaryModal } from './timeline/components/PeriodBoundaryModal';
import { PERIODIZATIONS, getPeriodizationById } from './timeline/data/periodizations';
import { buildTimelineExportPayload, exportTimelineJSON, exportTimelinePNG, exportTimelinePDF } from './timeline/utils/exporters';
import { useTimelineState } from './timeline/hooks/useTimelineState';
import { useTimelineHistory } from './timeline/hooks/useTimelineHistory';
import { useDownloadMenu } from './timeline/hooks/useDownloadMenu';
import { useTimelineShortcuts } from './timeline/hooks/useTimelineShortcuts';
import { useTimelineForm } from './timeline/hooks/useTimelineForm';
import { useTimelineBirth } from './timeline/hooks/useTimelineBirth';
import { useTimelinePanZoom } from './timeline/hooks/useTimelinePanZoom';
import { useTimelineDragDrop } from './timeline/hooks/useTimelineDragDrop';
import { useTimelineBranch } from './timeline/hooks/useTimelineBranch';
import { useTimelineCRUD } from './timeline/hooks/useTimelineCRUD';
import { hasTimelineContent, normalizeImportedTimelineData } from './timeline/persistence';
import { BiographyImportModal, type BiographyProgressEvent } from './timeline/components/BiographyImportModal';
import { lazyWithReload } from '../lib/lazyWithReload';
const TimelineLeftPanel = lazy(() =>
  lazyWithReload(
    () => import('./timeline/components/TimelineLeftPanel').then((module) => ({ default: module.TimelineLeftPanel })),
    'TimelineLeftPanel'
  )
);
const TimelineRightPanel = lazy(() =>
  lazyWithReload(
    () => import('./timeline/components/TimelineRightPanel').then((module) => ({ default: module.TimelineRightPanel })),
    'TimelineRightPanel'
  )
);
const TimelineCanvas = lazy(() =>
  lazyWithReload(
    () => import('./timeline/components/TimelineCanvas').then((module) => ({ default: module.TimelineCanvas })),
    'TimelineCanvas'
  )
);
const BulkEventCreator = lazy(() =>
  lazyWithReload(
    () => import('./timeline/components/BulkEventCreator').then((module) => ({ default: module.BulkEventCreator })),
    'BulkEventCreator'
  )
);
const TimelineHelpModal = lazy(() =>
  lazyWithReload(
    () => import('./timeline/components/TimelineHelpModal').then((module) => ({ default: module.TimelineHelpModal })),
    'TimelineHelpModal'
  )
);

// ============ MAIN COMPONENT ============

export default function Timeline() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { createNote } = useNotes();
  const geminiApiKey = useAuthStore((state) => state.geminiApiKey);
  const [isMobile, setIsMobile] = useState(false);

  // ============ STATE HOOKS ============

  // Timeline state (data, transform, etc)
  const {
    currentAge,
    setCurrentAge,
    ageMax,
    setAgeMax,
    nodes,
    setNodes,
    edges,
    setEdges,
    birthDetails,
    setBirthDetails,
    selectedPeriodization,
    setSelectedPeriodization,
    saveStatus,
    transform,
    setTransform,
    viewportAge,
    setViewportAge,
    timelineCanvases,
    activeTimelineId,
    activeTimelineName,
    createTimelineCanvas,
    selectTimelineCanvas,
    replaceActiveTimeline,
  } = useTimelineState();

  // History (undo/redo)
  const {
    saveToHistory: pushHistory,
    undo: fetchUndoSnapshot,
    redo: fetchRedoSnapshot,
    moveBackward,
    moveForward,
    resetHistory,
    canUndo,
    canRedo,
    historyIndex,
    historyLength,
  } = useTimelineHistory();

  // ============ HANDLERS (must be declared before hooks that use them) ============

  const recordHistory = (customNodes?: NodeT[], customEdges?: EdgeT[], customBirth?: BirthDetails) => {
    pushHistory(customNodes ?? nodes, customEdges ?? edges, customBirth ?? birthDetails);
  };

  function undo() {
    const prev = fetchUndoSnapshot();
    if (!prev) return;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setBirthDetails(prev.birth);
    moveBackward();
  }

  function redo() {
    const next = fetchRedoSnapshot();
    if (!next) return;
    setNodes(next.nodes);
    setEdges(next.edges);
    setBirthDetails(next.birth);
    moveForward();
  }

  // ============ FORM HOOKS ============

  // Event form
  const formHook = useTimelineForm();

  // Birth details form
  const birthHook = useTimelineBirth({ birthDetails, setBirthDetails });

  // Download menu
  const {
    isOpen: downloadMenuOpen,
    toggle: toggleDownloadMenu,
    close: closeDownloadMenu,
    buttonRef: downloadButtonRef,
    menuRef: downloadMenuRef,
  } = useDownloadMenu();

  // Pan & Zoom
  const panZoomHook = useTimelinePanZoom({
    transform,
    setTransform,
    onBirthDeselect: () => birthHook.setBirthSelected(false),
  });

  // Drag & Drop
  const dragDropHook = useTimelineDragDrop({
    nodes,
    edges,
    setNodes,
    setEdges,
    transform,
    svgRef,
    onHistoryRecord: recordHistory,
  });

  // ============ LOCAL UI STATE ============

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [periodBoundaryModal, setPeriodBoundaryModal] = useState<{ periodIndex: number } | null>(null);
  const [showBulkCreator, setShowBulkCreator] = useState(false);
  const [showBiographyImportExpanded, setShowBiographyImportExpanded] = useState(false);
  const [biographySourceUrl, setBiographySourceUrl] = useState('');
  const [biographyImportLoading, setBiographyImportLoading] = useState(false);
  const [biographyImportError, setBiographyImportError] = useState<string | null>(null);
  const [biographyDiagnostics, setBiographyDiagnostics] = useState<string[]>([]);
  const [biographyMeta, setBiographyMeta] = useState<{
    source?: string;
    model?: string;
    nodes?: number;
    edges?: number;
  } | null>(null);
  const [biographyProgress, setBiographyProgress] = useState<BiographyProgressEvent | null>(null);
  const [biographyErrorDetail, setBiographyErrorDetail] = useState<string | null>(null);
  const [showBiographyModal, setShowBiographyModal] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    state: 'idle' | 'running' | 'success' | 'error';
    type: 'json' | 'png' | 'pdf' | null;
    message: string | null;
  }>({
    state: 'idle',
    type: null,
    message: null,
  });
  const [exportDiagnostics, setExportDiagnostics] = useState<string[]>([]);
  const [biographyUiSignals, setBiographyUiSignals] = useState({
    reactPointerdown: 0,
    reactClick: 0,
    reactTouchstart: 0,
    nativePointerdown: 0,
    nativeClick: 0,
    nativeTouchstart: 0,
    docPointerdown: 0,
    docClick: 0,
    docTouchstart: 0,
    open: 0,
    close: 0,
    submit: 0,
  });
  const [biographyLastUiSignal, setBiographyLastUiSignal] = useState<string | null>(null);

  const appendBiographyDiagnostic = useCallback((message: string, details?: unknown) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const suffix =
      details === undefined
        ? ''
        : ` | ${typeof details === 'string' ? details : JSON.stringify(details)}`;
    const entry = `${timestamp} ${message}${suffix}`;
    debugLog('[Timeline][Biography]', entry);
    setBiographyDiagnostics((prev) => [entry, ...prev].slice(0, 8));
  }, []);

  const appendExportDiagnostic = useCallback((message: string, details?: unknown) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const suffix =
      details === undefined
        ? ''
        : ` | ${typeof details === 'string' ? details : JSON.stringify(details)}`;
    const entry = `${timestamp} ${message}${suffix}`;
    debugLog('[Timeline][Export]', entry);
    setExportDiagnostics((prev) => [entry, ...prev].slice(0, 8));
  }, []);

  const recordBiographyUiSignal = useCallback(
    (
      signal:
        | 'reactPointerdown'
        | 'reactClick'
        | 'reactTouchstart'
        | 'nativePointerdown'
        | 'nativeClick'
        | 'nativeTouchstart'
        | 'docPointerdown'
        | 'docClick'
        | 'docTouchstart'
        | 'open'
        | 'close'
        | 'submit',
      details?: unknown
    ) => {
      setBiographyUiSignals((prev) => ({
        ...prev,
        [signal]: prev[signal] + 1,
      }));
      setBiographyLastUiSignal(signal);
      appendBiographyDiagnostic(`ui signal: ${signal}`, details);
    },
    [appendBiographyDiagnostic]
  );

  // Branch management
  const branchHook = useTimelineBranch({
    nodes,
    edges,
    setNodes,
    setEdges,
    ageMax,
    onHistoryRecord: recordHistory,
    onClearForm: formHook.clearForm,
  });

  // CRUD operations
  const crudHook = useTimelineCRUD({
    nodes,
    edges,
    ageMax,
    setNodes,
    setEdges,
    onHistoryRecord: recordHistory,
    onClearForm: formHook.clearForm,
    onSetSelectedId: setSelectedId,
    onAfterClearAll: () => {
      setBirthDetails({});
      setSelectedPeriodization(null);
      setCurrentAge(DEFAULT_CURRENT_AGE);
      setAgeMax(DEFAULT_AGE_MAX);
    },
  });

  // ============ COMPUTED VALUES ============

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedId), [nodes, selectedId]);
  const formattedCurrentAge = useMemo(() => {
    if (Number.isNaN(currentAge)) return '0';
    return Number.isInteger(currentAge) ? `${currentAge}` : currentAge.toFixed(1);
  }, [currentAge]);
  const currentYearLabel = useMemo(() => {
    if (birthHook.birthBaseYear === null || Number.isNaN(currentAge)) return null;
    return birthHook.birthBaseYear + Math.round(currentAge);
  }, [birthHook.birthBaseYear, currentAge]);
  const exportFilenamePrefix = useMemo(() => {
    const now = new Date();
    const iso = now.toISOString();
    return `timeline-${iso.split('T')[0]}`;
  }, []);
  const activeTimelineHasContent = useMemo(
    () =>
      hasTimelineContent({
        currentAge,
        ageMax,
        nodes,
        edges,
        birthDetails,
        selectedPeriodization,
      }),
    [ageMax, birthDetails, currentAge, edges, nodes, selectedPeriodization]
  );

  const resetTransientTimelineUi = useCallback(() => {
    formHook.clearForm();
    setSelectedId(null);
    branchHook.setSelectedBranchX(null);
    birthHook.setBirthSelected(false);
    setPeriodBoundaryModal(null);
    setShowBulkCreator(false);
    setShowBiographyImportExpanded(false);
    setBiographyImportError(null);
    setBiographySourceUrl('');
    setBiographyDiagnostics([]);
    setExportStatus({
      state: 'idle',
      type: null,
      message: null,
    });
    setExportDiagnostics([]);
    setBiographyUiSignals({
      reactPointerdown: 0,
      reactClick: 0,
      reactTouchstart: 0,
      nativePointerdown: 0,
      nativeClick: 0,
      nativeTouchstart: 0,
      docPointerdown: 0,
      docClick: 0,
      docTouchstart: 0,
      open: 0,
      close: 0,
      submit: 0,
    });
    setBiographyLastUiSignal(null);
    resetHistory();
  }, [birthHook.setBirthSelected, branchHook.setSelectedBranchX, formHook.clearForm, resetHistory]);

  useEffect(() => {
    appendBiographyDiagnostic('render state', {
      showBiographyImportExpanded,
      biographyImportLoading,
      hasError: Boolean(biographyImportError),
      sourceUrlLength: biographySourceUrl.length,
      activeTimelineId,
      activeTimelineHasContent,
    });
  }, [
    activeTimelineHasContent,
    activeTimelineId,
    appendBiographyDiagnostic,
    biographyImportError,
    biographyImportLoading,
    biographySourceUrl.length,
    showBiographyImportExpanded,
  ]);

  // Auto-pickup sphere when selecting branch
  useEffect(() => {
    if (formHook.formEventId !== null) return;
    if (branchHook.selectedBranchX !== null) {
      const selectedEdge = edges.find((e) => e.x === branchHook.selectedBranchX);
      if (selectedEdge) {
        const originNode = nodes.find((n) => n.id === selectedEdge.nodeId);
        if (originNode && originNode.sphere) {
          formHook.setFormEventSphere(originNode.sphere);
        }
      }
    }
  }, [branchHook.selectedBranchX, edges, nodes, formHook.formEventId]);

  useEffect(() => {
    resetTransientTimelineUi();
  }, [activeTimelineId, resetTransientTimelineUi]);

  const worldWidth = useMemo(() => {
    const nodeXs = nodes.map(n => n.x ?? LINE_X_POSITION);
    const edgeXs = edges.map(e => e.x);
    const allX = [...nodeXs, ...edgeXs, LINE_X_POSITION];
    const maxX = Math.max(...allX);
    const minX = Math.min(...allX);
    // Ensure space for labels on both sides (~600px margin)
    const needed = Math.max(maxX + 600, LINE_X_POSITION + (LINE_X_POSITION - minX) + 600);
    return Math.max(4000, Math.ceil(needed / 500) * 500);
  }, [nodes, edges]);
  const worldHeight = ageMax * YEAR_PX + 500;
  const adaptiveRadius = clamp(BASE_NODE_RADIUS / transform.k, MIN_NODE_RADIUS, MAX_NODE_RADIUS);

  // ============ ADDITIONAL HANDLERS ============

  const handleDownload = async (type: 'json' | 'png' | 'pdf') => {
    closeDownloadMenu();
    const exportPayload = buildTimelineExportPayload({
      currentAge,
      ageMax,
      nodes,
      edges,
      birthDetails,
      selectedPeriodization,
    });
    setExportStatus({
      state: 'running',
      type,
      message: null,
    });
    appendExportDiagnostic('export requested', {
      type,
      hasSvg: Boolean(svgRef.current),
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });

    try {
      if (type === 'json') {
        exportTimelineJSON(exportPayload, `${exportFilenamePrefix}.json`);
        setExportStatus({
          state: 'success',
          type,
          message: 'JSON выгружен',
        });
        appendExportDiagnostic('export complete', { type });
        return;
      }
      if (!svgRef.current) throw new Error('SVG not ready');
      if (type === 'png') {
        await exportTimelinePNG(svgRef.current, `${exportFilenamePrefix}.png`);
        setExportStatus({
          state: 'success',
          type,
          message: 'PNG выгружен',
        });
        appendExportDiagnostic('export complete', { type });
        return;
      }
      const periodization = selectedPeriodization ? getPeriodizationById(selectedPeriodization) ?? null : null;
      await exportTimelinePDF(svgRef.current, exportPayload, periodization, `${exportFilenamePrefix}.pdf`);
      setExportStatus({
        state: 'success',
        type,
        message: 'PDF выгружен',
      });
      appendExportDiagnostic('export complete', { type });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось выполнить экспорт.';
      setExportStatus({
        state: 'error',
        type,
        message,
      });
      appendExportDiagnostic('export failed', {
        type,
        message,
      });
      debugError('Export failed', error);
    }
  };

  const handleViewportAgeChange = (age: number) => {
    setViewportAge(age);
    const targetY = worldHeight - age * YEAR_PX;
    setTransform((prev) => ({ ...prev, y: window.innerHeight / 2 - targetY * prev.k }));
  };

  const handleScaleChange = (newScale: number) => {
    setTransform((prev) => {
      const lineScreenX = prev.x + LINE_X_POSITION * prev.k;
      return {
        k: newScale,
        x: lineScreenX - LINE_X_POSITION * newScale,
        y: prev.y + (window.innerHeight / 2 - prev.y) * (1 - newScale / prev.k),
      };
    });
  };

  const handleNodeClick = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setSelectedId(nodeId);
    birthHook.setBirthSelected(false);
    formHook.setFormFromNode(node);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragDropHook.draggingNodeId) {
      dragDropHook.handleNodeDragMove(e);
      return;
    }
    panZoomHook.handlePointerMove(e);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    dragDropHook.handleNodeDragEnd();
    panZoomHook.handlePointerUp(e);
  };

  // ============ KEYBOARD SHORTCUTS ============

  useTimelineShortcuts({
    selectedId,
    canUndo: () => canUndo,
    canRedo: () => canRedo,
    onUndo: undo,
    onRedo: redo,
    onDelete: crudHook.deleteNode,
    onEscape: () => {
      formHook.clearForm();
      setSelectedId(null);
      branchHook.setSelectedBranchX(null);
      birthHook.setBirthSelected(false);
    },
  });

  // ============ ADDITIONAL HANDLERS ============

  const handlePeriodBoundaryClick = (periodIndex: number) => {
    setPeriodBoundaryModal({ periodIndex });
  };

  const handleSelectBranch = (x: number) => {
    branchHook.handleSelectBranch(x);
    birthHook.setBirthSelected(false);
  };

  const handleClearSelection = () => {
    branchHook.setSelectedBranchX(null);
    birthHook.setBirthSelected(false);
  };

  const handleOpenBulkCreator = () => {
    setShowBulkCreator(true);
  };

  const handleOpenBiographyImport = () => {
    debugLog('[Timeline] Open biography import');
    recordBiographyUiSignal('open');
    appendBiographyDiagnostic('open requested');
    setBiographyImportError(null);
    setBiographyMeta(null);
    setShowBiographyImportExpanded(true);
  };

  const handleCloseBiographyImport = () => {
    if (biographyImportLoading) return;
    debugLog('[Timeline] Close biography import');
    recordBiographyUiSignal('close');
    appendBiographyDiagnostic('close requested');
    setShowBiographyImportExpanded(false);
    setBiographyImportError(null);
    setBiographySourceUrl('');
  };

  const handleBiographySourceUrlChange = (value: string) => {
    debugLog('[Timeline] Biography source url changed', value);
    appendBiographyDiagnostic('source url changed', value);
    setBiographySourceUrl(value);
    if (biographyImportError) {
      setBiographyImportError(null);
    }
  };

  const handleImportBiography = async () => {
    const sourceUrl = biographySourceUrl.trim();
    const geminiApiKeyOverride = sanitizeGeminiApiKey(geminiApiKey);
    debugLog('[Timeline] Biography import submit', {
      sourceUrl,
      activeTimelineId,
      activeTimelineName,
      hasGeminiApiKeyOverride: Boolean(geminiApiKeyOverride),
    });
    recordBiographyUiSignal('submit', {
      sourceUrl,
      activeTimelineId,
      activeTimelineName,
    });
    appendBiographyDiagnostic('submit requested', {
      sourceUrl,
      activeTimelineId,
      activeTimelineName,
    });
    if (!sourceUrl) {
      setBiographyImportError('Укажите ссылку на статью Wikipedia.');
      debugError('[Timeline] Biography import blocked: empty url');
      appendBiographyDiagnostic('submit blocked: empty url');
      return;
    }

    setBiographyImportLoading(true);
    setBiographyImportError(null);
    setBiographyErrorDetail(null);
    setBiographyProgress(null);
    setBiographyMeta(null);
    flushSync(() => {
      setShowBiographyModal(true);
    });
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    const buildStepHeaders = async (apiKeyOverride: string | undefined) =>
      buildAuthorizedHeaders({
        'Content-Type': 'application/json',
        ...buildGeminiApiKeyHeader(apiKeyOverride),
      });

    const callStep = async (body: Record<string, unknown>, apiKeyOverride: string | undefined) => {
      let response: Response;
      try {
        const headers = await buildStepHeaders(apiKeyOverride);
        response = await fetch('/api/timeline-biography', {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
      } catch (fetchError) {
        // Browser rejects special chars in header values — retry without BYOK key
        if (apiKeyOverride && fetchError instanceof SyntaxError && /expected pattern/i.test(fetchError.message)) {
          debugLog('[Timeline] Retrying step without BYOK header after syntax error');
          const headers = await buildStepHeaders(undefined);
          response = await fetch('/api/timeline-biography', {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
        } else {
          throw fetchError;
        }
      }
      // Handle non-JSON responses (e.g. Vercel 504 timeout HTML page)
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        const status = response.status;
        const hint = status === 504
          ? `Серверная функция не уложилась в таймаут (шаг ${body.step ?? '?'}). Попробуйте ещё раз — повторный запуск обычно быстрее.`
          : `Сервер вернул неожиданный ответ (HTTP ${status}).`;
        setBiographyErrorDetail(hint);
        throw new Error(hint);
      }
      const data = await response.json() as {
        ok?: boolean;
        error?: string;
        detail?: string;
        stack?: string;
        jobId?: string;
        subjectName?: string;
        canvasName?: string;
        factsCount?: number;
        rawTextChars?: number;
        model?: string;
        timeline?: TimelineData;
        meta?: {
          model?: string;
          timelineStats?: { nodes?: number; edges?: number };
        };
      };
      if (!response.ok || !data.ok) {
        const detailParts = [
          data.detail && `Ошибка: ${data.detail}`,
          data.stack && `\nStack trace:\n${data.stack}`,
        ].filter(Boolean);
        if (detailParts.length > 0) {
          setBiographyErrorDetail(detailParts.join('\n'));
        }
        throw new Error(data.error || `Ошибка на шаге ${body.step ?? 1}`);
      }
      return data;
    };

    try {
      debugLog('[Timeline] Biography import request start', { sourceUrl });
      appendBiographyDiagnostic('request start', { sourceUrl });

      // Step 1: Extract facts from Wikipedia
      setBiographyProgress({ step: 1, total: 4, label: 'Извлечение фактов из Wikipedia' });
      const step1 = await callStep(
        { step: 1, sourceUrl, canvasId: activeTimelineId ?? '' },
        geminiApiKeyOverride,
      );
      appendBiographyDiagnostic('step 1 done', { jobId: step1.jobId, facts: step1.factsCount });
      setBiographyProgress({ step: 1, total: 4, label: 'Извлечение фактов из Wikipedia', detail: `${step1.factsCount} фактов, ${step1.subjectName}` });

      // Step 2: Gap-filling
      setBiographyProgress({ step: 2, total: 4, label: 'Добивочный проход (gap-filling)' });
      const step2 = await callStep(
        { step: 2, jobId: step1.jobId },
        geminiApiKeyOverride,
      );
      appendBiographyDiagnostic('step 2 done', { jobId: step1.jobId, facts: step2.factsCount });
      setBiographyProgress({ step: 2, total: 4, label: 'Добивочный проход (gap-filling)', detail: `${step2.factsCount} фактов после добивки` });

      // Step 3: Annotation + ranking
      setBiographyProgress({ step: 3, total: 4, label: 'Аннотация и ранжирование' });
      const step3 = await callStep(
        { step: 3, jobId: step1.jobId },
        geminiApiKeyOverride,
      );
      appendBiographyDiagnostic('step 3 done', { jobId: step1.jobId, facts: step3.factsCount });
      setBiographyProgress({ step: 3, total: 4, label: 'Аннотация и ранжирование', detail: `${step3.factsCount} фактов обработано` });

      // Step 4: Composition + render
      setBiographyProgress({ step: 4, total: 4, label: 'Композиция таймлайна' });
      const step4 = await callStep(
        { step: 4, jobId: step1.jobId },
        geminiApiKeyOverride,
      );
      appendBiographyDiagnostic('step 4 done', { jobId: step1.jobId, nodes: step4.meta?.timelineStats?.nodes });

      if (!step4.timeline) {
        throw new Error('Сервер не вернул данные таймлайна.');
      }

      setBiographyMeta({
        model: step4.meta?.model,
        nodes: step4.meta?.timelineStats?.nodes,
        edges: step4.meta?.timelineStats?.edges,
      });

      replaceActiveTimeline(step4.timeline, {
        name: step4.canvasName || step4.subjectName,
      });
      resetTransientTimelineUi();
      setShowBiographyImportExpanded(false);
      setBiographySourceUrl('');
      debugLog('[Timeline] Biography import applied successfully', { jobId: step1.jobId });
      appendBiographyDiagnostic('timeline applied', { jobId: step1.jobId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось построить таймлайн по биографии.';
      reportAppError({ message: 'Ошибка импорта биографии в таймлайн', error, context: 'Timeline.handleImportBiography' });
      setBiographyImportError(message);
      setBiographyErrorDetail((prev) => prev ?? (error instanceof Error ? error.message : String(error)));
      setBiographyMeta(null);
      debugError('Timeline biography import failed', { error, sourceUrl });
      appendBiographyDiagnostic('request failed', message);
    } finally {
      setBiographyImportLoading(false);
      appendBiographyDiagnostic('request finished');
    }
  };

  const handleImportTimelineJsonFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    debugLog('[Timeline] Timeline JSON import submit', {
      fileName: file.name,
      fileSize: file.size,
      activeTimelineId,
      activeTimelineName,
    });
    appendBiographyDiagnostic('json import requested', {
      fileName: file.name,
      fileSize: file.size,
    });
    setBiographyImportLoading(true);
    setBiographyImportError(null);

    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText) as unknown;
      const normalizedTimeline = normalizeImportedTimelineData(parsed);

      replaceActiveTimeline(normalizedTimeline, {
        name: file.name.replace(/\.json$/i, '').trim() || activeTimelineName,
      });
      resetTransientTimelineUi();
      setShowBiographyImportExpanded(false);
      debugLog('[Timeline] Timeline JSON import applied successfully', {
        fileName: file.name,
        nodes: normalizedTimeline.nodes.length,
        edges: normalizedTimeline.edges.length,
      });
      appendBiographyDiagnostic('json timeline applied', {
        fileName: file.name,
        nodes: normalizedTimeline.nodes.length,
        edges: normalizedTimeline.edges.length,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Не удалось загрузить JSON-файл таймлайна.';
      setBiographyImportError(message);
      debugError('Timeline JSON import failed', error);
      appendBiographyDiagnostic('json import failed', message);
    } finally {
      setBiographyImportLoading(false);
      appendBiographyDiagnostic('json import finished');
    }
  };

  const handleFormSubmit = () => {
    crudHook.handleFormSubmit(
      {
        id: formHook.formEventId,
        age: formHook.formEventAge,
        label: formHook.formEventLabel,
        notes: formHook.formEventNotes,
        sphere: formHook.formEventSphere,
        isDecision: formHook.formEventIsDecision,
        icon: formHook.formEventIcon,
      },
      branchHook.selectedBranchX
    );
  };

  // ============ RENDER ============

  const cursorClass = panZoomHook.isPanning ? 'cursor-grabbing' : 'cursor-grab';
  const readOnly = isMobile;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-gradient-to-br from-slate-50 to-white overflow-hidden"
    >
      {readOnly && (
        <div className="absolute top-4 left-4 right-4 z-10 sm:hidden">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">Таймлайн в режиме просмотра</p>
                <p className="text-xs text-slate-500">
                  Редактирование доступно в веб-версии на компьютере.
                </p>
              </div>
              <Link
                to="/profile"
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Выход
              </Link>
            </div>
          </div>
        </div>
      )}

      {!readOnly && (
        <Suspense fallback={<PageLoader label="Загрузка панели навигации..." />}>
          <TimelineLeftPanel
            currentAge={currentAge}
            ageMax={ageMax}
            viewportAge={viewportAge}
            scale={transform.k}
            nodes={nodes}
            timelineCanvases={timelineCanvases}
            activeTimelineId={activeTimelineId}
            activeTimelineName={activeTimelineName}
            showBiographyImportAction={!activeTimelineHasContent}
            biographyImportExpanded={showBiographyImportExpanded}
            biographyImportLoading={biographyImportLoading}
            biographySourceUrl={biographySourceUrl}
            biographyImportError={biographyImportError}
            biographyDiagnostics={biographyDiagnostics}
            biographyMeta={biographyMeta}
            biographyUiSignals={biographyUiSignals}
            biographyLastUiSignal={biographyLastUiSignal}
            exportStatus={exportStatus}
            exportDiagnostics={exportDiagnostics}
            downloadMenuOpen={downloadMenuOpen}
            downloadButtonRef={downloadButtonRef}
            downloadMenuRef={downloadMenuRef}
            onCurrentAgeChange={(value) => setCurrentAge(value)}
            onViewportAgeChange={handleViewportAgeChange}
            onScaleChange={handleScaleChange}
            onCreateTimeline={createTimelineCanvas}
            onSelectTimeline={selectTimelineCanvas}
            onDownloadMenuToggle={toggleDownloadMenu}
            onDownloadSelect={handleDownload}
            onClearAll={crudHook.handleClearAll}
            onOpenBiographyImport={handleOpenBiographyImport}
            onCloseBiographyImport={handleCloseBiographyImport}
            onBiographySourceUrlChange={handleBiographySourceUrlChange}
            onSubmitBiographyImport={handleImportBiography}
            onImportTimelineJsonFile={handleImportTimelineJsonFile}
            onBiographyDiagnostic={appendBiographyDiagnostic}
            onBiographyUiSignal={recordBiographyUiSignal}
          />
        </Suspense>
      )}

      <Suspense fallback={<PageLoader label="Подгрузка холста..." />}>
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
          selectedBranchX={branchHook.selectedBranchX}
          draggingNodeId={dragDropHook.draggingNodeId}
          birthSelected={birthHook.birthSelected}
          birthBaseYear={birthHook.birthBaseYear}
          formattedCurrentAge={formattedCurrentAge}
          currentYearLabel={currentYearLabel}
          cursorClass={cursorClass}
          onWheel={panZoomHook.handleWheel}
          onPointerDown={panZoomHook.handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onNodeClick={readOnly ? () => {} : handleNodeClick}
          onNodeDragStart={readOnly ? () => {} : dragDropHook.handleNodeDragStart}
          onPeriodBoundaryClick={readOnly ? () => {} : handlePeriodBoundaryClick}
          onSelectBranch={readOnly ? () => {} : handleSelectBranch}
          onClearSelection={readOnly ? () => {} : handleClearSelection}
          onSelectBirth={readOnly ? () => {} : birthHook.handleBirthSelect}
        />
      </Suspense>

      {!readOnly && (
        <Suspense fallback={<PageLoader label="Загрузка панели деталей..." />}>
          <TimelineRightPanel
          saveStatus={saveStatus}
          selectedPeriodization={selectedPeriodization}
          onPeriodizationChange={setSelectedPeriodization}
          birthSelected={birthHook.birthSelected}
          birthFormDate={birthHook.birthFormDate}
          birthFormPlace={birthHook.birthFormPlace}
          birthFormNotes={birthHook.birthFormNotes}
          onBirthDateChange={birthHook.setBirthFormDate}
          onBirthPlaceChange={birthHook.setBirthFormPlace}
          onBirthNotesChange={birthHook.setBirthFormNotes}
          onBirthSave={() =>
            birthHook.handleBirthSave((birth) => {
              recordHistory(undefined, undefined, birth);
            })
          }
          onBirthCancel={birthHook.handleBirthCancel}
          birthHasChanges={birthHook.birthHasChanges}
          formEventId={formHook.formEventId}
          formEventAge={formHook.formEventAge}
          onFormEventAgeChange={formHook.setFormEventAge}
          formEventLabel={formHook.formEventLabel}
          onFormEventLabelChange={formHook.setFormEventLabel}
          formEventSphere={formHook.formEventSphere}
          onFormEventSphereChange={formHook.setFormEventSphere}
          formEventIsDecision={formHook.formEventIsDecision}
          onFormEventIsDecisionChange={formHook.setFormEventIsDecision}
          formEventIcon={formHook.formEventIcon}
          onFormEventIconChange={formHook.setFormEventIcon}
          formEventNotes={formHook.formEventNotes}
          onFormEventNotesChange={formHook.setFormEventNotes}
          hasFormChanges={formHook.hasFormChanges}
          onEventFormSubmit={handleFormSubmit}
          onClearForm={formHook.clearForm}
          onDeleteEvent={crudHook.deleteNode}
          createNote={createNote}
          selectedBranchX={branchHook.selectedBranchX}
          selectedEdge={branchHook.selectedEdge}
          branchYears={branchHook.branchYears}
          onBranchYearsChange={branchHook.setBranchYears}
          onUpdateBranchLength={branchHook.updateBranchLength}
          onDeleteBranch={branchHook.deleteBranch}
          onHideBranchEditor={branchHook.handleHideBranchEditor}
          onExtendBranch={() => branchHook.extendBranch(selectedNode)}
          selectedNode={selectedNode}
          edges={edges}
          ageMax={ageMax}
          onOpenBulkCreator={handleOpenBulkCreator}
          undo={undo}
          redo={redo}
          historyIndex={historyIndex}
          historyLength={historyLength}
          />
        </Suspense>
      )}

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
      {showBulkCreator && !readOnly && (
        <Suspense fallback={<PageLoader label="Подгрузка массового события..." />}>
          <BulkEventCreator
            onClose={() => setShowBulkCreator(false)}
            onCreate={crudHook.handleBulkCreate}
            onExtendBranch={branchHook.handleExtendBranchForBulk}
            ageMax={ageMax}
            selectedBranchX={branchHook.selectedBranchX}
            selectedEdge={branchHook.selectedEdge}
            branchSphere={branchHook.selectedEdge ? (() => {
              const originNode = nodes.find((n) => n.id === branchHook.selectedEdge!.nodeId);
              return originNode?.sphere;
            })() : undefined}
          />
        </Suspense>
      )}
      {/* Help Modal */}
      {!readOnly && (
        <Suspense fallback={<PageLoader label="Загрузка справки..." />}>
          <TimelineHelpModal open={showHelp} onClose={() => setShowHelp(false)} />
        </Suspense>
      )}
      <BiographyImportModal
        isOpen={showBiographyModal}
        loading={biographyImportLoading}
        error={biographyImportError}
        errorDetail={biographyErrorDetail}
        meta={biographyMeta}
        progress={biographyProgress}
        onClose={() => setShowBiographyModal(false)}
      />
    </motion.div>
  );
}
