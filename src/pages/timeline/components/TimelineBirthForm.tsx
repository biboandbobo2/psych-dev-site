import type { ChangeEvent, FormEvent } from 'react';

interface TimelineBirthFormProps {
  birthFormDate: string;
  birthFormPlace: string;
  birthFormNotes: string;
  birthHasChanges: boolean;
  onDateChange: (value: string) => void;
  onPlaceChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
  onCancel: () => void;
}

export function TimelineBirthForm({
  birthFormDate,
  birthFormPlace,
  birthFormNotes,
  birthHasChanges,
  onDateChange,
  onPlaceChange,
  onNotesChange,
  onSave,
  onClear,
  onCancel,
}: TimelineBirthFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave();
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-amber-900" style={{ fontFamily: 'Georgia, serif' }}>
          Профиль рождения
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 text-xs rounded-lg bg-white/80 text-amber-700 hover:bg-white transition"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Закрыть
        </button>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
            Дата рождения
          </span>
          <input
            type="date"
            value={birthFormDate}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onDateChange(event.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition text-sm bg-white"
            style={{ fontFamily: 'Georgia, serif' }}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
            Город / место
          </span>
          <input
            type="text"
            value={birthFormPlace}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onPlaceChange(event.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition text-sm bg-white"
            placeholder="Например: Москва"
            style={{ fontFamily: 'Georgia, serif' }}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
            Обстоятельства
          </span>
          <textarea
            value={birthFormNotes}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onNotesChange(event.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition text-sm bg-white resize-none"
            rows={3}
            placeholder="Добавьте детали..."
            style={{ fontFamily: 'Georgia, serif' }}
          />
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!birthHasChanges}
            className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Сохранить
          </button>
          <button
            type="button"
            onClick={onClear}
            className="px-4 py-2.5 bg-white/80 text-amber-700 rounded-xl border border-amber-200 hover:bg-white transition text-sm"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Очистить
          </button>
        </div>
      </form>
    </div>
  );
}
