// Timeline component with bulk event creation support
import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useNotes } from '../hooks/useNotes';
import { PageLoader } from '../components/ui';

// Импорт типов, констант, утилит и компонентов из модулей
import type {
  NodeT,
  BirthDetails,
  EdgeT,
} from './timeline/types';
import {
  YEAR_PX,
  LINE_X_POSITION,
  BASE_NODE_RADIUS,
  MIN_NODE_RADIUS,
  MAX_NODE_RADIUS,
  DEFAULT_CURRENT_AGE,
  DEFAULT_AGE_MAX,
} from './timeline/constants';
import { clamp } from './timeline/utils';
import { useTimelineState } from './timeline/hooks/useTimelineState';
import { useTimelineUndoRedo } from './timeline/hooks/useTimelineUndoRedo';
import { useDownloadMenu } from './timeline/hooks/useDownloadMenu';
import { useTimelineShortcuts } from './timeline/hooks/useTimelineShortcuts';
import { useTimelineForm } from './timeline/hooks/useTimelineForm';
import { useTimelineBirth } from './timeline/hooks/useTimelineBirth';
import { useTimelinePanZoom } from './timeline/hooks/useTimelinePanZoom';
import { useTimelineDragDrop } from './timeline/hooks/useTimelineDragDrop';
import { useTimelineBranch } from './timeline/hooks/useTimelineBranch';
import { useTimelineCRUD } from './timeline/hooks/useTimelineCRUD';
import { useTimelineExport } from './timeline/hooks/useTimelineExport';
import { useIsMobile } from './timeline/hooks/useIsMobile';
import { useBiographyImport } from './timeline/hooks/useBiographyImport';
import { hasTimelineContent } from './timeline/persistence';
import { BiographyImportModal } from './timeline/components/BiographyImportModal';
import { MobileReadOnlyBanner } from './timeline/components/MobileReadOnlyBanner';
import { PeriodBoundaryModalContainer } from './timeline/components/PeriodBoundaryModalContainer';
import {
  BulkEventCreator,
  TimelineCanvas,
  TimelineHelpModal,
  TimelineLeftPanel,
  TimelineRightPanel,
} from './timeline/lazyComponents';

// ============ MAIN COMPONENT ============

export default function Timeline() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { createNote } = useNotes();
  const isMobile = useIsMobile();

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
    deleteTimelineCanvas,
    replaceActiveTimeline,
  } = useTimelineState();

  // History (undo/redo) — связка вынесена в useTimelineUndoRedo,
  // baseline-состояние досеивается там же (Д1/I10).
  const {
    recordHistory,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
    historyIndex,
    historyLength,
  } = useTimelineUndoRedo({
    nodes,
    edges,
    birthDetails,
    setNodes,
    setEdges,
    setBirthDetails,
  });

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

  // Biography import (Wikipedia → CF → timeline)
  const biographyImport = useBiographyImport({
    activeTimelineId,
    activeTimelineName,
    applyTimeline: ({ timeline, canvasName, subjectName }) => {
      replaceActiveTimeline(timeline, { name: canvasName || subjectName });
    },
  });

  // Stable ref на biographyImport.reset чтобы не пересоздавать resetTransientTimelineUi
  // на каждом render hook'а (иначе useEffect[activeTimelineId, resetTransientTimelineUi]
  // срабатывает на каждом render и сбрасывает expanded сразу после setExpanded(true)).
  const biographyImportResetRef = useRef(biographyImport.reset);
  biographyImportResetRef.current = biographyImport.reset;

  const resetTransientTimelineUi = useCallback(() => {
    formHook.clearForm();
    setSelectedId(null);
    branchHook.setSelectedBranchId(null);
    birthHook.setBirthSelected(false);
    setPeriodBoundaryModal(null);
    setShowBulkCreator(false);
    biographyImportResetRef.current();
    resetHistory();
  }, [birthHook.setBirthSelected, branchHook.setSelectedBranchId, formHook.clearForm, resetHistory]);

  // Auto-pickup sphere when selecting branch
  useEffect(() => {
    if (formHook.formEventId !== null) return;
    if (branchHook.selectedBranchId !== null) {
      const selectedEdge = edges.find((e) => e.id === branchHook.selectedBranchId);
      if (selectedEdge) {
        const originNode = nodes.find((n) => n.id === selectedEdge.nodeId);
        if (originNode && originNode.sphere) {
          formHook.setFormEventSphere(originNode.sphere);
        }
      }
    }
  }, [branchHook.selectedBranchId, edges, nodes, formHook.formEventId]);

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

  const { handleDownload } = useTimelineExport({
    svgRef,
    currentAge,
    ageMax,
    nodes,
    edges,
    birthDetails,
    selectedPeriodization,
    filenamePrefix: exportFilenamePrefix,
    onBeforeDownload: closeDownloadMenu,
  });

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
      branchHook.setSelectedBranchId(null);
      birthHook.setBirthSelected(false);
    },
  });

  // ============ ADDITIONAL HANDLERS ============

  const handlePeriodBoundaryClick = (periodIndex: number) => {
    setPeriodBoundaryModal({ periodIndex });
  };

  const handleSelectBranch = (edgeId: string) => {
    branchHook.handleSelectBranch(edgeId);
    birthHook.setBirthSelected(false);
  };

  const handleClearSelection = () => {
    branchHook.setSelectedBranchId(null);
    birthHook.setBirthSelected(false);
  };

  const handleOpenBulkCreator = () => {
    setShowBulkCreator(true);
  };

  const handleOpenBiographyImport = () => {
    biographyImport.open();
  };

  const handleCloseBiographyImport = () => {
    biographyImport.close();
  };

  const handleBiographySourceUrlChange = (value: string) => {
    biographyImport.handleSourceUrlChange(value);
  };

  const handleImportBiography = async () => {
    const ok = await biographyImport.submit();
    if (ok) {
      resetTransientTimelineUi();
    }
  };

  const handleImportTimelineJsonFile = async (file: File | null) => {
    const ok = await biographyImport.importTimelineJsonFile(file);
    if (ok) {
      resetTransientTimelineUi();
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
      branchHook.selectedBranchId
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
            timelineCanvases={timelineCanvases}
            activeTimelineId={activeTimelineId}
            activeTimelineName={activeTimelineName}
            showBiographyImportAction={!activeTimelineHasContent}
            biographyImportExpanded={biographyImport.expanded}
            biographyImportLoading={biographyImport.loading}
            biographySourceUrl={biographyImport.sourceUrl}
            biographyImportError={biographyImport.error}
            biographyMeta={biographyImport.meta}
            downloadMenuOpen={downloadMenuOpen}
            downloadButtonRef={downloadButtonRef}
            downloadMenuRef={downloadMenuRef}
            onCurrentAgeChange={(value) => setCurrentAge(value)}
            onViewportAgeChange={handleViewportAgeChange}
            onScaleChange={handleScaleChange}
            onCreateTimeline={createTimelineCanvas}
            onSelectTimeline={selectTimelineCanvas}
            onDeleteTimeline={deleteTimelineCanvas}
            onDownloadMenuToggle={toggleDownloadMenu}
            onDownloadSelect={handleDownload}
            onClearAll={crudHook.handleClearAll}
            onOpenBiographyImport={handleOpenBiographyImport}
            onCloseBiographyImport={handleCloseBiographyImport}
            onBiographySourceUrlChange={handleBiographySourceUrlChange}
            onSubmitBiographyImport={handleImportBiography}
            onImportTimelineJsonFile={handleImportTimelineJsonFile}
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
          selectedBranchId={branchHook.selectedBranchId}
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
          selectedBranchId={branchHook.selectedBranchId}
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

      {periodBoundaryModal && (
        <PeriodBoundaryModalContainer
          selectedPeriodization={selectedPeriodization}
          periodIndex={periodBoundaryModal.periodIndex}
          onClose={() => setPeriodBoundaryModal(null)}
        />
      )}

      {/* Bulk Event Creator Modal */}
      {showBulkCreator && !readOnly && (
        <Suspense fallback={<PageLoader label="Подгрузка массового события..." />}>
          <BulkEventCreator
            onClose={() => setShowBulkCreator(false)}
            onCreate={crudHook.handleBulkCreate}
            onExtendBranch={branchHook.handleExtendBranchForBulk}
            ageMax={ageMax}
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
        isOpen={biographyImport.modalOpen}
        loading={biographyImport.loading}
        error={biographyImport.error}
        errorDetail={biographyImport.errorDetail}
        meta={biographyImport.meta}
        progress={biographyImport.progress}
        onClose={biographyImport.closeModal}
      />
    </motion.div>
  );
}
