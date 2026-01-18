import { EmojiText } from '../../../../components/Emoji';
import { SELECTABLE_TEXT_STYLE } from '../utils/constants';

interface ContentThemeEditorProps {
  accent: string;
  setAccent: (value: string) => void;
  accent100: string;
  setAccent100: (value: string) => void;
}

/**
 * Form section for theme colors
 */
export function ContentThemeEditor({ accent, setAccent, accent100, setAccent100 }: ContentThemeEditorProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-xl font-bold">
        <EmojiText text="🎨 Цвета темы" />
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Основной цвет (accent)</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={accent}
              onChange={(event) => setAccent(event.target.value)}
              className="w-16 h-10 border rounded cursor-pointer"
            />
            <input
              type="text"
              value={accent}
              onChange={(event) => setAccent(event.target.value)}
              className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              style={SELECTABLE_TEXT_STYLE}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Светлый вариант (accent100)</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={accent100}
              onChange={(event) => setAccent100(event.target.value)}
              className="w-16 h-10 border rounded cursor-pointer"
            />
            <input
              type="text"
              value={accent100}
              onChange={(event) => setAccent100(event.target.value)}
              className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              style={SELECTABLE_TEXT_STYLE}
            />
          </div>
        </div>
      </div>
      <div className="mt-4 p-4 rounded" style={{ backgroundColor: accent100 }}>
        <p className="font-medium" style={{ color: accent }}>
          Пример текста с выбранными цветами
        </p>
      </div>
    </div>
  );
}
