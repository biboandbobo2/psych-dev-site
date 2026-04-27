import { BaseModal, ModalCancelButton, ModalSaveButton } from '../../../components/ui/BaseModal';
import {
  buildDisorderTableCellKey,
  type DisorderTableCellSelection,
} from '../../../features/disorderTable';
import { TrackPicker } from './TrackPicker';
import type { OptionalTrack } from '../utils/trackMeta';

interface BulkEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  selectedCells: DisorderTableCellSelection[];
  rowLabels: Map<string, string>;
  columnLabels: Map<string, string>;
  text: string;
  onTextChange: (value: string) => void;
  track: OptionalTrack;
  onTrackChange: (value: OptionalTrack) => void;
  error: string | null;
  onSubmit: () => void;
}

export function BulkEntryModal({
  isOpen,
  onClose,
  saving,
  selectedCells,
  rowLabels,
  columnLabels,
  text,
  onTextChange,
  track,
  onTrackChange,
  error,
  onSubmit,
}: BulkEntryModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Внести один текст в несколько пересечений"
      maxWidth="2xl"
      disabled={saving}
      footer={
        <>
          <ModalCancelButton onClick={onClose} disabled={saving}>
            Отмена
          </ModalCancelButton>
          <ModalSaveButton onClick={onSubmit} loading={saving}>
            Сохранить во все выбранные
          </ModalSaveButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Выбрано пересечений:{' '}
          <span className="font-semibold text-slate-900">{selectedCells.length}</span>
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
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Доп. цвет (опционально)
          </label>
          <TrackPicker value={track} onChange={onTrackChange} keyPrefix="bulk-track" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Общий текст</label>
          <textarea
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            rows={6}
            maxLength={4000}
            placeholder="Введите текст, который нужно добавить во все выбранные пересечения"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <div className="mt-1 text-right text-xs text-slate-500">{text.length}/4000</div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
