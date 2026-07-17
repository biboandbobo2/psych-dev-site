import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  DISORDER_TABLE_COLUMNS,
  DISORDER_TABLE_ROWS,
  isDisorderTableCourse,
  useDisorderTableComments,
  useDisorderTableEntries,
  useDisorderTableStudents,
} from '../features/disorderTable';
import { useCourseStore } from '../stores';
import { useAuth } from '../auth/AuthProvider';
import { EntryModal } from './disorderTable/components/EntryModal';
import { CellDetailsModal } from './disorderTable/components/CellDetailsModal';
import { BulkEntryModal } from './disorderTable/components/BulkEntryModal';
import { GeneralCommentsModal } from './disorderTable/components/GeneralCommentsModal';
import { Table } from './disorderTable/components/Table';
import { AdminTeacherSelect } from './disorderTable/components/AdminTeacherSelect';
import { FilterControls } from './disorderTable/components/FilterControls';
import { ErrorBanners, GeneralCommentsBar, PageHeader } from './disorderTable/components/PageHeader';
import {
  ActiveFiltersChips,
  SearchResultsPanel,
  TrackLegend,
} from './disorderTable/components/SearchResultsPanel';
import {
  useDisorderTableBulkEntry,
  useDisorderTableCommentForms,
  useDisorderTableEntryForm,
  useDisorderTableFilters,
  useDisorderTableMatrix,
  useDisorderTableSelection,
  useIsMobile,
} from './disorderTable/hooks';

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

  const isMobile = useIsMobile();

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
  const selectedStudent = useMemo(
    () => students.find((student) => student.uid === targetOwnerUid) ?? null,
    [students, targetOwnerUid],
  );
  const canEditEntries = canEdit && !isAdmin;

  const {
    activeCell,
    isCellModalOpen,
    isCellSelectionMode,
    selectedCells,
    selectedCellKeys,
    openCellModal,
    closeCellModal,
    handleCellClick,
    toggleCellSelectionMode,
    clearSelectedCells,
    resetSelection,
  } = useDisorderTableSelection({ isMobile, canEditEntries });

  const {
    activeFilters,
    draftFilters,
    searchQuery,
    setSearchQuery,
    normalizedSearch,
    hasActiveFilters,
    hasActiveSearch,
    canApplyFilters,
    toggleDraftRowFilter,
    toggleDraftColumnFilter,
    applyDraftFilters,
    clearAllFilters,
  } = useDisorderTableFilters({ onFiltersCommitted: resetSelection });

  const {
    filteredEntries,
    displayedRows,
    displayedColumns,
    matrix,
    activeCellEntries,
    searchIntersectionMatches,
  } = useDisorderTableMatrix({ entries, activeFilters, normalizedSearch, hasActiveSearch, activeCell });

  const {
    isEntryModalOpen,
    editingEntryId,
    submitError,
    listError,
    formText,
    setFormText,
    formTrack,
    setFormTrack,
    isFormValid,
    formCellLabel,
    openCreateFromCell,
    closeEntryModal,
    startEdit,
    handleSubmit,
    handleRemove,
  } = useDisorderTableEntryForm({
    isMobile,
    canEditEntries,
    entries,
    saving,
    activeCell,
    createEntry,
    updateEntry,
    removeEntry,
    rowLabels,
    columnLabels,
  });

  const {
    isBulkModalOpen,
    bulkText,
    setBulkText,
    bulkTrack,
    setBulkTrack,
    bulkError,
    openBulkModal,
    closeBulkModal,
    handleBulkSubmit,
  } = useDisorderTableBulkEntry({
    isMobile,
    canEditEntries,
    saving,
    selectedCells,
    createEntriesBatch,
    onSubmitted: resetSelection,
  });

  const {
    generalComments,
    commentsByEntryId,
    commentCountByEntryId,
    commentDrafts,
    commentSubmitErrors,
    commentSavingEntryId,
    setCommentDraft,
    handleCommentSubmit,
    isGeneralCommentsModalOpen,
    generalCommentDraft,
    setGeneralCommentDraft,
    generalCommentSubmitError,
    generalCommentSaving,
    openGeneralCommentsModal,
    closeGeneralCommentsModal,
    handleGeneralCommentSubmit,
  } = useDisorderTableCommentForms({ comments, canComment, createComment });

  useEffect(() => {
    if (!activeCell) return;
    const rowVisible = displayedRows.some((row) => row.id === activeCell.rowId);
    const columnVisible = displayedColumns.some((column) => column.id === activeCell.columnId);
    if (!rowVisible || !columnVisible) {
      closeCellModal();
    }
  }, [activeCell, displayedRows, displayedColumns, closeCellModal]);

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
          <PageHeader
            searchQuery={searchQuery}
            onSearchChange={(value) => {
              setSearchQuery(value);
              clearSelectedCells();
            }}
          />

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
            <GeneralCommentsBar
              generalCommentsCount={generalComments.length}
              onOpen={openGeneralCommentsModal}
            />
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

          {(error || listError) && <ErrorBanners error={error} listError={listError} />}
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
