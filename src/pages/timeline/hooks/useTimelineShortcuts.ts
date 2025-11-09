import { useEffect } from 'react';

interface TimelineShortcutsOptions {
  selectedId: string | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: (id: string) => void;
  onEscape: () => void;
}

export function useTimelineShortcuts({
  selectedId,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDelete,
  onEscape,
}: TimelineShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInTextField =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo()) onUndo();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        if (canRedo()) onRedo();
        return;
      }

      if (isInTextField) return;

      if (event.key === 'Delete' && selectedId) {
        onDelete(selectedId);
      } else if (event.key === 'Escape') {
        onEscape();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, canUndo, canRedo, onUndo, onRedo, onDelete, onEscape]);
}
