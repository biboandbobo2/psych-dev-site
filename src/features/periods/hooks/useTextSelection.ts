import { useCallback, useEffect, useState } from 'react';

export interface TextSelectionSnapshot {
  text: string;
  /** Viewport-координаты выделения для позиционирования меню */
  rect: { top: number; left: number; width: number; height: number };
}

/**
 * Отслеживает выделение текста мышью внутри контейнера (desktop).
 * Снапшот живёт до нового mousedown в контейнере, скролла или clear().
 */
export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<TextSelectionSnapshot | null>(null);

  const clear = useCallback(() => setSelection(null), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const handleMouseUp = () => {
      // Браузер финализирует выделение после mouseup — читаем в следующем тике
      window.setTimeout(() => {
        const domSelection = window.getSelection();
        if (!domSelection || domSelection.isCollapsed || domSelection.rangeCount === 0) {
          setSelection(null);
          return;
        }

        const text = domSelection.toString().replace(/\s+/g, ' ').trim();
        if (!text) {
          setSelection(null);
          return;
        }

        const range = domSelection.getRangeAt(0);
        if (!container.contains(range.commonAncestorContainer)) {
          setSelection(null);
          return;
        }

        const rect = range.getBoundingClientRect();
        setSelection({
          text,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        });
      }, 0);
    };

    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('scroll', clear, { passive: true });

    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('scroll', clear);
    };
  }, [containerRef, clear]);

  return { selection, clear };
}
