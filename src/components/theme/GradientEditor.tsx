/**
 * GradientEditor component for editing gradient stops
 */
import type { Gradient } from '../../types/themes';
import { sanitizeHex, addStop, removeStop, updateStop } from './themePickerUtils';

export interface GradientEditorProps {
  label: string;
  gradient: Gradient;
  onChange: (gradient: Gradient) => void;
  disabled?: boolean;
}

export const GradientEditor = ({ label, gradient, onChange, disabled }: GradientEditorProps) => {
  const handleTypeChange = (type: Gradient['type']) => {
    onChange({
      ...gradient,
      type,
    });
  };

  const handleAngleChange = (angle: number) => {
    onChange({
      ...gradient,
      angle,
    });
  };

  return (
    <div className={`rounded-2xl border border-zinc-200 p-4 ${disabled ? 'opacity-60' : ''}`}>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-800">{label}</h4>
        <span className="text-xs text-zinc-500">{gradient.type === 'linear' ? 'Линейный' : 'Радиальный'}</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <select
            value={gradient.type}
            onChange={(event) => handleTypeChange(event.target.value as Gradient['type'])}
            className="h-10 flex-1 rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            disabled={disabled}
          >
            <option value="linear">Линейный</option>
            <option value="radial">Радиальный</option>
          </select>
          {gradient.type === 'linear' && (
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <span>Угол</span>
              <input
                type="number"
                min={0}
                max={360}
                value={gradient.angle ?? 135}
                onChange={(event) => handleAngleChange(Number(event.target.value))}
                className="h-10 w-20 rounded-lg border border-zinc-300 px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                disabled={disabled}
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          {gradient.stops.map((stop, index) => (
            <div key={index} className="flex items-center gap-3">
              <input
                type="color"
                value={stop.color}
                onChange={(event) =>
                  onChange(
                    updateStop(gradient, index, {
                      color: sanitizeHex(event.target.value),
                    })
                  )
                }
                className="h-10 w-12 rounded border border-zinc-300"
                disabled={disabled}
              />
              <div className="flex flex-1 flex-col">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={stop.position}
                  onChange={(event) =>
                    onChange(
                      updateStop(gradient, index, {
                        position: Number(event.target.value),
                      })
                    )
                  }
                  className="w-full"
                  disabled={disabled}
                />
                <span className="text-xs text-zinc-500">Позиция: {stop.position}%</span>
              </div>
              <button
                type="button"
                onClick={() => onChange(removeStop(gradient, index))}
                className="h-10 rounded-lg border border-zinc-300 px-2 text-sm text-zinc-600 transition hover:border-red-400 hover:text-red-500 disabled:opacity-50"
                disabled={disabled || gradient.stops.length <= 2}
              >
                −
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => onChange(addStop(gradient))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50"
            disabled={disabled || gradient.stops.length >= 8}
          >
            Добавить стоп
          </button>
        </div>
      </div>
    </div>
  );
};
