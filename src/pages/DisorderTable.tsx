import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  applyDisorderTableFilters,
  DISORDER_TABLE_COLUMNS,
  DISORDER_TABLE_COLUMN_GROUPS,
  DISORDER_TABLE_ROWS,
  isDisorderTableCourse,
  useDisorderTableEntries,
} from '../features/disorderTable';
import { BaseModal, ModalCancelButton, ModalSaveButton } from '../components/ui/BaseModal';
import { useCourseStore } from '../stores';

export default function DisorderTable() {
  const { currentCourse } = useCourseStore();
  const { entries, loading, saving, error, createEntry, updateEntry, removeEntry } = useDisorderTableEntries(currentCourse);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);

  const [formRowIds, setFormRowIds] = useState<string[]>([]);
  const [formColumnIds, setFormColumnIds] = useState<string[]>([]);
  const [formText, setFormText] = useState('');
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

  const rowLabels = useMemo(() => new Map(DISORDER_TABLE_ROWS.map((row) => [row.id, row.label])), []);
  const columnLabels = useMemo(() => new Map(DISORDER_TABLE_COLUMNS.map((column) => [column.id, column.label])), []);

  const toggleId = (ids: string[], id: string, setter: (next: string[]) => void) => {
    if (ids.includes(id)) {
      setter(ids.filter((item) => item !== id));
      return;
    }
    setter([...ids, id]);
  };

  const resetForm = () => {
    setEditingEntryId(null);
    setFormRowIds([]);
    setFormColumnIds([]);
    setFormText('');
    setSubmitError(null);
  };

  const openCreateModal = () => {
    resetForm();
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
    setEditingEntryId(entry.id);
    setFormRowIds(entry.rowIds);
    setFormColumnIds(entry.columnIds);
    setFormText(entry.text);
    setSubmitError(null);
    setIsEntryModalOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      if (editingEntryId) {
        await updateEntry(editingEntryId, {
          rowIds: formRowIds,
          columnIds: formColumnIds,
          text: formText,
        });
      } else {
        await createEntry({
          rowIds: formRowIds,
          columnIds: formColumnIds,
          text: formText,
        });
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

  const isFormValid = formRowIds.length > 0 && formColumnIds.length > 0 && formText.trim().length >= 3;
  const hasActiveFilters = filterRowIds.length > 0 || filterColumnIds.length > 0;

  const renderFunctionSelection = (
    selectedIds: string[],
    setSelectedIds: (next: string[]) => void
  ) => (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Нарушенные функции и сферы</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {DISORDER_TABLE_ROWS.map((row) => (
          <label key={row.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <input
              type="checkbox"
              checked={selectedIds.includes(row.id)}
              onChange={() => toggleId(selectedIds, row.id, setSelectedIds)}
              className="h-4 w-4"
            />
            <span className="text-sm text-gray-700">{row.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderDisorderSelection = (
    selectedIds: string[],
    setSelectedIds: (next: string[]) => void
  ) => (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Типы расстройств</h3>
      <div className="space-y-3">
        {DISORDER_TABLE_COLUMN_GROUPS.map((group) => {
          const columns = DISORDER_TABLE_COLUMNS.filter((column) => column.groupId === group.id);
          return (
            <div key={group.id}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{group.label}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {columns.map((column) => (
                  <label key={column.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(column.id)}
                      onChange={() => toggleId(selectedIds, column.id, setSelectedIds)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">{column.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
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
          <p>2. Выберите нужные категории и опишите наблюдение.</p>
          <p>3. Используйте «Фильтры», чтобы быстро найти нужные записи.</p>
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
          {renderDisorderSelection(formColumnIds, setFormColumnIds)}
          {renderFunctionSelection(formRowIds, setFormRowIds)}

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
