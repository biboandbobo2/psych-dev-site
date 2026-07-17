import { useEffect, useRef } from 'react';
import type { TextSelectionSnapshot } from '../hooks/useTextSelection';
import { extractConceptChips, isShortSelection, truncatedQuery } from '../lib/selectionChips';

interface TranscriptSelectionMenuProps {
  selection: TextSelectionSnapshot;
  concepts: string[];
  onSearch: (query: string) => void;
  onExplain?: (text: string) => void;
  onDismiss: () => void;
}

const BUTTON_CLASS =
  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

/**
 * Плавающее меню над выделенным текстом транскрипта: поиск статей
 * (короткое выделение — как есть, длинное — чипы из понятий урока)
 * и объяснение фрагмента лекционным AI.
 */
export function TranscriptSelectionMenu({
  selection,
  concepts,
  onSearch,
  onExplain,
  onDismiss,
}: TranscriptSelectionMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onDismiss();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onDismiss]);

  const short = isShortSelection(selection.text);
  const chips = short ? [] : extractConceptChips(selection.text, concepts);
  const top = Math.max(8, selection.rect.top - 48);
  const left = Math.min(
    Math.max(120, selection.rect.left + selection.rect.width / 2),
    (typeof window !== 'undefined' ? window.innerWidth : 1280) - 120,
  );

  return (
    <div
      ref={menuRef}
      role="toolbar"
      aria-label="Действия с выделенным текстом"
      className="fixed z-[130] -translate-x-1/2 rounded-full border border-white/15 bg-[#10141b] p-1 shadow-2xl"
      style={{ top, left }}
    >
      <div className="flex max-w-[80vw] items-center gap-1 overflow-x-auto">
        {short ? (
          <button type="button" className={BUTTON_CLASS} onClick={() => onSearch(selection.text)}>
            🔎 Статьи
          </button>
        ) : chips.length > 0 ? (
          chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className={BUTTON_CLASS}
              title={`Искать статьи: ${chip}`}
              onClick={() => onSearch(chip)}
            >
              🔎 {chip}
            </button>
          ))
        ) : (
          <button
            type="button"
            className={BUTTON_CLASS}
            title={`Искать статьи: ${truncatedQuery(selection.text)}`}
            onClick={() => onSearch(truncatedQuery(selection.text))}
          >
            🔎 Статьи
          </button>
        )}
        {onExplain ? (
          <button
            type="button"
            className={`${BUTTON_CLASS} bg-white/10`}
            onClick={() => onExplain(selection.text)}
          >
            ✨ Объяснить
          </button>
        ) : null}
      </div>
    </div>
  );
}
