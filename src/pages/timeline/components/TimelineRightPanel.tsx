import { useState } from 'react';
import { TimelineBirthForm } from './TimelineBirthForm';
import { TimelineBranchContinuation } from './TimelineBranchContinuation';
import { TimelineBranchEditor } from './TimelineBranchEditor';
import { TimelineEventForm } from './TimelineEventForm';
import { TimelineUndoControls } from './TimelineUndoControls';
import { PeriodizationSelector } from './PeriodizationSelector';
import type { EdgeT, NodeT, Sphere, SaveStatus, EventIconId } from '../types';

interface TimelineRightPanelProps {
  saveStatus: SaveStatus;
  selectedPeriodization: string | null;
  onPeriodizationChange: (value: string | null) => void;
  birthSelected: boolean;
  birthFormDate: string;
  birthFormPlace: string;
  birthFormNotes: string;
  onBirthDateChange: (value: string) => void;
  onBirthPlaceChange: (value: string) => void;
  onBirthNotesChange: (value: string) => void;
  onBirthSave: () => void;
  onBirthCancel: () => void;
  birthHasChanges: boolean;
  formEventId: string | null;
  formEventAge: string;
  onFormEventAgeChange: (value: string) => void;
  formEventLabel: string;
  onFormEventLabelChange: (value: string) => void;
  formEventSphere: Sphere | undefined;
  onFormEventSphereChange: (value: Sphere | undefined) => void;
  formEventIsDecision: boolean;
  onFormEventIsDecisionChange: (value: boolean) => void;
  formEventIcon: EventIconId | null;
  onFormEventIconChange: (value: EventIconId | null) => void;
  formEventNotes: string;
  onFormEventNotesChange: (value: string) => void;
  hasFormChanges: boolean;
  onEventFormSubmit: () => void;
  onClearForm: () => void;
  onDeleteEvent: (id: string) => void;
  createNote: (note: any) => Promise<void>;
  selectedBranchX: number | null;
  selectedEdge: EdgeT | undefined;
  branchYears: string;
  onBranchYearsChange: (value: string) => void;
  onUpdateBranchLength: () => void;
  onDeleteBranch: () => void;
  onHideBranchEditor: () => void;
  onExtendBranch: () => void;
  selectedNode?: NodeT;
  edges: EdgeT[];
  ageMax: number;
  onOpenBulkCreator: () => void;
  undo: () => void;
  redo: () => void;
  historyIndex: number;
  historyLength: number;
}

export function TimelineRightPanel(props: TimelineRightPanelProps) {
  const {
    saveStatus,
    selectedPeriodization,
    onPeriodizationChange,
    birthSelected,
    birthFormDate,
    birthFormPlace,
    birthFormNotes,
    onBirthDateChange,
    onBirthPlaceChange,
    onBirthNotesChange,
    onBirthSave,
    onBirthCancel,
    birthHasChanges,
    formEventId,
    formEventAge,
    onFormEventAgeChange,
    formEventLabel,
    onFormEventLabelChange,
    formEventSphere,
    onFormEventSphereChange,
    formEventIsDecision,
    onFormEventIsDecisionChange,
    formEventIcon,
    onFormEventIconChange,
    formEventNotes,
    onFormEventNotesChange,
    hasFormChanges,
    onEventFormSubmit,
    onClearForm,
    onDeleteEvent,
    createNote,
    selectedBranchX,
    selectedEdge,
    branchYears,
    onBranchYearsChange,
    onUpdateBranchLength,
    onDeleteBranch,
    onHideBranchEditor,
    onExtendBranch,
    selectedNode,
    edges,
    ageMax,
    onOpenBulkCreator,
    undo,
    redo,
    historyIndex,
    historyLength,
  } = props;

  const [showSaveTooltip, setShowSaveTooltip] = useState(false);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;
  const resetBirthFields = () => {
    onBirthDateChange('');
    onBirthPlaceChange('');
    onBirthNotesChange('');
  };

  const handleDeleteCurrentEvent = () => {
    if (!formEventId) return;
    if (confirm('Удалить это событие?')) {
      onDeleteEvent(formEventId);
    }
  };

  return (
    <aside className="fixed right-0 top-0 bottom-0 w-80 border-l border-purple-200 bg-gradient-to-b from-purple-50 to-blue-50 overflow-y-auto z-30">
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
              Таймлайн жизни
            </h2>
            <div className="flex items-center gap-2">
              <PeriodizationSelector value={selectedPeriodization} onChange={onPeriodizationChange} />
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
          <TimelineBirthForm
            birthFormDate={birthFormDate}
            birthFormPlace={birthFormPlace}
            birthFormNotes={birthFormNotes}
            birthHasChanges={birthHasChanges}
            onDateChange={onBirthDateChange}
            onPlaceChange={onBirthPlaceChange}
            onNotesChange={onBirthNotesChange}
            onSave={onBirthSave}
            onClear={resetBirthFields}
            onCancel={onBirthCancel}
          />
        )}

        {(!selectedBranchX || formEventId) && (
          <>
            <TimelineEventForm
              title={formEventId ? 'Редактировать событие' : 'Новое событие'}
              formEventId={formEventId}
              formEventAge={formEventAge}
              onFormEventAgeChange={onFormEventAgeChange}
              formEventLabel={formEventLabel}
              onFormEventLabelChange={onFormEventLabelChange}
              formEventSphere={formEventSphere}
              onFormEventSphereChange={onFormEventSphereChange}
              formEventIsDecision={formEventIsDecision}
              onFormEventIsDecisionChange={onFormEventIsDecisionChange}
              formEventIcon={formEventIcon}
              onFormEventIconChange={onFormEventIconChange}
              formEventNotes={formEventNotes}
              onFormEventNotesChange={onFormEventNotesChange}
              onEventFormSubmit={onEventFormSubmit}
              onClearForm={onClearForm}
              onDeleteEvent={handleDeleteCurrentEvent}
              createNote={createNote}
              onNoteSuccess={() => {
                alert('Событие сохранено в заметки!');
              }}
              showCancelButton={!!formEventId}
              showBulkCreatorButton={!formEventId}
              onOpenBulkCreator={onOpenBulkCreator}
            />
            <TimelineBranchContinuation
              formEventId={formEventId}
              selectedNode={selectedNode}
              edges={edges}
              branchYears={branchYears}
              onBranchYearsChange={onBranchYearsChange}
              onExtendBranch={onExtendBranch}
              ageMax={ageMax}
            />
          </>
        )}


        {selectedBranchX && !formEventId && (
          <>
            {selectedEdge && (
              <TimelineBranchEditor
                selectedEdge={selectedEdge}
                branchYears={branchYears}
                ageMax={ageMax}
                onBranchYearsChange={onBranchYearsChange}
                onUpdateBranchLength={onUpdateBranchLength}
                onDeleteBranch={onDeleteBranch}
                onClose={onHideBranchEditor}
              />
            )}

            <TimelineEventForm
              title="Новое событие на ветке"
              formEventId={formEventId}
              formEventAge={formEventAge}
              onFormEventAgeChange={onFormEventAgeChange}
              formEventLabel={formEventLabel}
              onFormEventLabelChange={onFormEventLabelChange}
              formEventSphere={formEventSphere}
              onFormEventSphereChange={onFormEventSphereChange}
              formEventIsDecision={formEventIsDecision}
              onFormEventIsDecisionChange={onFormEventIsDecisionChange}
              formEventIcon={formEventIcon}
              onFormEventIconChange={onFormEventIconChange}
              formEventNotes={formEventNotes}
              onFormEventNotesChange={onFormEventNotesChange}
              onEventFormSubmit={onEventFormSubmit}
              createNote={createNote}
              iconTone="sky"
              showNotesField={false}
              showBulkCreatorButton
              onOpenBulkCreator={onOpenBulkCreator}
              wrapperClassName="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-200 shadow-sm"
            />
          </>
        )}
        <TimelineUndoControls canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
      </div>
    </aside>
  );
}
