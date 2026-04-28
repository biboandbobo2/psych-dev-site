import { PeriodBoundaryModal } from './PeriodBoundaryModal';
import { getPeriodizationById } from '../data/periodizations';

interface PeriodBoundaryModalContainerProps {
  selectedPeriodization: string | null;
  periodIndex: number;
  onClose: () => void;
}

/**
 * Загружает periodization по id и достаёт пару период-до / период-после
 * по индексу границы. Если что-то не находится — возвращает null
 * (чтобы не падать на гонке смены periodization).
 */
export function PeriodBoundaryModalContainer({
  selectedPeriodization,
  periodIndex,
  onClose,
}: PeriodBoundaryModalContainerProps) {
  if (!selectedPeriodization) return null;

  const periodization = getPeriodizationById(selectedPeriodization);
  if (!periodization) return null;

  const periodBefore = periodization.periods[periodIndex];
  const periodAfter = periodization.periods[periodIndex + 1];
  if (!periodBefore || !periodAfter) return null;

  return (
    <PeriodBoundaryModal
      periodization={periodization}
      periodBefore={periodBefore}
      periodAfter={periodAfter}
      age={periodAfter.startAge}
      onClose={onClose}
    />
  );
}
