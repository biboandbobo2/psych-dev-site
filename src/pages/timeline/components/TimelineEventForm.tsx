import { IconPickerButton } from './IconPickerButton';
import { SaveEventAsNoteButton } from './SaveEventAsNoteButton';
import { SPHERE_META } from '../constants';
import { Emoji, EmojiText } from '../../../components/Emoji';
import type { EventIconId, Sphere } from '../types';
import type { ChangeEvent, FormEvent } from 'react';

interface TimelineEventFormProps {
  title: string;
  formEventId: string | null;
  formEventAge: string;
  onFormEventAgeChange: (value: string) => void;
  formEventLabel: string;
  onFormEventLabelChange: (value: string) => void;
  formEventSphere: Sphere | undefined;
  onFormEventSphereChange: (value: Sphere | undefined) => void;
  formEventIsDecision: boolean;
  onFormEventIsDecisionChange: (value: boolean) => void;
  formEventIcon: EventIconId | null;
  onFormEventIconChange: (value: EventIconId | null) => void;
  formEventNotes: string;
  onFormEventNotesChange: (value: string) => void;
  onEventFormSubmit: () => void;
  onClearForm?: () => void;
  onDeleteEvent?: () => void;
  createNote: (note: any) => Promise<void>;
  onNoteSuccess?: () => void;
  showNotesField?: boolean;
  showCancelButton?: boolean;
  showBulkCreatorButton?: boolean;
  onOpenBulkCreator?: () => void;
  iconTone?: 'emerald' | 'sky';
  submitLabel?: string;
  wrapperClassName?: string;
}

export function TimelineEventForm({
  title,
  formEventId,
  formEventAge,
  onFormEventAgeChange,
  formEventLabel,
  onFormEventLabelChange,
  formEventSphere,
  onFormEventSphereChange,
  formEventIsDecision,
  onFormEventIsDecisionChange,
  formEventIcon,
  onFormEventIconChange,
  formEventNotes,
  onFormEventNotesChange,
  onEventFormSubmit,
  onClearForm,
  onDeleteEvent,
  createNote,
  onNoteSuccess,
  showNotesField = true,
  showCancelButton = false,
  showBulkCreatorButton = false,
  onOpenBulkCreator,
  iconTone = 'emerald',
  submitLabel,
  wrapperClassName = 'bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200 shadow-sm',
}: TimelineEventFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onEventFormSubmit();
  };

  const renderNotesField = () => {
    if (!showNotesField) return null;

    return (
      <label className="block">
        <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
          Подробности
        </span>
        <textarea
          value={formEventNotes}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onFormEventNotesChange(event.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition resize-none text-sm bg-white"
          style={{ fontFamily: 'Georgia, serif' }}
          rows={3}
          placeholder="Опишите контекст..."
        />
      </label>
    );
  };

  return (
    <div className={wrapperClassName}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <IconPickerButton value={formEventIcon} onChange={onFormEventIconChange} tone={iconTone} />
          {showCancelButton && onClearForm && (
            <button
              type="button"
              onClick={onClearForm}
              className="px-2 py-1 text-xs rounded-lg bg-white/80 text-slate-600 hover:bg-white transition"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Отменить
            </button>
          )}
        </div>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
            Возраст (лет)
          </span>
          <input
            type="text"
            value={formEventAge}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onFormEventAgeChange(event.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition text-sm bg-white"
            style={{ fontFamily: 'Georgia, serif' }}
            placeholder="Например: 25 или 25,5"
            required
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
            Название
          </span>
          <input
            type="text"
            value={formEventLabel}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onFormEventLabelChange(event.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition text-sm bg-white"
            style={{ fontFamily: 'Georgia, serif' }}
            placeholder="Например: Поступил в университет"
            required
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
            Сфера жизни{showNotesField ? ' (опционально)' : ''}
          </span>
          <select
            value={formEventSphere || ''}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onFormEventSphereChange(event.target.value ? (event.target.value as Sphere) : undefined)
            }
            className="w-full px-3 py-2 rounded-xl border border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition bg-white text-sm"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            <option value="">Не указано</option>
            {Object.entries(SPHERE_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.emoji} {meta.label}
              </option>
            ))}
          </select>
        </label>

        {renderNotesField()}

        <div className="flex items-center gap-2">
          <label className="flex-1 flex items-center gap-2 p-2.5 rounded-xl border border-green-200 hover:bg-white/50 transition cursor-pointer bg-white/30">
            <input
              type="checkbox"
              checked={formEventIsDecision}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onFormEventIsDecisionChange(event.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-xs text-slate-700" style={{ fontFamily: 'Georgia, serif' }}>
              ✕ Это было моё решение
            </span>
          </label>
          <SaveEventAsNoteButton
            eventTitle={formEventLabel}
            eventAge={formEventAge}
            eventNotes={formEventNotes}
            eventSphere={formEventSphere}
            createNote={createNote}
            onSuccess={onNoteSuccess}
          />
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2.5 bg-blue-400 text-white rounded-xl hover:bg-blue-500 transition font-medium text-sm"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {submitLabel ?? (formEventId ? 'Сохранить' : '+ Добавить событие')}
        </button>
        {formEventId && onDeleteEvent && (
          <button
            type="button"
            onClick={onDeleteEvent}
            className="px-4 py-2.5 bg-red-200 hover:bg-red-300 text-red-800 rounded-xl transition font-medium text-sm"
            style={{ fontFamily: 'Georgia, serif' }}
            aria-label="Удалить событие"
          >
            <Emoji token="🗑️" size={16} />
          </button>
        )}
      </form>

      {showBulkCreatorButton && onOpenBulkCreator && (
        <button
          type="button"
          onClick={onOpenBulkCreator}
          className="w-full mt-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-blue-700 rounded-xl hover:from-blue-100 hover:to-cyan-100 transition font-medium text-xs"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          <EmojiText text="📝 Создать много событий" />
        </button>
      )}
    </div>
  );
}
