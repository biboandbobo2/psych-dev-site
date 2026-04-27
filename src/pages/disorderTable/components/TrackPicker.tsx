import { TRACK_OPTIONS, type OptionalTrack } from '../utils/trackMeta';

interface TrackPickerProps {
  value: OptionalTrack;
  onChange: (value: OptionalTrack) => void;
  /** Префикс для key — нужен для уникальности при рендере 2+ пикеров на одной странице. */
  keyPrefix?: string;
}

/** Тройка кнопок выбора цветовой метки записи (без / патопсихология / психиатрия). */
export function TrackPicker({ value, onChange, keyPrefix = 'track' }: TrackPickerProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {TRACK_OPTIONS.map((option) => (
        <button
          key={`${keyPrefix}-${option.value ?? 'none'}`}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
            value === option.value
              ? 'border-slate-700 bg-white text-slate-900'
              : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
