import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  applyDisorderTableFilters,
  buildBatchEntryInputsFromCells,
  buildDisorderTableCellKey,
  buildDisorderTableFilters,
  buildDisorderTableFullMatrix,
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
  DisorderTableEntryTrack,
} from '../features/disorderTable';
import { BaseModal, ModalCancelButton, ModalSaveButton } from '../components/ui/BaseModal';
import { useCourseStore } from '../stores';
import { useAuth } from '../auth/AuthProvider';

const TEXT_CLAMP_STYLE: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const TRACK_META: Record<DisorderTableEntryTrack, { label: string; chipClass: string }> = {
  patopsychology: {
    label: 'Патопсихология',
    chipClass: 'bg-sky-100 text-sky-800',
  },
  psychiatry: {
    label: 'Психиатрия',
    chipClass: 'bg-fuchsia-100 text-fuchsia-800',
  },
};

type OptionalTrack = DisorderTableEntryTrack | null;

function areSameSelections(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value) => b.includes(value));
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPreviewText(text: string, query: string, maxLength = 120): string {
  const normalizedText = text.trim();
  if (!normalizedText) return '';
  const wasShortened = normalizedText.length > maxLength;
  if (!wasShortened) return normalizedText;

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return `${normalizedText.slice(0, maxLength).trimEnd()}...`;
  }

  const matchIndex = normalizedText.toLowerCase().indexOf(normalizedQuery);
  if (matchIndex === -1) {
    return `${normalizedText.slice(0, maxLength).trimEnd()}...`;
  }

  const headShare = Math.floor(maxLength * 0.35);
  let start = Math.max(0, matchIndex - headShare);
  let end = start + maxLength;
  if (end > normalizedText.length) {
    end = normalizedText.length;
    start = Math.max(0, end - maxLength);
  }

  let snippet = normalizedText.slice(start, end).trim();
  if (start > 0) snippet = `...${snippet}`;
  if (end < normalizedText.length) snippet = `${snippet}...`;
  if (wasShortened && !snippet.endsWith('...')) snippet = `${snippet}...`;
  return snippet;
}

function renderHighlightedText(text: string, query: string): ReactNode {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return text;

  const regex = new RegExp(`(${escapeForRegExp(normalizedQuery)})`, 'ig');
  const parts = text.split(regex);
  return parts.map((part, index) => (
    part.toLowerCase() === normalizedQuery.toLowerCase()
      ? <mark key={`${part}-${index}`} className="rounded bg-yellow-200 px-0.5 text-slate-900">{part}</mark>
      : <span key={`${part}-${index}`}>{part}</span>
  ));
}

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

  useEffect(() => {
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
  const columnLabels = useMemo(() => new Map(DISORDER_TABLE_COLUMNS.map((column) => [column.id, column.label])), []);
  const commentsByEntryId = useMemo(() => {
    const map = new Map<string, typeof comments>();
    for (const comment of comments) {
      const bucket = map.get(comment.entryId);
      if (bucket) {
        bucket.push(comment);
      } else {
        map.set(comment.entryId, [comment]);
      }
    }
    return map;
  }, [comments]);
  const commentCountByEntryId = useMemo(
    () => new Map(Array.from(commentsByEntryId.entries()).map(([entryId, list]) => [entryId, list.length])),
    [commentsByEntryId]
  );
  const selectedStudent = useMemo(
    () => students.find((student) => student.uid === targetOwnerUid) ?? null,
    [students, targetOwnerUid]
  );
  const canEditEntries = canEdit && !isAdmin;

  const activeFilters = useMemo(
    () => buildDisorderTableFilters(activeFilterRowIds, activeFilterColumnIds),
    [activeFilterRowIds, activeFilterColumnIds]
  );
  const draftFilters = useMemo(
    () => buildDisorderTableFilters(draftFilterRowIds, draftFilterColumnIds),
    [draftFilterRowIds, draftFilterColumnIds]
  );

  const selectionFilteredEntries = useMemo(
    () => applyDisorderTableFilters(entries, activeFilters),
    [entries, activeFilters]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    if (!normalizedSearch) return selectionFilteredEntries;
    return selectionFilteredEntries.filter((entry) => entry.text.toLowerCase().includes(normalizedSearch));
  }, [selectionFilteredEntries, normalizedSearch]);

  const displayedRows = useMemo(
    () => (activeFilters.rowIds.length > 0
      ? DISORDER_TABLE_ROWS.filter((row) => activeFilters.rowIds.includes(row.id))
      : DISORDER_TABLE_ROWS),
    [activeFilters.rowIds]
  );
  const displayedColumns = useMemo(
    () => (activeFilters.columnIds.length > 0
      ? DISORDER_TABLE_COLUMNS.filter((column) => activeFilters.columnIds.includes(column.id))
      : DISORDER_TABLE_COLUMNS),
    [activeFilters.columnIds]
  );

  const matrix = useMemo(
    () => buildDisorderTableFullMatrix(
      displayedRows.map((row) => row.id),
      displayedColumns.map((column) => column.id),
      filteredEntries
    ),
    [displayedRows, displayedColumns, filteredEntries]
  );

  const activeCellEntries = useMemo(() => {
    if (!activeCell) return [];
    return matrix.get(buildDisorderTableCellKey(activeCell.rowId, activeCell.columnId)) ?? [];
  }, [activeCell, matrix]);

  const selectedCellKeys = useMemo(
    () => new Set(selectedCells.map((cell) => buildDisorderTableCellKey(cell.rowId, cell.columnId))),
    [selectedCells]
  );

  const hasActiveFilters = activeFilters.rowIds.length > 0 || activeFilters.columnIds.length > 0;
  const hasActiveSearch = normalizedSearch.length > 0;
  const canApplyFilters =
    !areSameSelections(draftFilters.rowIds, activeFilters.rowIds)
    || !areSameSelections(draftFilters.columnIds, activeFilters.columnIds);

  const formPreviewInput = { rowIds: formRowIds, columnIds: formColumnIds, text: formText, track: formTrack };
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
    } catch (err: any) {
      setSubmitError(err?.message || 'Не удалось сохранить запись');
    }
  };

  const handleRemove = async (entryId: string) => {
    if (isMobile || !canEditEntries) return;
    const confirmed = window.confirm('Удалить эту запись?');
    if (!confirmed) return;

    setListError(null);
    try {
      await removeEntry(entryId);
      if (editingEntryId === entryId) {
        closeEntryModal();
      }
    } catch (err: any) {
      setListError(err?.message || 'Не удалось удалить запись');
    }
  };

  const toggleDraftRowFilter = (rowId: string) => {
    setDraftFilterRowIds((prev) => (
      prev.includes(rowId) ? prev.filter((item) => item !== rowId) : [...prev, rowId]
    ));
  };

  const toggleDraftColumnFilter = (columnId: string) => {
    setDraftFilterColumnIds((prev) => (
      prev.includes(columnId) ? prev.filter((item) => item !== columnId) : [...prev, columnId]
    ));
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
      const exists = prev.some((cell) => buildDisorderTableCellKey(cell.rowId, cell.columnId) === key);
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
    } catch (err: any) {
      setBulkError(err?.message || 'Не удалось сохранить текст в выбранные пересечения');
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
    } catch (err: any) {
      setCommentSubmitErrors((prev) => ({
        ...prev,
        [entryId]: err?.message || 'Не удалось сохранить комментарий',
      }));
    } finally {
      setCommentSavingEntryId(null);
    }
  };

  const trackOptions: Array<{ value: OptionalTrack; label: string }> = [
    { value: null, label: 'Без доп. цвета' },
    { value: 'patopsychology', label: 'Патопсихология' },
    { value: 'psychiatry', label: 'Психиатрия' },
  ];

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

    return displayedRows.flatMap((row) => (
      displayedColumns.flatMap((column) => {
        const key = buildDisorderTableCellKey(row.id, column.id);
        const cellEntries = matrix.get(key) ?? [];
        if (cellEntries.length === 0) return [];

        return [{
          key,
          rowId: row.id,
          columnId: column.id,
          count: cellEntries.length,
          preview: buildPreviewText(cellEntries[0].text, normalizedSearch, 100),
        }];
      })
    ));
  }, [displayedRows, displayedColumns, matrix, hasActiveSearch, normalizedSearch]);

  if (!isDisorderTableCourse(currentCourse)) {
    return (
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-gray-900">Таблица по расстройствам</h1>
        <p className="text-sm text-gray-600">
          Этот раздел доступен только для курса «Основы патопсихологии взрослого и детского возрастов».
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
            <section className="mb-2 rounded-xl border border-violet-200 bg-violet-50/70 px-2.5 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-violet-900">Режим преподавателя</span>
                <select
                  value={targetOwnerUid ?? ''}
                  onChange={(event) => setTargetOwnerUid(event.target.value || null)}
                  className="min-w-[220px] flex-1 rounded-lg border border-violet-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 sm:max-w-[420px]"
                >
                  {studentsLoading && <option value="">Загрузка списка студентов...</option>}
                  {!studentsLoading && students.length === 0 && <option value="">Студенты не найдены</option>}
                  {!studentsLoading && students.map((student) => (
                    <option key={student.uid} value={student.uid}>
                      {student.displayName}{student.email ? ` (${student.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {selectedStudent && (
                <p className="mt-1 text-xs text-violet-800">
                  Просматривается таблица студента: <span className="font-semibold">{selectedStudent.displayName}</span>
                </p>
              )}
              {studentsError && (
                <p className="mt-1 text-xs text-red-700">{studentsError}</p>
              )}
            </section>
          )}

          <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-2.5 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-900">Фильтры</span>
            <button
              type="button"
              onClick={applyDraftFilters}
              disabled={!canApplyFilters}
              className="inline-flex rounded-lg border border-blue-300 bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-800 transition hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Применить фильтр
            </button>
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
            >
              Сбросить
            </button>
          </div>

          {!isMobile && canEditEntries && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-900">Несколько ячеек</span>
              <button
                type="button"
                onClick={toggleCellSelectionMode}
                className={`inline-flex rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  isCellSelectionMode
                    ? 'border-amber-400 bg-white text-amber-900 hover:bg-amber-100'
                    : 'border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200'
                }`}
              >
                {isCellSelectionMode ? 'Режим выбора включен' : 'Выбрать несколько ячеек'}
              </button>
              {isCellSelectionMode && (
                <button
                  type="button"
                  onClick={openBulkModal}
                  disabled={selectedCells.length === 0}
                  className="inline-flex rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Внести текст в выбранные ({selectedCells.length})
                </button>
              )}
            </div>
          )}

          {isMobile && (
            <p className="mb-1 text-xs text-slate-600">
              Мобильный режим: доступен просмотр таблицы и содержимого ячеек. Редактирование доступно на компьютере.
            </p>
          )}
          {isAdmin && (
            <p className="mb-1 text-xs text-slate-600">
              Для преподавателя доступен просмотр и комментирование таблицы студента.
            </p>
          )}

          {hasActiveFilters || hasActiveSearch ? (
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {hasActiveSearch && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700">
                  Поиск: {searchQuery.trim()}
                </span>
              )}
              {activeFilters.columnIds.map((columnId) => (
                <span key={`active-column-${columnId}`} className="rounded-full bg-blue-50 px-2.5 py-0.5 font-medium text-blue-700">
                  {columnLabels.get(columnId) ?? columnId}
                </span>
              ))}
              {activeFilters.rowIds.map((rowId) => (
                <span key={`active-row-${rowId}`} className="rounded-full bg-teal-50 px-2.5 py-0.5 font-medium text-teal-700">
                  {rowLabels.get(rowId) ?? rowId}
                </span>
              ))}
            </div>
          ) : null}

          {hasActiveSearch && (
            <section className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5">
              <div className="mb-1.5 text-xs font-semibold text-emerald-900">
                Найдено пересечений: {searchIntersectionMatches.length}
              </div>
              {searchIntersectionMatches.length === 0 ? (
                <p className="text-xs text-emerald-800">По текущим фильтрам совпадений нет.</p>
              ) : (
                <div className="grid max-h-36 grid-cols-1 gap-1.5 overflow-auto sm:grid-cols-2">
                  {searchIntersectionMatches.map((match) => (
                    <button
                      key={match.key}
                      type="button"
                      onClick={() => openCellModal(match.rowId, match.columnId)}
                      className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      <p className="text-xs font-semibold text-emerald-900">
                        {rowLabels.get(match.rowId) ?? match.rowId} × {columnLabels.get(match.columnId) ?? match.columnId}
                      </p>
                      <p className="mt-1 text-xs text-slate-700">
                        {renderHighlightedText(match.preview, normalizedSearch)}
                      </p>
                      {match.count > 1 && (
                        <p className="mt-1 text-[10px] font-medium text-emerald-700">+{match.count - 1} ещё в этом пересечении</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-semibold text-slate-600">Цвета заметок:</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">Без цвета</span>
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 font-medium text-sky-800">Патопсихология</span>
            <span className="rounded-full bg-fuchsia-100 px-2.5 py-0.5 font-medium text-fuchsia-800">Психиатрия</span>
          </div>

          {(error || listError) && (
            <div className="mt-2 space-y-1.5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
              {listError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{listError}</div>
              )}
            </div>
          )}
        </section>

        <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex h-full flex-col">
            <div className="shrink-0 border-b border-slate-200 px-4 py-2 text-xs text-slate-600 sm:text-sm">
              Показано записей: <span className="font-semibold text-slate-900">{filteredEntries.length}</span> из {entries.length}
            </div>

            {loading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-600">Загрузка таблицы...</div>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto">
                <table className={`${isMobile ? 'min-w-[980px]' : 'w-full'} table-fixed border-collapse`}>
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="w-56 border-b border-r border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Функции / Типы расстройств
                      </th>
                      {displayedColumns.map((column) => {
                        const inDraft = draftFilters.columnIds.includes(column.id);
                        const inActive = activeFilters.columnIds.includes(column.id);

                        return (
                          <th key={column.id} className="border-b border-r border-slate-200 px-1.5 py-1.5 text-left">
                            <button
                              type="button"
                              onClick={() => toggleDraftColumnFilter(column.id)}
                              className={`w-full rounded px-2 py-1.5 text-left text-[11px] font-semibold transition ${
                                inDraft
                                  ? inActive
                                    ? 'bg-blue-100 text-blue-900'
                                    : 'bg-amber-50 text-amber-900'
                                  : inActive
                                    ? 'bg-blue-50 text-blue-800'
                                    : 'text-blue-900 hover:bg-blue-50'
                              }`}
                              title={column.label}
                            >
                              <span style={TEXT_CLAMP_STYLE}>{column.label}</span>
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {displayedRows.map((row) => {
                      const inDraft = draftFilters.rowIds.includes(row.id);
                      const inActive = activeFilters.rowIds.includes(row.id);

                      return (
                        <tr key={row.id} className="align-top">
                          <th className="border-b border-r border-slate-200 bg-white px-1.5 py-1.5 text-left">
                            <button
                              type="button"
                              onClick={() => toggleDraftRowFilter(row.id)}
                              className={`w-full rounded px-2 py-1.5 text-left text-[11px] font-semibold transition ${
                                inDraft
                                  ? inActive
                                    ? 'bg-teal-100 text-teal-900'
                                    : 'bg-amber-50 text-amber-900'
                                  : inActive
                                    ? 'bg-teal-50 text-teal-800'
                                    : 'text-teal-900 hover:bg-teal-50'
                              }`}
                              title={row.label}
                            >
                              <span style={TEXT_CLAMP_STYLE}>{row.label}</span>
                            </button>
                          </th>

                          {displayedColumns.map((column) => {
                            const key = buildDisorderTableCellKey(row.id, column.id);
                            const cellEntries = matrix.get(key) ?? [];
                            const isSelected = selectedCellKeys.has(key);
                            const previewText = cellEntries.length > 0
                              ? buildPreviewText(cellEntries[0].text, normalizedSearch, 120)
                              : '';
                            const cellCommentCount = cellEntries.reduce(
                              (sum, entry) => sum + (commentCountByEntryId.get(entry.id) ?? 0),
                              0
                            );
                            const hasPatopsychology = cellEntries.some((entry) => entry.track === 'patopsychology');
                            const hasPsychiatry = cellEntries.some((entry) => entry.track === 'psychiatry');
                            const isMixedTrack = hasPatopsychology && hasPsychiatry;
                            const cellToneClass = isMixedTrack
                              ? 'border-violet-300'
                              : hasPatopsychology
                                ? 'border-sky-300 bg-sky-50/80'
                                : hasPsychiatry
                                  ? 'border-fuchsia-300 bg-fuchsia-50/80'
                                  : 'border-slate-200 bg-white';
                            const cellToneStyle = isMixedTrack
                              ? { backgroundImage: 'linear-gradient(135deg, rgb(224 242 254) 0%, rgb(224 242 254) 50%, rgb(250 232 255) 50%, rgb(250 232 255) 100%)' }
                              : undefined;

                            return (
                              <td key={key} className="border-b border-r border-slate-200 bg-white p-1.5 align-top">
                                <button
                                  type="button"
                                  onClick={() => handleCellClick(row.id, column.id)}
                                  className={`relative min-h-[72px] w-full rounded-lg border px-2 py-2 text-left text-[11px] transition ${cellToneClass} ${
                                    isSelected
                                      ? 'ring-2 ring-amber-300'
                                      : 'hover:border-blue-300 hover:bg-blue-50/40'
                                  }`}
                                  style={cellToneStyle}
                                >
                                  {isCellSelectionMode && !isMobile && (
                                    <span
                                      className={`absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                                        isSelected
                                          ? 'border-amber-500 bg-amber-200 text-amber-900'
                                          : 'border-slate-300 bg-white text-slate-400'
                                      }`}
                                    >
                                      {isSelected ? '✓' : ''}
                                    </span>
                                  )}

                                  {cellEntries.length === 0 ? (
                                    <p className="text-slate-400">Пусто</p>
                                  ) : (
                                    <>
                                      <p className="break-words pr-5 text-slate-700 [overflow-wrap:anywhere]" style={TEXT_CLAMP_STYLE}>
                                        {renderHighlightedText(previewText, normalizedSearch)}
                                      </p>
                                      <div className="mt-1 flex flex-wrap gap-1 pr-5">
                                        {hasPatopsychology && (
                                          <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-semibold text-sky-800">
                                            Патопсихология
                                          </span>
                                        )}
                                        {hasPsychiatry && (
                                          <span className="rounded-full bg-fuchsia-100 px-1.5 py-0.5 text-[9px] font-semibold text-fuchsia-800">
                                            Психиатрия
                                          </span>
                                        )}
                                      </div>
                                      {cellEntries.length > 1 && (
                                        <p className="mt-1 text-[10px] font-medium text-blue-700">
                                          +{cellEntries.length - 1} ещё
                                        </p>
                                      )}
                                      {cellCommentCount > 0 && (
                                        <p className="mt-1 text-[10px] font-medium text-emerald-700">
                                          💬 {cellCommentCount}
                                        </p>
                                      )}
                                    </>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      <BaseModal
        isOpen={isEntryModalOpen}
        onClose={closeEntryModal}
        title={editingEntryId ? 'Редактировать текст' : 'Добавить текст в пересечение'}
        maxWidth="2xl"
        disabled={saving}
        footer={(
          <>
            <ModalCancelButton onClick={closeEntryModal} disabled={saving}>Отмена</ModalCancelButton>
            <ModalSaveButton onClick={handleSubmit} disabled={!isFormValid} loading={saving}>
              {editingEntryId ? 'Сохранить изменения' : 'Добавить текст'}
            </ModalSaveButton>
          </>
        )}
      >
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-1 text-sm font-semibold text-slate-900">Пересечение</p>
            <p className="text-sm text-slate-700">{formCellLabel}</p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-sm font-semibold text-slate-900">Доп. цвет (опционально)</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {trackOptions.map((option) => (
                <button
                  key={`entry-track-${option.value ?? 'none'}`}
                  type="button"
                  onClick={() => setFormTrack(option.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    formTrack === option.value
                      ? 'border-slate-700 bg-white text-slate-900'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Ваши наблюдения</label>
            <textarea
              value={formText}
              onChange={(event) => setFormText(event.target.value)}
              rows={6}
              maxLength={4000}
              placeholder="Опишите особенности, которые вы заметили..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <div className="mt-1 text-right text-xs text-gray-500">{formText.length}/4000</div>
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submitError}</div>
          )}
        </div>
      </BaseModal>

      <BaseModal
        isOpen={isCellModalOpen}
        onClose={closeCellModal}
        title={activeCell
          ? `${rowLabels.get(activeCell.rowId) ?? activeCell.rowId} × ${columnLabels.get(activeCell.columnId) ?? activeCell.columnId}`
          : 'Пересечение таблицы'}
        maxWidth="2xl"
        disabled={saving}
        footer={(
          <>
            <ModalCancelButton onClick={closeCellModal}>Закрыть</ModalCancelButton>
            {!isMobile && canEditEntries && activeCell && (
              <ModalSaveButton
                onClick={() => {
                  closeCellModal();
                  openCreateFromCell(activeCell.rowId, activeCell.columnId);
                }}
                disabled={saving}
              >
                Добавить в это пересечение
              </ModalSaveButton>
            )}
          </>
        )}
      >
        {activeCellEntries.length === 0 ? (
          <p className="text-sm text-slate-600">В этом пересечении пока нет записей.</p>
        ) : (
          <div className="space-y-3">
            {commentsLoading && (
              <p className="text-xs text-slate-500">Загрузка комментариев преподавателя...</p>
            )}
            {activeCellEntries.map((entry) => (
              <article key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800 [overflow-wrap:anywhere]">
                  {entry.text}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                  {entry.track ? (
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${TRACK_META[entry.track].chipClass}`}>
                      {TRACK_META[entry.track].label}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      Без цвета
                    </span>
                  )}
                  {!isMobile && canEditEntries && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          closeCellModal();
                          startEdit(entry.id);
                        }}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Редактировать
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(entry.id)}
                        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-700 hover:bg-red-100"
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {(() => {
                    const entryComments = commentsByEntryId.get(entry.id) ?? [];
                    if (entryComments.length === 0) {
                      return (
                        <p className="rounded-md bg-white px-3 py-2 text-xs text-slate-500">
                          Комментариев преподавателя пока нет.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {entryComments.map((comment) => (
                          <div key={comment.id} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                            <p className="text-xs font-semibold text-emerald-900">{comment.authorName || 'Преподаватель'}</p>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-emerald-900 [overflow-wrap:anywhere]">
                              {comment.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {canComment && (
                    <div className="rounded-md border border-violet-200 bg-violet-50 p-3">
                      <label htmlFor={`comment-input-${entry.id}`} className="mb-1 block text-xs font-semibold text-violet-900">
                        Комментарий преподавателя
                      </label>
                      <textarea
                        id={`comment-input-${entry.id}`}
                        value={commentDrafts[entry.id] ?? ''}
                        onChange={(event) => setCommentDraft(entry.id, event.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder="Напишите комментарий для студента..."
                        className="w-full rounded-md border border-violet-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-violet-800">
                          {(commentDrafts[entry.id] ?? '').length}/2000
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCommentSubmit(entry.id)}
                          disabled={commentSavingEntryId === entry.id || commentsSaving}
                          className="rounded-md border border-violet-300 bg-white px-2.5 py-1 text-xs font-medium text-violet-900 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {commentSavingEntryId === entry.id || commentsSaving ? 'Сохранение...' : 'Сохранить комментарий'}
                        </button>
                      </div>
                      {(commentsError || commentSubmitErrors[entry.id]) && (
                        <p className="mt-2 text-xs text-red-700">
                          {commentSubmitErrors[entry.id] ?? commentsError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </BaseModal>

      <BaseModal
        isOpen={isBulkModalOpen}
        onClose={closeBulkModal}
        title="Внести один текст в несколько пересечений"
        maxWidth="2xl"
        disabled={saving}
        footer={(
          <>
            <ModalCancelButton onClick={closeBulkModal} disabled={saving}>Отмена</ModalCancelButton>
            <ModalSaveButton onClick={handleBulkSubmit} loading={saving}>
              Сохранить во все выбранные
            </ModalSaveButton>
          </>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Выбрано пересечений: <span className="font-semibold text-slate-900">{selectedCells.length}</span>
          </p>

          <div className="max-h-24 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div className="flex flex-wrap gap-2">
              {selectedCells.map((cell) => {
                const key = buildDisorderTableCellKey(cell.rowId, cell.columnId);
                return (
                  <span key={key} className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {rowLabels.get(cell.rowId)} × {columnLabels.get(cell.columnId)}
                  </span>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Доп. цвет (опционально)</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {trackOptions.map((option) => (
                <button
                  key={`bulk-track-${option.value ?? 'none'}`}
                  type="button"
                  onClick={() => setBulkTrack(option.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    bulkTrack === option.value
                      ? 'border-slate-700 bg-white text-slate-900'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Общий текст</label>
            <textarea
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              rows={6}
              maxLength={4000}
              placeholder="Введите текст, который нужно добавить во все выбранные пересечения"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <div className="mt-1 text-right text-xs text-slate-500">{bulkText.length}/4000</div>
          </div>

          {bulkError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{bulkError}</div>
          )}
        </div>
      </BaseModal>
    </div>
  );
}
