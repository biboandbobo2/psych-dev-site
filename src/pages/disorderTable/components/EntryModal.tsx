import { BaseModal, ModalCancelButton, ModalSaveButton } from '../../../components/ui/BaseModal';
import { TrackPicker } from './TrackPicker';
import type { OptionalTrack } from '../utils/trackMeta';

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  saving: boolean;
  isFormValid: boolean;
  cellLabel: string;
  text: string;
  onTextChange: (value: string) => void;
  track: OptionalTrack;
  onTrackChange: (value: OptionalTrack) => void;
  submitError: string | null;
  onSubmit: () => void;
}

/** Модалка добавления/редактирования одной записи в выбранное пересечение. */
export function EntryModal({
  isOpen,
  onClose,
  isEditing,
  saving,
  isFormValid,
  cellLabel,
  text,
  onTextChange,
  track,
  onTrackChange,
  submitError,
  onSubmit,
}: EntryModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Редактировать текст' : 'Добавить текст в пересечение'}
      maxWidth="2xl"
      disabled={saving}
      footer={
        <>
          <ModalCancelButton onClick={onClose} disabled={saving}>
            Отмена
          </ModalCancelButton>
          <ModalSaveButton onClick={onSubmit} disabled={!isFormValid} loading={saving}>
            {isEditing ? 'Сохранить изменения' : 'Добавить текст'}
          </ModalSaveButton>
        </>
      }
    >
      <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-1 text-sm font-semibold text-slate-900">Пересечение</p>
          <p className="text-sm text-slate-700">{cellLabel}</p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">Доп. цвет (опционально)</p>
          <TrackPicker value={track} onChange={onTrackChange} keyPrefix="entry-track" />
        </section>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">Ваши наблюдения</label>
          <textarea
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            rows={6}
            maxLength={4000}
            placeholder="Опишите особенности, которые вы заметили..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <div className="mt-1 text-right text-xs text-gray-500">{text.length}/4000</div>
        </div>

        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
