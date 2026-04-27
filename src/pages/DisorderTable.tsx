import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  applyDisorderTableFilters,
  buildBatchEntryInputsFromCells,
  buildDisorderTableCellKey,
  buildDisorderTableFilters,
  buildDisorderTableFullMatrix,
  DISORDER_TABLE_GENERAL_COMMENT_ENTRY_ID,
  DISORDER_TABLE_COLUMNS,
  DISORDER_TABLE_ROWS,
  isDisorderTableCourse,
  isValidDisorderTableEntryInput,
  useDisorderTableComments,
  useDisorderTableEntries,
  useDisorderTableStudents,
} from '../features/disorderTable';
import type {
  DisorderTableCellSelection,
} from '../features/disorderTable';
import { useCourseStore } from '../stores';
import { useAuth } from '../auth/AuthProvider';
import { areSameSelections, buildPreviewText, renderHighlightedText } from './disorderTable/utils/highlight';
import type { OptionalTrack } from './disorderTable/utils/trackMeta';
import { EntryModal } from './disorderTable/components/EntryModal';
import { CellDetailsModal } from './disorderTable/components/CellDetailsModal';
import { BulkEntryModal } from './disorderTable/components/BulkEntryModal';
import { GeneralCommentsModal } from './disorderTable/components/GeneralCommentsModal';
import { Table } from './disorderTable/components/Table';
import { AdminTeacherSelect } from './disorderTable/components/AdminTeacherSelect';
import { FilterControls } from './disorderTable/components/FilterControls';
import {
  ActiveFiltersChips,
  SearchResultsPanel,
  TrackLegend,
} from './disorderTable/components/SearchResultsPanel';

export default function DisorderTable() {
  const { user, isAdmin } = useAuth();
  const { currentCourse } = useCourseStore();
  const {
    entries,
    loading,
    saving,
    error,
    canEdit,
    targetOwnerUid,
    setTargetOwnerUid,
    createEntry,
    createEntriesBatch,
    updateEntry,
    removeEntry,
  } = useDisorderTableEntries(currentCourse);
  const {
    comments,
    loading: commentsLoading,
    saving: commentsSaving,
    error: commentsError,
    canComment,
    createComment,
  } = useDisorderTableComments(currentCourse, targetOwnerUid);
  const {
    students,
    loading: studentsLoading,
    error: studentsError,
  } = useDisorderTableStudents(isAdmin);

  const [isMobile, setIsMobile] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formRowIds, setFormRowIds] = useState<string[]>([]);
  const [formColumnIds, setFormColumnIds] = useState<string[]>([]);
  const [formText, setFormText] = useState('');
  const [formTrack, setFormTrack] = useState<OptionalTrack>(null);

  const [activeFilterRowIds, setActiveFilterRowIds] = useState<string[]>([]);
  const [activeFilterColumnIds, setActiveFilterColumnIds] = useState<string[]>([]);
  const [draftFilterRowIds, setDraftFilterRowIds] = useState<string[]>([]);
  const [draftFilterColumnIds, setDraftFilterColumnIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeCell, setActiveCell] = useState<DisorderTableCellSelection | null>(null);
  const [isCellModalOpen, setIsCellModalOpen] = useState(false);

  const [isCellSelectionMode, setIsCellSelectionMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState<DisorderTableCellSelection[]>([]);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkTrack, setBulkTrack] = useState<OptionalTrack>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentSubmitErrors, setCommentSubmitErrors] = useState<Record<string, string>>({});
  const [commentSavingEntryId, setCommentSavingEntryId] = useState<string | null>(null);
  const [isGeneralCommentsModalOpen, setIsGeneralCommentsModalOpen] = useState(false);
  const [generalCommentDraft, setGeneralCommentDraft] = useState('');
  const [generalCommentSubmitError, setGeneralCommentSubmitError] = useState<string | null>(null);
  const [generalCommentSaving, setGeneralCommentSaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setIsMobile(false);
      return;
    }

    const media = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      setTargetOwnerUid(user.uid);
      return;
    }

    if (studentsLoading) return;
    if (!students.length) return;

    const selectedStillExists = students.some((student) => student.uid === targetOwnerUid);
    if (!selectedStillExists) {
      setTargetOwnerUid(students[0].uid);
    }
  }, [user, isAdmin, students, studentsLoading, targetOwnerUid, setTargetOwnerUid]);

  const rowLabels = useMemo(() => new Map(DISORDER_TABLE_ROWS.map((row) => [row.id, row.label])), []);
  const columnLabels = useMemo(
    () => new Map(DISORDER_TABLE_COLUMNS.map((column) => [column.id, column.label])),
    [],
  );
  const generalComments = useMemo(
    () => comments.filter((c) => c.entryId === DISORDER_TABLE_GENERAL_COMMENT_ENTRY_ID),
    [comments],
  );
  const commentsByEntryId = useMemo(() => {
    const map = new Map<string, typeof comments>();
    for (const comment of comments) {
      const bucket = map.get(comment.entryId);
      if (bucket) bucket.push(comment);
      else map.set(comment.entryId, [comment]);
    }
    return map;
  }, [comments]);
  const commentCountByEntryId = useMemo(
    () =>
      new Map(Array.from(commentsByEntryId.entries()).map(([entryId, list]) => [entryId, list.length])),
    [commentsByEntryId],
  );
  const selectedStudent = useMemo(
    () => students.find((student) => student.uid === targetOwnerUid) ?? null,
    [students, targetOwnerUid],
  );
  const canEditEntries = canEdit && !isAdmin;

  const activeFilters = useMemo(
    () => buildDisorderTableFilters(activeFilterRowIds, activeFilterColumnIds),
    [activeFilterRowIds, activeFilterColumnIds],
  );
  const draftFilters = useMemo(
    () => buildDisorderTableFilters(draftFilterRowIds, draftFilterColumnIds),
    [draftFilterRowIds, draftFilterColumnIds],
  );

  const selectionFilteredEntries = useMemo(
    () => applyDisorderTableFilters(entries, activeFilters),
    [entries, activeFilters],
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    if (!normalizedSearch) return selectionFilteredEntries;
    return selectionFilteredEntries.filter((entry) =>
      entry.text.toLowerCase().includes(normalizedSearch),
    );
  }, [selectionFilteredEntries, normalizedSearch]);

  const displayedRows = useMemo(
    () =>
      activeFilters.rowIds.length > 0
        ? DISORDER_TABLE_ROWS.filter((row) => activeFilters.rowIds.includes(row.id))
        : DISORDER_TABLE_ROWS,
    [activeFilters.rowIds],
  );
  const displayedColumns = useMemo(
    () =>
      activeFilters.columnIds.length > 0
        ? DISORDER_TABLE_COLUMNS.filter((column) => activeFilters.columnIds.includes(column.id))
        : DISORDER_TABLE_COLUMNS,
    [activeFilters.columnIds],
  );

  const matrix = useMemo(
    () =>
      buildDisorderTableFullMatrix(
        displayedRows.map((row) => row.id),
        displayedColumns.map((column) => column.id),
        filteredEntries,
      ),
    [displayedRows, displayedColumns, filteredEntries],
  );

  const activeCellEntries = useMemo(() => {
    if (!activeCell) return [];
    return matrix.get(buildDisorderTableCellKey(activeCell.rowId, activeCell.columnId)) ?? [];
  }, [activeCell, matrix]);

  const selectedCellKeys = useMemo(
    () => new Set(selectedCells.map((cell) => buildDisorderTableCellKey(cell.rowId, cell.columnId))),
    [selectedCells],
  );

  const hasActiveFilters = activeFilters.rowIds.length > 0 || activeFilters.columnIds.length > 0;
  const hasActiveSearch = normalizedSearch.length > 0;
  const canApplyFilters =
    !areSameSelections(draftFilters.rowIds, activeFilters.rowIds) ||
    !areSameSelections(draftFilters.columnIds, activeFilters.columnIds);

  const formPreviewInput = {
    rowIds: formRowIds,
    columnIds: formColumnIds,
    text: formText,
    track: formTrack,
  };
  const isFormValid = isValidDisorderTableEntryInput(formPreviewInput);

  useEffect(() => {
    if (!activeCell) return;
    const rowVisible = displayedRows.some((row) => row.id === activeCell.rowId);
    const columnVisible = displayedColumns.some((column) => column.id === activeCell.columnId);
    if (!rowVisible || !columnVisible) {
      setActiveCell(null);
      setIsCellModalOpen(false);
    }
  }, [activeCell, displayedRows, displayedColumns]);

  const resetForm = () => {
    setEditingEntryId(null);
    setFormRowIds([]);
    setFormColumnIds([]);
    setFormText('');
    setFormTrack(null);
    setSubmitError(null);
  };

  const openCreateFromCell = (rowId: string, columnId: string) => {
    if (isMobile || !canEditEntries) return;
    resetForm();
    setFormRowIds([rowId]);
    setFormColumnIds([columnId]);
    setIsEntryModalOpen(true);
  };

  const closeEntryModal = () => {
    if (saving) return;
    setIsEntryModalOpen(false);
    resetForm();
  };

  const startEdit = (entryId: string) => {
    if (isMobile || !canEditEntries) return;
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    const rowId = activeCell?.rowId ?? entry.rowIds[0] ?? '';
    const columnId = activeCell?.columnId ?? entry.columnIds[0] ?? '';

    setEditingEntryId(entry.id);
    setFormRowIds(rowId ? [rowId] : []);
    setFormColumnIds(columnId ? [columnId] : []);
    setFormText(entry.text);
    setFormTrack(entry.track ?? null);
    setSubmitError(null);
    setIsEntryModalOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    const normalizedInput = {
      rowIds: formRowIds,
      columnIds: formColumnIds,
      text: formText,
      track: formTrack,
    };

    try {
      if (editingEntryId) {
        await updateEntry(editingEntryId, normalizedInput);
      } else {
        await createEntry(normalizedInput);
      }
      closeEntryModal();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось сохранить запись');
    }
  };

  const handleRemove = async (entryId: string) => {
    if (isMobile || !canEditEntries) return;
    if (!window.confirm('Удалить эту запись?')) return;

    setListError(null);
    try {
      await removeEntry(entryId);
      if (editingEntryId === entryId) closeEntryModal();
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Не удалось удалить запись');
    }
  };

  const toggleDraftRowFilter = (rowId: string) => {
    setDraftFilterRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((item) => item !== rowId) : [...prev, rowId],
    );
  };

  const toggleDraftColumnFilter = (columnId: string) => {
    setDraftFilterColumnIds((prev) =>
      prev.includes(columnId) ? prev.filter((item) => item !== columnId) : [...prev, columnId],
    );
  };

  const applyDraftFilters = () => {
    const next = buildDisorderTableFilters(draftFilterRowIds, draftFilterColumnIds);
    setActiveFilterRowIds(next.rowIds);
    setActiveFilterColumnIds(next.columnIds);
    setSelectedCells([]);
    setIsCellSelectionMode(false);
  };

  const clearAllFilters = () => {
    setActiveFilterRowIds([]);
    setActiveFilterColumnIds([]);
    setDraftFilterRowIds([]);
    setDraftFilterColumnIds([]);
    setSearchQuery('');
    setSelectedCells([]);
    setIsCellSelectionMode(false);
  };

  const openCellModal = (rowId: string, columnId: string) => {
    setActiveCell({ rowId, columnId });
    setIsCellModalOpen(true);
  };

  const toggleCellSelection = (rowId: string, columnId: string) => {
    const key = buildDisorderTableCellKey(rowId, columnId);
    setSelectedCells((prev) => {
      const exists = prev.some(
        (cell) => buildDisorderTableCellKey(cell.rowId, cell.columnId) === key,
      );
      if (exists) {
        return prev.filter((cell) => buildDisorderTableCellKey(cell.rowId, cell.columnId) !== key);
      }
      return [...prev, { rowId, columnId }];
    });
  };

  const handleCellClick = (rowId: string, columnId: string) => {
    if (isCellSelectionMode && !isMobile) {
      toggleCellSelection(rowId, columnId);
      return;
    }
    openCellModal(rowId, columnId);
  };

  const closeCellModal = () => {
    setIsCellModalOpen(false);
    setActiveCell(null);
  };

  const toggleCellSelectionMode = () => {
    if (!canEditEntries) return;
    setIsCellSelectionMode((prev) => {
      const next = !prev;
      if (!next) setSelectedCells([]);
      return next;
    });
  };

  const openBulkModal = () => {
    if (isMobile || !canEditEntries || selectedCells.length === 0) return;
    setBulkError(null);
    setBulkText('');
    setBulkTrack(null);
    setIsBulkModalOpen(true);
  };

  const closeBulkModal = () => {
    if (saving) return;
    setIsBulkModalOpen(false);
    setBulkError(null);
    setBulkText('');
    setBulkTrack(null);
  };

  const handleBulkSubmit = async () => {
    setBulkError(null);

    if (bulkText.trim().length < 3) {
      setBulkError('Введите текст от 3 символов');
      return;
    }
    if (selectedCells.length === 0) {
      setBulkError('Выберите хотя бы одно пересечение');
      return;
    }

    try {
      const batchInputs = buildBatchEntryInputsFromCells(selectedCells, bulkText, bulkTrack);
      await createEntriesBatch(batchInputs);
      closeBulkModal();
      setSelectedCells([]);
      setIsCellSelectionMode(false);
    } catch (err) {
      setBulkError(
        err instanceof Error ? err.message : 'Не удалось сохранить текст в выбранные пересечения',
      );
    }
  };

  const setCommentDraft = (entryId: string, text: string) => {
    setCommentDrafts((prev) => ({ ...prev, [entryId]: text }));
    setCommentSubmitErrors((prev) => {
      if (!prev[entryId]) return prev;
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
  };

  const handleCommentSubmit = async (entryId: string) => {
    if (!canComment) return;

    const draft = (commentDrafts[entryId] ?? '').trim();
    if (draft.length < 2) {
      setCommentSubmitErrors((prev) => ({
        ...prev,
        [entryId]: 'Комментарий должен содержать минимум 2 символа',
      }));
      return;
    }

    setCommentSubmitErrors((prev) => {
      if (!prev[entryId]) return prev;
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
    setCommentSavingEntryId(entryId);
    try {
      await createComment({ entryId, text: draft });
      setCommentDraft(entryId, '');
    } catch (err) {
      setCommentSubmitErrors((prev) => ({
        ...prev,
        [entryId]: err instanceof Error ? err.message : 'Не удалось сохранить комментарий',
      }));
    } finally {
      setCommentSavingEntryId(null);
    }
  };

  const openGeneralCommentsModal = () => {
    setGeneralCommentSubmitError(null);
    setIsGeneralCommentsModalOpen(true);
  };

  const closeGeneralCommentsModal = () => {
    if (generalCommentSaving) return;
    setIsGeneralCommentsModalOpen(false);
    setGeneralCommentSubmitError(null);
  };

  const handleGeneralCommentSubmit = async () => {
    if (!canComment) return;

    const draft = generalCommentDraft.trim();
    if (draft.length < 2) {
      setGeneralCommentSubmitError('Комментарий должен содержать минимум 2 символа');
      return;
    }

    setGeneralCommentSubmitError(null);
    setGeneralCommentSaving(true);
    try {
      await createComment({
        entryId: DISORDER_TABLE_GENERAL_COMMENT_ENTRY_ID,
        text: draft,
      });
      setGeneralCommentDraft('');
    } catch (err) {
      setGeneralCommentSubmitError(
        err instanceof Error ? err.message : 'Не удалось сохранить комментарий',
      );
    } finally {
      setGeneralCommentSaving(false);
    }
  };

  const formCellLabel = useMemo(() => {
    const rowId = formRowIds[0];
    const columnId = formColumnIds[0];
    if (!rowId || !columnId) return 'Пересечение не выбрано';
    const rowLabel = rowLabels.get(rowId) ?? rowId;
    const columnLabel = columnLabels.get(columnId) ?? columnId;
    return `${rowLabel} × ${columnLabel}`;
  }, [formRowIds, formColumnIds, rowLabels, columnLabels]);

  const searchIntersectionMatches = useMemo(() => {
    if (!hasActiveSearch) return [];

    return displayedRows.flatMap((row) =>
      displayedColumns.flatMap((column) => {
        const key = buildDisorderTableCellKey(row.id, column.id);
        const cellEntries = matrix.get(key) ?? [];
        if (cellEntries.length === 0) return [];

        return [
          {
            key,
            rowId: row.id,
            columnId: column.id,
            count: cellEntries.length,
            preview: buildPreviewText(cellEntries[0].text, normalizedSearch, 100),
          },
        ];
      }),
    );
  }, [displayedRows, displayedColumns, matrix, hasActiveSearch, normalizedSearch]);

  if (!isDisorderTableCourse(currentCourse)) {
    return (
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-gray-900">Таблица по расстройствам</h1>
        <p className="text-sm text-gray-600">
          Этот раздел доступен только для курса «Основы патопсихологии взрослого и детского
          возрастов».
        </p>
        <Link
          to="/profile"
          className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Вернуться в профиль
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-50 to-white">
      <div className="flex h-full flex-col gap-2 p-2 sm:p-3">
        <section className="rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur sm:p-3">
          <div className="mb-2 border-b border-slate-200 pb-2">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Таблица по расстройствам</h1>
          </div>

          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Link
              to="/profile"
              className="inline-flex rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
            >
              Выход
            </Link>

            <label className="ml-auto flex min-w-[190px] flex-1 items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 sm:max-w-[360px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSelectedCells([]);
                }}
                aria-label="Поиск по тексту записей"
                placeholder="Найти запись по тексту"
                className="w-full border-none bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 sm:text-sm"
              />
            </label>
          </div>

          {isAdmin && (
            <AdminTeacherSelect
              students={students}
              studentsLoading={studentsLoading}
              studentsError={studentsError}
              selectedStudent={selectedStudent}
              targetOwnerUid={targetOwnerUid}
              onChange={setTargetOwnerUid}
            />
          )}

          <FilterControls
            canApplyFilters={canApplyFilters}
            onApply={applyDraftFilters}
            onReset={clearAllFilters}
            showBulkSelectionMode={!isMobile && canEditEntries}
            isCellSelectionMode={isCellSelectionMode}
            selectedCellsCount={selectedCells.length}
            onToggleBulkMode={toggleCellSelectionMode}
            onOpenBulkModal={openBulkModal}
            isMobile={isMobile}
            isAdmin={isAdmin}
          />

          {(generalComments.length > 0 || canComment) && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
                Лектор
              </span>
              <button
                type="button"
                onClick={openGeneralCommentsModal}
                className="inline-flex rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-900 transition hover:bg-emerald-100"
              >
                Общие комментарии от лектора
                {generalComments.length > 0 ? ` (${generalComments.length})` : ''}
              </button>
            </div>
          )}

          {(hasActiveFilters || hasActiveSearch) && (
            <ActiveFiltersChips
              searchQuery={searchQuery}
              hasActiveSearch={hasActiveSearch}
              activeColumnIds={activeFilters.columnIds}
              activeRowIds={activeFilters.rowIds}
              rowLabels={rowLabels}
              columnLabels={columnLabels}
            />
          )}

          {hasActiveSearch && (
            <SearchResultsPanel
              matches={searchIntersectionMatches}
              rowLabels={rowLabels}
              columnLabels={columnLabels}
              normalizedSearch={normalizedSearch}
              onOpenCell={openCellModal}
            />
          )}

          <TrackLegend />

          {(error || listError) && (
            <div className="mt-2 space-y-1.5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {listError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {listError}
                </div>
              )}
            </div>
          )}
        </section>

        <Table
          loading={loading}
          isMobile={isMobile}
          displayedRows={displayedRows}
          displayedColumns={displayedColumns}
          draftFilters={draftFilters}
          activeFilters={activeFilters}
          matrix={matrix}
          selectedCellKeys={selectedCellKeys}
          isCellSelectionMode={isCellSelectionMode}
          commentCountByEntryId={commentCountByEntryId}
          normalizedSearch={normalizedSearch}
          filteredEntriesCount={filteredEntries.length}
          totalEntriesCount={entries.length}
          onToggleColumnFilter={toggleDraftColumnFilter}
          onToggleRowFilter={toggleDraftRowFilter}
          onCellClick={handleCellClick}
        />
      </div>

      <EntryModal
        isOpen={isEntryModalOpen}
        onClose={closeEntryModal}
        isEditing={Boolean(editingEntryId)}
        saving={saving}
        isFormValid={isFormValid}
        cellLabel={formCellLabel}
        text={formText}
        onTextChange={setFormText}
        track={formTrack}
        onTrackChange={setFormTrack}
        submitError={submitError}
        onSubmit={handleSubmit}
      />

      <CellDetailsModal
        isOpen={isCellModalOpen}
        onClose={closeCellModal}
        title={
          activeCell
            ? `${rowLabels.get(activeCell.rowId) ?? activeCell.rowId} × ${columnLabels.get(activeCell.columnId) ?? activeCell.columnId}`
            : 'Пересечение таблицы'
        }
        saving={saving}
        isMobile={isMobile}
        canEditEntries={canEditEntries}
        canComment={canComment}
        commentsLoading={commentsLoading}
        commentsSaving={commentsSaving}
        commentsError={commentsError}
        cellEntries={activeCellEntries}
        commentsByEntryId={commentsByEntryId}
        commentDrafts={commentDrafts}
        commentSubmitErrors={commentSubmitErrors}
        commentSavingEntryId={commentSavingEntryId}
        hasActiveCell={Boolean(activeCell)}
        onAddToCell={() => {
          if (!activeCell) return;
          closeCellModal();
          openCreateFromCell(activeCell.rowId, activeCell.columnId);
        }}
        onStartEdit={(entryId) => {
          closeCellModal();
          startEdit(entryId);
        }}
        onRemove={handleRemove}
        onCommentDraftChange={setCommentDraft}
        onCommentSubmit={handleCommentSubmit}
      />

      <BulkEntryModal
        isOpen={isBulkModalOpen}
        onClose={closeBulkModal}
        saving={saving}
        selectedCells={selectedCells}
        rowLabels={rowLabels}
        columnLabels={columnLabels}
        text={bulkText}
        onTextChange={setBulkText}
        track={bulkTrack}
        onTrackChange={setBulkTrack}
        error={bulkError}
        onSubmit={handleBulkSubmit}
      />

      <GeneralCommentsModal
        isOpen={isGeneralCommentsModalOpen}
        onClose={closeGeneralCommentsModal}
        saving={generalCommentSaving}
        commentsLoading={commentsLoading}
        commentsSaving={commentsSaving}
        commentsError={commentsError}
        comments={generalComments}
        draft={generalCommentDraft}
        onDraftChange={setGeneralCommentDraft}
        canComment={canComment}
        submitError={generalCommentSubmitError}
        onSubmit={handleGeneralCommentSubmit}
      />
    </div>
  );
}
