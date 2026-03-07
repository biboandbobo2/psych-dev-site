import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  applySelectionModeToEntryInput,
  applyDisorderTableFilters,
  buildDisorderTableCellKey,
  buildDisorderTableMatrix,
  DISORDER_TABLE_COLUMNS,
  DISORDER_TABLE_COLUMN_GROUPS,
  DISORDER_TABLE_ROWS,
  isDisorderTableCourse,
  isValidDisorderTableEntryInput,
  resolveSelectionModeFromEntry,
  useDisorderTableEntries,
} from '../features/disorderTable';
import type { DisorderTableSelectionMode } from '../features/disorderTable';
import { BaseModal, ModalCancelButton, ModalSaveButton } from '../components/ui/BaseModal';
import { useCourseStore } from '../stores';

export default function DisorderTable() {
  const { currentCourse } = useCourseStore();
  const { entries, loading, saving, error, createEntry, updateEntry, removeEntry } = useDisorderTableEntries(currentCourse);

  const [viewMode, setViewMode] = useState<'table' | 'list'>('table');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);

  const [formRowIds, setFormRowIds] = useState<string[]>([]);
  const [formColumnIds, setFormColumnIds] = useState<string[]>([]);
  const [formText, setFormText] = useState('');
  const [formSelectionMode, setFormSelectionMode] = useState<DisorderTableSelectionMode>('one-row-many-columns');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [filterRowIds, setFilterRowIds] = useState<string[]>([]);
  const [filterColumnIds, setFilterColumnIds] = useState<string[]>([]);
  const [filterDraftRowIds, setFilterDraftRowIds] = useState<string[]>([]);
  const [filterDraftColumnIds, setFilterDraftColumnIds] = useState<string[]>([]);

  const [listError, setListError] = useState<string | null>(null);

  const filteredEntries = useMemo(
    () => applyDisorderTableFilters(entries, { rowIds: filterRowIds, columnIds: filterColumnIds }),
    [entries, filterRowIds, filterColumnIds]
  );
  const tableMatrix = useMemo(() => buildDisorderTableMatrix(filteredEntries), [filteredEntries]);

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
    resetForm();
    setIsEntryModalOpen(true);
  };

  const openCreateFromCell = (rowId: string, columnId: string) => {
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

  const openFiltersModal = () => {
    setFilterDraftRowIds(filterRowIds);
    setFilterDraftColumnIds(filterColumnIds);
    setIsFiltersModalOpen(true);
  };

  const closeFiltersModal = () => {
    setIsFiltersModalOpen(false);
  };

  const applyFilters = () => {
    setFilterRowIds(filterDraftRowIds);
    setFilterColumnIds(filterDraftColumnIds);
    setIsFiltersModalOpen(false);
  };

  const resetFilters = () => {
    setFilterRowIds([]);
    setFilterColumnIds([]);
    setFilterDraftRowIds([]);
    setFilterDraftColumnIds([]);
  };

  const startEdit = (entryId: string) => {
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

  const setSingleSelection = (
    value: string,
    setSelectedIds: (next: string[]) => void
  ) => {
    setSelectedIds(value ? [value] : []);
  };

  const changeEntrySelectionMode = (mode: DisorderTableSelectionMode) => {
    if (mode === formSelectionMode) return;
    setFormSelectionMode(mode);
    setFormRowIds([]);
    setFormColumnIds([]);
    setSubmitError(null);
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

  const formPreviewInput = applySelectionModeToEntryInput(
    {
      rowIds: formRowIds,
      columnIds: formColumnIds,
      text: formText,
    },
    formSelectionMode
  );
  const isFormValid = isValidDisorderTableEntryInput(formPreviewInput);
  const hasActiveFilters = filterRowIds.length > 0 || filterColumnIds.length > 0;
  const singleSelectedRowId = formRowIds[0] ?? '';
  const singleSelectedColumnId = formColumnIds[0] ?? '';
  const canChooseDisorders = formSelectionMode === 'one-row-many-columns' && formRowIds.length === 1;
  const canChooseFunctions = formSelectionMode === 'one-column-many-rows' && formColumnIds.length === 1;

  const truncateText = (text: string, max = 100) => (text.length > max ? `${text.slice(0, max)}...` : text);

  const visibleRowIds = useMemo(() => {
    if (filterRowIds.length > 0) return filterRowIds;
    return Array.from(new Set(filteredEntries.flatMap((entry) => entry.rowIds)));
  }, [filterRowIds, filteredEntries]);

  const visibleColumnIds = useMemo(() => {
    if (filterColumnIds.length > 0) return filterColumnIds;
    return Array.from(new Set(filteredEntries.flatMap((entry) => entry.columnIds)));
  }, [filterColumnIds, filteredEntries]);

  const visibleRows = useMemo(
    () => DISORDER_TABLE_ROWS.filter((row) => visibleRowIds.includes(row.id)),
    [visibleRowIds]
  );
  const visibleColumns = useMemo(
    () => DISORDER_TABLE_COLUMNS.filter((column) => visibleColumnIds.includes(column.id)),
    [visibleColumnIds]
  );

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

  const renderMatrixCell = (rowId: string, columnId: string) => {
    const key = buildDisorderTableCellKey(rowId, columnId);
    const cellEntries = tableMatrix.get(key) ?? [];

    if (cellEntries.length === 0) {
      return (
        <button
          type="button"
          onClick={() => openCreateFromCell(rowId, columnId)}
          className="rounded-md border border-dashed border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          + Добавить
        </button>
      );
    }

    return (
      <div className="space-y-1.5">
        {cellEntries.slice(0, 2).map((entry) => (
          <button
            key={`${key}-${entry.id}`}
            type="button"
            onClick={() => startEdit(entry.id)}
            className="group w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40"
            title="Открыть запись для редактирования"
          >
            <p className="text-[11px] leading-snug text-slate-700">{truncateText(entry.text)}</p>
            <div className="mt-1.5 text-right">
              <span className="text-[10px] font-medium text-blue-700 opacity-0 transition group-hover:opacity-100">
                Редактировать
              </span>
            </div>
          </button>
        ))}
        {cellEntries.length > 2 && (
          <p className="text-[11px] font-medium text-blue-700">+{cellEntries.length - 2} ещё записей</p>
        )}
      </div>
    );
  };

  const renderTableView = () => (
    <div className="rounded-2xl bg-white p-6 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Табличный вид</h2>
        <span className="text-sm text-gray-500">
          Показано: {filteredEntries.length} из {entries.length}
        </span>
      </div>
      <p className="mb-2 text-sm text-gray-600">
        Нажмите на текст в ячейке, чтобы открыть запись на редактирование.
      </p>
      <p className="mb-4 text-xs text-gray-500">
        В таблице показываются только категории из активных фильтров или из текущих найденных записей.
      </p>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {listError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{listError}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Загрузка записей...</p>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
          {entries.length === 0
            ? 'Пока нет записей. Нажмите «Новая запись», чтобы добавить первую заметку.'
            : 'По текущим фильтрам ничего не найдено. Измените фильтры или сбросьте их.'}
        </div>
      ) : visibleRows.length === 0 || visibleColumns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
          Для выбранных фильтров нет подходящих строк или типов расстройств.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="w-[180px] border-b border-r border-slate-200 bg-slate-100 px-2.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Функции / Типы расстройств
                </th>
                {visibleColumns.map((column) => (
                  <th
                    key={column.id}
                    className="w-[155px] border-b border-r border-slate-200 px-2.5 py-2.5 text-left text-[11px] font-semibold text-blue-900"
                    title={column.label}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} className="align-top">
                  <th
                    className="border-b border-r border-slate-200 bg-white px-2.5 py-2.5 text-left text-[11px] font-semibold text-teal-900"
                    title={row.label}
                  >
                    {row.label}
                  </th>
                  {visibleColumns.map((column) => (
                    <td key={`${row.id}-${column.id}`} className="border-b border-r border-slate-200 bg-white px-1.5 py-1.5 align-top">
                      {renderMatrixCell(row.id, column.id)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
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
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-gray-900">Таблица по расстройствам</h1>
        <p className="mt-2 text-sm text-gray-600">
          Выберите типы расстройств и наблюдаемые функции, затем зафиксируйте свои наблюдения в записи.
        </p>
        <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">Как пользоваться:</p>
          <p>1. Нажмите «Новая запись».</p>
          <p>2. Выберите режим: одна функция + несколько расстройств или наоборот.</p>
          <p>3. Сначала выберите один пункт в выпадающем списке, после этого откроется второй список.</p>
          <p>4. Опишите наблюдение и сохраните запись.</p>
          <p>5. Переключайте режим «Таблица / Список» для разных сценариев просмотра.</p>
          <p>6. Используйте «Фильтры», чтобы быстро найти нужные записи.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Новая запись
        </button>
        <button
          type="button"
          onClick={openFiltersModal}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Фильтры
        </button>
        <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 bg-white">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 text-sm font-medium transition ${
              viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Таблица
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm font-medium transition ${
              viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Список
          </button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            Сбросить фильтры
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="rounded-2xl bg-white p-4 shadow-xl">
          <p className="mb-2 text-sm font-semibold text-gray-700">Активные фильтры</p>
          <div className="flex flex-wrap gap-2">
            {filterColumnIds.map((columnId) => (
              <span key={`filter-column-${columnId}`} className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                {columnLabels.get(columnId) ?? columnId}
              </span>
            ))}
            {filterRowIds.map((rowId) => (
              <span key={`filter-row-${rowId}`} className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700">
                {rowLabels.get(rowId) ?? rowId}
              </span>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'table' ? renderTableView() : (
      <div className="rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Ваши записи</h2>
          <span className="text-sm text-gray-500">
            Показано: {filteredEntries.length} из {entries.length}
          </span>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {listError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{listError}</div>
        )}

        {loading ? (
          <p className="text-sm text-gray-600">Загрузка записей...</p>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
            {entries.length === 0
              ? 'Пока нет записей. Нажмите «Новая запись», чтобы добавить первую заметку.'
              : 'По текущим фильтрам ничего не найдено. Измените фильтры или сбросьте их.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-gray-200 p-4">
                <div className="mb-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Типы расстройств</p>
                  <div className="flex flex-wrap gap-2">
                    {entry.columnIds.map((columnId) => (
                      <span key={`${entry.id}-column-${columnId}`} className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                        {columnLabels.get(columnId) ?? columnId}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Нарушенные функции и сферы</p>
                  <div className="flex flex-wrap gap-2">
                    {entry.rowIds.map((rowId) => (
                      <span key={`${entry.id}-row-${rowId}`} className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700">
                        {rowLabels.get(rowId) ?? rowId}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{entry.text}</p>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">Обновлено: {entry.updatedAt.toLocaleString('ru-RU')}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(entry.id)}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(entry.id)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      )}

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
                onClick={() => changeEntrySelectionMode('one-row-many-columns')}
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
                onClick={() => changeEntrySelectionMode('one-column-many-rows')}
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
              {renderFunctionDropdown(singleSelectedRowId, (value) => setSingleSelection(value, setFormRowIds))}
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
              {renderDisorderDropdown(singleSelectedColumnId, (value) => setSingleSelection(value, setFormColumnIds))}
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
        isOpen={isFiltersModalOpen}
        onClose={closeFiltersModal}
        title="Фильтры записей"
        maxWidth="2xl"
        footer={(
          <>
            <ModalCancelButton onClick={closeFiltersModal}>Закрыть</ModalCancelButton>
            <ModalCancelButton
              onClick={() => {
                setFilterDraftRowIds([]);
                setFilterDraftColumnIds([]);
              }}
            >
              Очистить
            </ModalCancelButton>
            <ModalSaveButton onClick={applyFilters}>Применить</ModalSaveButton>
          </>
        )}
      >
        <div className="space-y-5">
          {renderDisorderSelection(filterDraftColumnIds, setFilterDraftColumnIds)}
          {renderFunctionSelection(filterDraftRowIds, setFilterDraftRowIds)}
        </div>
      </BaseModal>
    </div>
  );
}
