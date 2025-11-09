import { useState, useEffect, useRef, useCallback } from 'react';
import { deleteTest } from '../../../../lib/tests';

interface PendingDelete {
  id: string;
  title: string;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

/**
 * Hook for test deletion functionality
 */
export function useTestDelete(onDeleted: () => void) {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteConfirmRef = useRef<HTMLButtonElement | null>(null);

  // Handle Escape key to cancel delete
  useEffect(() => {
    if (!pendingDelete) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPendingDelete(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pendingDelete]);

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (pendingDelete && deleteConfirmRef.current) {
      deleteConfirmRef.current.focus();
    }
  }, [pendingDelete]);

  const handleRequestDelete = useCallback((test: { id: string; title: string }) => {
    setPendingDelete(test);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setPendingDelete(null);
  }, []);

  const handleConfirmDelete = useCallback(
    async (onFeedback: (feedback: FeedbackState) => void) => {
      if (!pendingDelete || isDeleting) return;

      try {
        setIsDeleting(true);
        await deleteTest(pendingDelete.id);
        onFeedback({
          type: 'success',
          message: `Тест «${pendingDelete.title}» удалён`,
        });
        setPendingDelete(null);
        onDeleted();
      } catch (err: unknown) {
        console.error('Ошибка удаления теста:', err);
        onFeedback({
          type: 'error',
          message: 'Не удалось удалить тест. Попробуйте ещё раз.',
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [pendingDelete, isDeleting, onDeleted]
  );

  return {
    pendingDelete,
    isDeleting,
    deleteConfirmRef,
    handleRequestDelete,
    handleCancelDelete,
    handleConfirmDelete,
  };
}
