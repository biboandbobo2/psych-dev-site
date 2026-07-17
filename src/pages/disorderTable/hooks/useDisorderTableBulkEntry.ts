import { useState } from 'react';
import {
  buildBatchEntryInputsFromCells,
  type DisorderTableCellSelection,
  type DisorderTableEntryInput,
} from '../../../features/disorderTable';
import type { OptionalTrack } from '../utils/trackMeta';

interface UseDisorderTableBulkEntryParams {
  isMobile: boolean;
  canEditEntries: boolean;
  saving: boolean;
  selectedCells: DisorderTableCellSelection[];
  createEntriesBatch: (inputs: DisorderTableEntryInput[]) => Promise<unknown>;
  /** Вызывается после успешного batch-сохранения (сброс выбора ячеек). */
  onSubmitted: () => void;
}

export function useDisorderTableBulkEntry({
  isMobile,
  canEditEntries,
  saving,
  selectedCells,
  createEntriesBatch,
  onSubmitted,
}: UseDisorderTableBulkEntryParams) {
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkTrack, setBulkTrack] = useState<OptionalTrack>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

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
      onSubmitted();
    } catch (err) {
      setBulkError(
        err instanceof Error ? err.message : 'Не удалось сохранить текст в выбранные пересечения',
      );
    }
  };

  return {
    isBulkModalOpen,
    bulkText,
    setBulkText,
    bulkTrack,
    setBulkTrack,
    bulkError,
    openBulkModal,
    closeBulkModal,
    handleBulkSubmit,
  };
}
