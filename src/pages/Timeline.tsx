// Timeline component with bulk event creation support
import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useNotes } from '../hooks/useNotes';
import { PageLoader } from '../components/ui';

// Импорт типов, констант, утилит и компонентов из модулей
import type { NodeT, BirthDetails, EdgeT } from './timeline/types';
import {
  YEAR_PX,
  LINE_X_POSITION,
  BASE_NODE_RADIUS,
  MIN_NODE_RADIUS,
  MAX_NODE_RADIUS,
} from './timeline/constants';
import { clamp } from './timeline/utils';
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
import { useIsMobile } from './timeline/hooks/useIsMobile';
import { handleTimelineDownload } from './timeline/utils/handleTimelineDownload';
import { MobileReadOnlyBanner } from './timeline/components/MobileReadOnlyBanner';
import { PeriodBoundaryModalContainer } from './timeline/components/PeriodBoundaryModalContainer';
import {
  BulkEventCreator,
  TimelineCanvas,
  TimelineHelpModal,
  TimelineLeftPanel,
  TimelineRightPanel,
} from './timeline/lazyComponents';

export default function Timeline() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { createNote } = useNotes();
  const isMobile = useIsMobile();

  // ============ STATE HOOKS ============

  const {
    currentAge,
    setCurrentAge,
    ageMax,
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
  } = useTimelineState();

  const {
    saveToHistory: pushHistory,
    undo: fetchUndoSnapshot,
    redo: fetchRedoSnapshot,
    moveBackward,
    moveForward,
    canUndo,
    canRedo,
    historyIndex,
    historyLength,
  } = useTimelineHistory();

  // ============ HANDLERS (must be declared before hooks that use them) ============

  const recordHistory = (
    customNodes?: NodeT[],
    customEdges?: EdgeT[],
    customBirth?: BirthDetails,
  ) => {
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

  const formHook = useTimelineForm();
  const birthHook = useTimelineBirth({ birthDetails, setBirthDetails });

  const {
    isOpen: downloadMenuOpen,
    toggle: toggleDownloadMenu,
    close: closeDownloadMenu,
    buttonRef: downloadButtonRef,
    menuRef: downloadMenuRef,
  } = useDownloadMenu();

  const panZoomHook = useTimelinePanZoom({
    transform,
    setTransform,
    onBirthDeselect: () => birthHook.setBirthSelected(false),
  });

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
  const [periodBoundaryModal, setPeriodBoundaryModal] = useState<{ periodIndex: number } | null>(
    null,
  );
  const [showBulkCreator, setShowBulkCreator] = useState(false);

  const branchHook = useTimelineBranch({
    nodes,
    edges,
    setNodes,
    setEdges,
    ageMax,
    onHistoryRecord: recordHistory,
    onClearForm: formHook.clearForm,
  });

  const crudHook = useTimelineCRUD({
    nodes,
    edges,
    ageMax,
    setNodes,
    setEdges,
    onHistoryRecord: recordHistory,
    onClearForm: formHook.clearForm,
    onSetSelectedId: setSelectedId,
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
    return `timeline-${now.toISOString().split('T')[0]}`;
  }, []);

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

  const worldWidth = 4000;
  const worldHeight = ageMax * YEAR_PX + 500;
  const adaptiveRadius = clamp(BASE_NODE_RADIUS / transform.k, MIN_NODE_RADIUS, MAX_NODE_RADIUS);

  // ============ ADDITIONAL HANDLERS ============

  const handleDownload = async (type: 'json' | 'png' | 'pdf') => {
    closeDownloadMenu();
    await handleTimelineDownload({
      type,
      payload: {
        currentAge,
        ageMax,
        nodes,
        edges,
        birthDetails: { ...birthDetails },
        selectedPeriodization,
      },
      filenamePrefix: exportFilenamePrefix,
      svg: svgRef.current,
    });
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
      branchHook.selectedBranchX,
    );
  };

  // ============ RENDER ============

  const cursorClass = panZoomHook.isPanning ? 'cursor-grabbing' : 'cursor-grab';
  const readOnly = isMobile;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-gradient-to-br from-slate-50 to-white overflow-hidden"
    >
      {readOnly && <MobileReadOnlyBanner />}

      {!readOnly && (
        <Suspense fallback={<PageLoader label="Загрузка панели навигации..." />}>
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
            onDownloadMenuToggle={toggleDownloadMenu}
            onDownloadSelect={handleDownload}
            onClearAll={crudHook.handleClearAll}
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
            onOpenBulkCreator={() => setShowBulkCreator(true)}
            undo={undo}
            redo={redo}
            historyIndex={historyIndex}
            historyLength={historyLength}
          />
        </Suspense>
      )}

      {periodBoundaryModal && (
        <PeriodBoundaryModalContainer
          selectedPeriodization={selectedPeriodization}
          periodIndex={periodBoundaryModal.periodIndex}
          onClose={() => setPeriodBoundaryModal(null)}
        />
      )}

      {showBulkCreator && !readOnly && (
        <Suspense fallback={<PageLoader label="Подгрузка массового события..." />}>
          <BulkEventCreator
            onClose={() => setShowBulkCreator(false)}
            onCreate={crudHook.handleBulkCreate}
            onExtendBranch={branchHook.handleExtendBranchForBulk}
            ageMax={ageMax}
            selectedBranchX={branchHook.selectedBranchX}
            selectedEdge={branchHook.selectedEdge}
            branchSphere={
              branchHook.selectedEdge
                ? (() => {
                    const originNode = nodes.find((n) => n.id === branchHook.selectedEdge!.nodeId);
                    return originNode?.sphere;
                  })()
                : undefined
            }
          />
        </Suspense>
      )}

      {!readOnly && (
        <Suspense fallback={<PageLoader label="Загрузка справки..." />}>
          <TimelineHelpModal open={showHelp} onClose={() => setShowHelp(false)} />
        </Suspense>
      )}
    </motion.div>
  );
}
