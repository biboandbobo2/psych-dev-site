import type { EditableListProps, ListItem } from '../types';
import { SELECTABLE_TEXT_STYLE } from '../utils/constants';

/**
 * Editable list component with title and optional URL
 */
export function EditableList({
  items,
  onChange,
  label,
  placeholder,
  maxItems = 10,
  showUrl = true,
  extraFields = [],
}: EditableListProps) {
  const addItem = () => {
    if (items.length < maxItems) {
      onChange([...items, showUrl ? { title: '', url: '' } : { name: '' }]);
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
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
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-start">
              <span className="text-gray-400 text-sm font-mono mt-2">{index + 1}.</span>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={item.title ?? item.name ?? ''}
                  onChange={(event) =>
                    updateItem(index, item.title !== undefined ? 'title' : 'name', event.target.value)
                  }
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  style={SELECTABLE_TEXT_STYLE}
                />
                {showUrl && (
                  <input
                    type="url"
                    value={item.url ?? ''}
                    onChange={(event) => updateItem(index, 'url', event.target.value)}
                    placeholder="https://... (необязательно)"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    style={SELECTABLE_TEXT_STYLE}
                  />
                )}
                {extraFields.map(({ key, placeholder: extraPlaceholder, type = 'text' }) => (
                  <input
                    key={key}
                    type={type}
                    value={item[key] ?? ''}
                    onChange={(event) => updateItem(index, key, event.target.value)}
                    placeholder={extraPlaceholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    style={SELECTABLE_TEXT_STYLE}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="mt-2 text-red-600 hover:text-red-700 text-sm"
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
