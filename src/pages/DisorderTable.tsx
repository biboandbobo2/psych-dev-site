import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  applyDisorderTableFilters,
  applySelectionModeToEntryInput,
  buildBatchEntryInputsFromCells,
  buildDisorderTableCellKey,
  buildDisorderTableFilters,
  buildDisorderTableFullMatrix,
  DISORDER_TABLE_COLUMNS,
  DISORDER_TABLE_COLUMN_GROUPS,
  DISORDER_TABLE_ROWS,
  isDisorderTableCourse,
  isValidDisorderTableEntryInput,
  resolveSelectionModeFromEntry,
  useDisorderTableEntries,
} from '../features/disorderTable';
import type {
  DisorderTableCellSelection,
  DisorderTableEntry,
  DisorderTableSelectionMode,
} from '../features/disorderTable';
import { BaseModal, ModalCancelButton, ModalSaveButton } from '../components/ui/BaseModal';
import { useCourseStore } from '../stores';

const TEXT_CLAMP_STYLE: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

function areSameSelections(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value) => b.includes(value));
}

export default function DisorderTable() {
  const { currentCourse } = useCourseStore();
  const {
    entries,
    loading,
    saving,
    error,
    createEntry,
    createEntriesBatch,
    updateEntry,
    removeEntry,
  } = useDisorderTableEntries(currentCourse);

  const [isMobile, setIsMobile] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formSelectionMode, setFormSelectionMode] = useState<DisorderTableSelectionMode>('one-row-many-columns');
  const [formRowIds, setFormRowIds] = useState<string[]>([]);
  const [formColumnIds, setFormColumnIds] = useState<string[]>([]);
  const [formText, setFormText] = useState('');

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
  const [bulkError, setBulkError] = useState<string | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const rowLabels = useMemo(() => new Map(DISORDER_TABLE_ROWS.map((row) => [row.id, row.label])), []);
  const columnLabels = useMemo(() => new Map(DISORDER_TABLE_COLUMNS.map((column) => [column.id, column.label])), []);
  const columnGroupsWithColumns = useMemo(
    () =>
      DISORDER_TABLE_COLUMN_GROUPS.map((group) => ({
        ...group,
        columns: DISORDER_TABLE_COLUMNS.filter((column) => column.groupId === group.id),
      })),
    []
  );

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

  const formPreviewInput = applySelectionModeToEntryInput(
    { rowIds: formRowIds, columnIds: formColumnIds, text: formText },
    formSelectionMode
  );
  const isFormValid = isValidDisorderTableEntryInput(formPreviewInput);
  const singleSelectedRowId = formRowIds[0] ?? '';
  const singleSelectedColumnId = formColumnIds[0] ?? '';
  const canChooseDisorders = formSelectionMode === 'one-row-many-columns' && formRowIds.length === 1;
  const canChooseFunctions = formSelectionMode === 'one-column-many-rows' && formColumnIds.length === 1;

  useEffect(() => {
    if (!activeCell) return;
    const rowVisible = displayedRows.some((row) => row.id === activeCell.rowId);
    const columnVisible = displayedColumns.some((column) => column.id === activeCell.columnId);
    if (!rowVisible || !columnVisible) {
      setActiveCell(null);
      setIsCellModalOpen(false);
    }
  }, [activeCell, displayedRows, displayedColumns]);

  const toggleId = (ids: string[], id: string, setter: (next: string[]) => void) => {
    if (ids.includes(id)) {
      setter(ids.filter((item) => item !== id));
      return;
    }
    setter([...ids, id]);
  };

  const resetForm = () => {
    setEditingEntryId(null);
    setFormSelectionMode('one-row-many-columns');
    setFormRowIds([]);
    setFormColumnIds([]);
    setFormText('');
    setSubmitError(null);
  };

  const openCreateModal = () => {
    if (isMobile) return;
    resetForm();
    setIsEntryModalOpen(true);
  };

  const openCreateFromCell = (rowId: string, columnId: string) => {
    if (isMobile) return;
    resetForm();
    setFormSelectionMode('one-row-many-columns');
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
    if (isMobile) return;
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;

    const mode = resolveSelectionModeFromEntry(entry);
    const normalizedEntry = applySelectionModeToEntryInput(
      {
        rowIds: entry.rowIds,
        columnIds: entry.columnIds,
        text: entry.text,
      },
      mode
    );

    setEditingEntryId(entry.id);
    setFormSelectionMode(mode);
    setFormRowIds(normalizedEntry.rowIds);
    setFormColumnIds(normalizedEntry.columnIds);
    setFormText(normalizedEntry.text);
    setSubmitError(null);
    setIsEntryModalOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    const normalizedInput = applySelectionModeToEntryInput(
      {
        rowIds: formRowIds,
        columnIds: formColumnIds,
        text: formText,
      },
      formSelectionMode
    );

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
    if (isMobile) return;
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
    setIsCellSelectionMode((prev) => {
      const next = !prev;
      if (!next) setSelectedCells([]);
      return next;
    });
  };

  const openBulkModal = () => {
    if (isMobile || selectedCells.length === 0) return;
    setBulkError(null);
    setBulkText('');
    setIsBulkModalOpen(true);
  };

  const closeBulkModal = () => {
    if (saving) return;
    setIsBulkModalOpen(false);
    setBulkError(null);
    setBulkText('');
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
      const batchInputs = buildBatchEntryInputsFromCells(selectedCells, bulkText);
      await createEntriesBatch(batchInputs);
      closeBulkModal();
      setSelectedCells([]);
      setIsCellSelectionMode(false);
    } catch (err: any) {
      setBulkError(err?.message || 'Не удалось сохранить текст в выбранные пересечения');
    }
  };

  const renderFunctionSelection = (
    selectedIds: string[],
    setSelectedIds: (next: string[]) => void,
    disabled = false
  ) => (
    <section className="rounded-xl border-2 border-teal-200 bg-teal-50/70 p-4">
      <h3 className="mb-2 text-sm font-semibold text-teal-900">Нарушенные функции и сферы</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {DISORDER_TABLE_ROWS.map((row) => (
          <label
            key={row.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              disabled
                ? 'cursor-not-allowed border-teal-100 bg-white/60 text-teal-300'
                : 'border-teal-200 bg-white text-teal-900'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(row.id)}
              onChange={() => toggleId(selectedIds, row.id, setSelectedIds)}
              className="h-4 w-4"
              disabled={disabled}
            />
            <span>{row.label}</span>
          </label>
        ))}
      </div>
    </section>
  );

  const renderDisorderSelection = (
    selectedIds: string[],
    setSelectedIds: (next: string[]) => void,
    disabled = false
  ) => (
    <section className="rounded-xl border-2 border-blue-200 bg-blue-50/70 p-4">
      <h3 className="mb-2 text-sm font-semibold text-blue-900">Типы расстройств</h3>
      <div className="space-y-3">
        {columnGroupsWithColumns.map((group) => (
          <div key={group.id}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600">{group.label}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {group.columns.map((column) => (
                <label
                  key={column.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    disabled
                      ? 'cursor-not-allowed border-blue-100 bg-white/60 text-blue-300'
                      : 'border-blue-200 bg-white text-blue-900'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(column.id)}
                    onChange={() => toggleId(selectedIds, column.id, setSelectedIds)}
                    className="h-4 w-4"
                    disabled={disabled}
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  const renderFunctionDropdown = (selectedId: string, onSelect: (value: string) => void) => (
    <section className="rounded-xl border-2 border-teal-300 bg-teal-50 p-4">
      <label className="mb-2 block text-sm font-semibold text-teal-900">Выберите одну функцию</label>
      <select
        value={selectedId}
        onChange={(event) => onSelect(event.target.value)}
        className="w-full rounded-lg border border-teal-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
      >
        <option value="">Выберите функцию...</option>
        {DISORDER_TABLE_ROWS.map((row) => (
          <option key={row.id} value={row.id}>
            {row.label}
          </option>
        ))}
      </select>
    </section>
  );

  const renderDisorderDropdown = (selectedId: string, onSelect: (value: string) => void) => (
    <section className="rounded-xl border-2 border-blue-300 bg-blue-50 p-4">
      <label className="mb-2 block text-sm font-semibold text-blue-900">Выберите один тип расстройства</label>
      <select
        value={selectedId}
        onChange={(event) => onSelect(event.target.value)}
        className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="">Выберите тип расстройства...</option>
        {columnGroupsWithColumns.map((group) => (
          <optgroup key={group.id} label={group.label}>
            {group.columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </section>
  );

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
      <div className="flex h-full flex-col gap-3 p-3 sm:p-4">
        <section className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Link
              to="/profile"
              className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Профиль
            </Link>

            {!isMobile && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Новая запись
              </button>
            )}

            {!isMobile && (
              <button
                type="button"
                onClick={toggleCellSelectionMode}
                className={`inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  isCellSelectionMode
                    ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isCellSelectionMode ? 'Выделение включено' : 'Выбрать несколько ячеек'}
              </button>
            )}

            {!isMobile && isCellSelectionMode && (
              <button
                type="button"
                onClick={openBulkModal}
                disabled={selectedCells.length === 0}
                className="inline-flex rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Внести текст в выбранные ({selectedCells.length})
              </button>
            )}

            <button
              type="button"
              onClick={applyDraftFilters}
              disabled={!canApplyFilters}
              className="inline-flex rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Применить фильтр
            </button>

            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
            >
              Сбросить
            </button>

            <label className="ml-auto flex min-w-[220px] flex-1 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 sm:max-w-[420px]">
              <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Поиск</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSelectedCells([]);
                }}
                placeholder="Поиск по тексту записей"
                className="w-full border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          {isMobile && (
            <p className="mb-2 text-sm text-slate-600">
              Мобильный режим: доступен просмотр таблицы и содержимого ячеек. Редактирование доступно на компьютере.
            </p>
          )}

          {hasActiveFilters || hasActiveSearch ? (
            <div className="flex flex-wrap gap-2 text-xs">
              {hasActiveSearch && (
                <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                  Поиск: {searchQuery.trim()}
                </span>
              )}
              {activeFilters.columnIds.map((columnId) => (
                <span key={`active-column-${columnId}`} className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                  {columnLabels.get(columnId) ?? columnId}
                </span>
              ))}
              {activeFilters.rowIds.map((rowId) => (
                <span key={`active-row-${rowId}`} className="rounded-full bg-teal-50 px-3 py-1 font-medium text-teal-700">
                  {rowLabels.get(rowId) ?? rowId}
                </span>
              ))}
            </div>
          ) : null}

          {(error || listError) && (
            <div className="mt-3 space-y-2">
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
            <div className="shrink-0 border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
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

                            return (
                              <td key={key} className="border-b border-r border-slate-200 bg-white p-1.5 align-top">
                                <button
                                  type="button"
                                  onClick={() => handleCellClick(row.id, column.id)}
                                  className={`relative min-h-[72px] w-full rounded-lg border px-2 py-2 text-left text-[11px] transition ${
                                    isSelected
                                      ? 'border-amber-400 bg-amber-50'
                                      : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                                  }`}
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
                                      <p className="pr-5 text-slate-700" style={TEXT_CLAMP_STYLE}>
                                        {cellEntries[0].text}
                                      </p>
                                      {cellEntries.length > 1 && (
                                        <p className="mt-1 text-[10px] font-medium text-blue-700">
                                          +{cellEntries.length - 1} ещё
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
        title={editingEntryId ? 'Редактировать запись' : 'Новая запись'}
        maxWidth="2xl"
        disabled={saving}
        footer={(
          <>
            <ModalCancelButton onClick={closeEntryModal} disabled={saving}>Отмена</ModalCancelButton>
            <ModalSaveButton onClick={handleSubmit} disabled={!isFormValid} loading={saving}>
              {editingEntryId ? 'Сохранить изменения' : 'Добавить запись'}
            </ModalSaveButton>
          </>
        )}
      >
        <div className="space-y-5">
          <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-semibold text-amber-900">Режим выбора</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFormSelectionMode('one-row-many-columns')}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  formSelectionMode === 'one-row-many-columns'
                    ? 'border-amber-500 bg-white font-semibold text-amber-900'
                    : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                1 функция + несколько расстройств
              </button>
              <button
                type="button"
                onClick={() => setFormSelectionMode('one-column-many-rows')}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  formSelectionMode === 'one-column-many-rows'
                    ? 'border-amber-500 bg-white font-semibold text-amber-900'
                    : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                1 расстройство + несколько функций
              </button>
            </div>
          </section>

          {formSelectionMode === 'one-row-many-columns' ? (
            <>
              {renderFunctionDropdown(singleSelectedRowId, (value) => setFormRowIds(value ? [value] : []))}
              {!canChooseDisorders ? (
                <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/60 p-4 text-sm text-blue-800">
                  Выберите одну функцию в выпадающем списке, чтобы открыть список типов расстройств.
                </div>
              ) : (
                renderDisorderSelection(formColumnIds, setFormColumnIds)
              )}
            </>
          ) : (
            <>
              {renderDisorderDropdown(singleSelectedColumnId, (value) => setFormColumnIds(value ? [value] : []))}
              {!canChooseFunctions ? (
                <div className="rounded-xl border border-dashed border-teal-300 bg-teal-50/60 p-4 text-sm text-teal-800">
                  Выберите один тип расстройства в выпадающем списке, чтобы открыть список функций.
                </div>
              ) : (
                renderFunctionSelection(formRowIds, setFormRowIds)
              )}
            </>
          )}

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
            {!isMobile && activeCell && (
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
            {activeCellEntries.map((entry) => (
              <article key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{entry.text}</p>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>Обновлено: {entry.updatedAt.toLocaleString('ru-RU')}</span>
                  {!isMobile && (
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
