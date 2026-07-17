import { useCallback, useMemo, useState } from 'react';
import {
  buildDisorderTableCellKey,
  type DisorderTableCellSelection,
} from '../../../features/disorderTable';

interface UseDisorderTableSelectionParams {
  isMobile: boolean;
  canEditEntries: boolean;
}

export function useDisorderTableSelection({
  isMobile,
  canEditEntries,
}: UseDisorderTableSelectionParams) {
  const [activeCell, setActiveCell] = useState<DisorderTableCellSelection | null>(null);
  const [isCellModalOpen, setIsCellModalOpen] = useState(false);
  const [isCellSelectionMode, setIsCellSelectionMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState<DisorderTableCellSelection[]>([]);

  const selectedCellKeys = useMemo(
    () => new Set(selectedCells.map((cell) => buildDisorderTableCellKey(cell.rowId, cell.columnId))),
    [selectedCells],
  );

  const openCellModal = (rowId: string, columnId: string) => {
    setActiveCell({ rowId, columnId });
    setIsCellModalOpen(true);
  };

  const closeCellModal = useCallback(() => {
    setIsCellModalOpen(false);
    setActiveCell(null);
  }, []);

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

  const toggleCellSelectionMode = () => {
    if (!canEditEntries) return;
    setIsCellSelectionMode((prev) => {
      const next = !prev;
      if (!next) setSelectedCells([]);
      return next;
    });
  };

  const clearSelectedCells = useCallback(() => {
    setSelectedCells([]);
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedCells([]);
    setIsCellSelectionMode(false);
  }, []);

  return {
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
  };
}
