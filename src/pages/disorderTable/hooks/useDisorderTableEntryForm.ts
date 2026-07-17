import { useMemo, useState } from 'react';
import {
  isValidDisorderTableEntryInput,
  type DisorderTableCellSelection,
  type DisorderTableEntry,
  type DisorderTableEntryInput,
} from '../../../features/disorderTable';
import type { OptionalTrack } from '../utils/trackMeta';

interface UseDisorderTableEntryFormParams {
  isMobile: boolean;
  canEditEntries: boolean;
  entries: DisorderTableEntry[];
  saving: boolean;
  activeCell: DisorderTableCellSelection | null;
  createEntry: (input: DisorderTableEntryInput) => Promise<unknown>;
  updateEntry: (entryId: string, input: DisorderTableEntryInput) => Promise<unknown>;
  removeEntry: (entryId: string) => Promise<unknown>;
  rowLabels: Map<string, string>;
  columnLabels: Map<string, string>;
}

export function useDisorderTableEntryForm({
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
}: UseDisorderTableEntryFormParams) {
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [formRowIds, setFormRowIds] = useState<string[]>([]);
  const [formColumnIds, setFormColumnIds] = useState<string[]>([]);
  const [formText, setFormText] = useState('');
  const [formTrack, setFormTrack] = useState<OptionalTrack>(null);

  const isFormValid = isValidDisorderTableEntryInput({
    rowIds: formRowIds,
    columnIds: formColumnIds,
    text: formText,
    track: formTrack,
  });

  const formCellLabel = useMemo(() => {
    const rowId = formRowIds[0];
    const columnId = formColumnIds[0];
    if (!rowId || !columnId) return 'Пересечение не выбрано';
    const rowLabel = rowLabels.get(rowId) ?? rowId;
    const columnLabel = columnLabels.get(columnId) ?? columnId;
    return `${rowLabel} × ${columnLabel}`;
  }, [formRowIds, formColumnIds, rowLabels, columnLabels]);

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

  return {
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
  };
}
