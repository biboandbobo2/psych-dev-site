import type { SimpleListProps } from '../types';
import { SELECTABLE_TEXT_STYLE } from '../utils/constants';

/**
 * Simple list component for string values
 */
export function SimpleList({ items, onChange, label, placeholder, maxItems = 10 }: SimpleListProps) {
  const addItem = () => {
    if (items.length < maxItems) {
      onChange([...items, '']);
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <label className="text-sm font-medium">{label}</label>
        {items.length < maxItems && (
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Добавить
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500 italic py-2">Нет элементов. Нажмите "+ Добавить"</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-center">
              <span className="text-gray-400 text-sm font-mono">{index + 1}.</span>
              <input
                type="text"
                value={item}
                onChange={(event) => updateItem(index, event.target.value)}
                placeholder={placeholder}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                style={SELECTABLE_TEXT_STYLE}
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-red-600 hover:text-red-700 text-sm"
                title="Удалить"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
