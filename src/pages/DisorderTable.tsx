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
import { useCourseStore } from '../stores';

export default function DisorderTable() {
  const { currentCourse } = useCourseStore();
  const { entries, loading, saving, error, createEntry, updateEntry, removeEntry } = useDisorderTableEntries(currentCourse);
  const [formRowIds, setFormRowIds] = useState<string[]>([]);
  const [formColumnIds, setFormColumnIds] = useState<string[]>([]);
  const [formText, setFormText] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [filterRowIds, setFilterRowIds] = useState<string[]>([]);
  const [filterColumnIds, setFilterColumnIds] = useState<string[]>([]);

  const filteredEntries = useMemo(
    () => applyDisorderTableFilters(entries, { rowIds: filterRowIds, columnIds: filterColumnIds }),
    [entries, filterRowIds, filterColumnIds]
  );

  const rowLabels = useMemo(
    () => new Map(DISORDER_TABLE_ROWS.map((row) => [row.id, row.label])),
    []
  );

  const columnLabels = useMemo(
    () => new Map(DISORDER_TABLE_COLUMNS.map((column) => [column.id, column.label])),
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
    setFormRowIds([]);
    setFormColumnIds([]);
    setFormText('');
    setSubmitError(null);
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
      resetForm();
    } catch (err: any) {
      setSubmitError(err?.message || 'Не удалось сохранить запись');
    }
  };

  const startEdit = (entryId: string) => {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    setEditingEntryId(entry.id);
    setFormRowIds(entry.rowIds);
    setFormColumnIds(entry.columnIds);
    setFormText(entry.text);
    setSubmitError(null);
  };

  const handleRemove = async (entryId: string) => {
    const confirmed = window.confirm('Удалить эту запись?');
    if (!confirmed) return;
    await removeEntry(entryId);
    if (editingEntryId === entryId) {
      resetForm();
    }
  };

  const isFormValid = formRowIds.length > 0 && formColumnIds.length > 0 && formText.trim().length >= 3;

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
          Выберите один или несколько столбцов и строк, а затем зафиксируйте наблюдение по их пересечению.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Фильтры</h2>
            <button
              type="button"
              onClick={() => {
                setFilterRowIds([]);
                setFilterColumnIds([]);
              }}
              className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
            >
              Сбросить
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">По строкам</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {DISORDER_TABLE_ROWS.map((row) => (
                  <label key={row.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={filterRowIds.includes(row.id)}
                      onChange={() => toggleId(filterRowIds, row.id, setFilterRowIds)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">{row.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">По столбцам</h3>
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
                              checked={filterColumnIds.includes(column.id)}
                              onChange={() => toggleId(filterColumnIds, column.id, setFilterColumnIds)}
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
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingEntryId ? 'Редактировать запись' : 'Новая запись'}
            </h2>
            {editingEntryId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-medium text-gray-600 transition hover:text-gray-800"
              >
                Отменить редактирование
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Выберите строки</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {DISORDER_TABLE_ROWS.map((row) => (
                  <label key={row.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={formRowIds.includes(row.id)}
                      onChange={() => toggleId(formRowIds, row.id, setFormRowIds)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">{row.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Выберите столбцы</h3>
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
                              checked={formColumnIds.includes(column.id)}
                              onChange={() => toggleId(formColumnIds, column.id, setFormColumnIds)}
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

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Ваши мысли</label>
              <textarea
                value={formText}
                onChange={(event) => setFormText(event.target.value)}
                rows={5}
                maxLength={4000}
                placeholder="Опишите наблюдения по выбранным строкам и столбцам..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="mt-1 text-right text-xs text-gray-500">{formText.length}/4000</div>
            </div>

            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submitError}</div>
            )}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || saving}
              className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {saving ? 'Сохранение...' : editingEntryId ? 'Сохранить изменения' : 'Добавить запись'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Записи</h2>
          <span className="text-sm text-gray-500">
            Показано: {filteredEntries.length} из {entries.length}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Загрузка записей...</p>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
            По текущим фильтрам ничего не найдено. Измените фильтры или добавьте новую запись.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-gray-200 p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {entry.columnIds.map((columnId) => (
                    <span key={`${entry.id}-column-${columnId}`} className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                      {columnLabels.get(columnId) ?? columnId}
                    </span>
                  ))}
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  {entry.rowIds.map((rowId) => (
                    <span key={`${entry.id}-row-${rowId}`} className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700">
                      {rowLabels.get(rowId) ?? rowId}
                    </span>
                  ))}
                </div>

                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{entry.text}</p>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">
                    Обновлено: {entry.updatedAt.toLocaleString('ru-RU')}
                  </span>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Столбцы (расстройства)</h2>
          <div className="space-y-4">
            {DISORDER_TABLE_COLUMN_GROUPS.map((group) => {
              const columns = DISORDER_TABLE_COLUMNS.filter((column) => column.groupId === group.id);
              return (
                <div key={group.id}>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{group.label}</h3>
                  <div className="flex flex-wrap gap-2">
                    {columns.map((column) => (
                      <span key={column.id} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                        {column.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Строки (нарушенные сферы и функции)</h2>
          <div className="flex flex-wrap gap-2">
            {DISORDER_TABLE_ROWS.map((row) => (
              <span key={row.id} className="rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-700">
                {row.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
