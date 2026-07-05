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
  onRetrySave: () => void;
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
  onNotify: (message: string) => void;
  createNote: (
    title: string,
    content: string,
    ageRange: import('../../../types/notes').AgeRange | null,
    topicId: string | null,
    topicTitle: string | null
  ) => Promise<string>;
  selectedBranchId: string | null;
  selectedEdge: EdgeT | undefined;
  branchInfo: { originLabel: string | null; eventsCount: number } | null;
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
    onRetrySave,
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
    onNotify,
    createNote,
    selectedBranchId,
    selectedEdge,
    branchInfo,
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
  // Форма нового события скрыта за кнопкой «+ Событие», пока нет выбора.
  const [newEventFormOpen, setNewEventFormOpen] = useState(false);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;
  const resetBirthFields = () => {
    onBirthDateChange('');
    onBirthPlaceChange('');
    onBirthNotesChange('');
  };

  // Без блокирующего confirm: после удаления показывается плашка
  // «Удалено · Отменить» (undo работает и для первого действия).
  const handleDeleteCurrentEvent = () => {
    if (!formEventId) return;
    onDeleteEvent(formEventId);
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
          {saveStatus === 'error' && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <span>Не удалось сохранить изменения</span>
              <button
                type="button"
                onClick={onRetrySave}
                className="shrink-0 rounded-lg border border-red-300 bg-white px-2 py-1 font-semibold transition hover:bg-red-100"
              >
                Повторить
              </button>
            </div>
          )}
        </div>

        <TimelineUndoControls canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />

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

        {/* Контекстный режим: без выбора панель не вываливает все формы
            сразу — подсказка + одна главная кнопка «+ Событие». */}
        {!selectedBranchId && !formEventId && !birthSelected && !newEventFormOpen && !hasFormChanges && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setNewEventFormOpen(true)}
              className="w-full rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 px-4 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:from-blue-100 hover:to-sky-100"
            >
              + Новое событие
            </button>
            <button
              type="button"
              onClick={onOpenBulkCreator}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              ⚡ Несколько событий сразу
            </button>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-xs leading-relaxed text-slate-600">
              <div className="mb-1 font-semibold text-slate-700">Как работать с холстом</div>
              <ul className="space-y-1">
                <li>• Двойной клик по линии или ветке — событие в месте клика</li>
                <li>• Клик по кружку — открыть событие</li>
                <li>• Перетащите событие в сторону — от него сможет вырасти ветка (кнопка «+» у кружка)</li>
                <li>• Колесо мыши — масштаб, пустое место — перемещение</li>
              </ul>
            </div>
          </div>
        )}

        {(!selectedBranchId || formEventId) &&
          !birthSelected &&
          (formEventId || newEventFormOpen || hasFormChanges) && (
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
              onClearForm={() => {
                onClearForm();
                setNewEventFormOpen(false);
              }}
              onDeleteEvent={handleDeleteCurrentEvent}
              createNote={createNote}
              onNoteSuccess={() => {
                onNotify('Событие сохранено в заметки!');
              }}
              showCancelButton={!!formEventId || newEventFormOpen}
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


        {selectedBranchId && !formEventId && (
          <>
            {selectedEdge && (
              <TimelineBranchEditor
                selectedEdge={selectedEdge}
                branchYears={branchYears}
                ageMax={ageMax}
                originLabel={branchInfo?.originLabel ?? null}
                eventsOnBranch={branchInfo?.eventsCount ?? 0}
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
      </div>
    </aside>
  );
}
