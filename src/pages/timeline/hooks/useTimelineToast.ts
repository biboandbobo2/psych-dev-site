import { useCallback, useEffect, useRef, useState } from 'react';

export interface TimelineToastState {
  message: string;
  tone: 'info' | 'warning';
  /** Кнопка действия (например, «Отменить» после удаления). */
  actionLabel?: string;
  onAction?: () => void;
}

const TOAST_HIDE_MS = 6000;

/**
 * Локальные уведомления таймлайна: заменяют блокирующие alert()
 * у валидаторов и дают плашку «Удалено · Отменить» после каскадного
 * удаления события.
 */
export function useTimelineToast() {
  const [toast, setToast] = useState<TimelineToastState | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const hideToast = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
    setToast(null);
  }, []);

  const showToast = useCallback((next: TimelineToastState) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast(next);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = undefined;
      setToast(null);
    }, TOAST_HIDE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return { toast, showToast, hideToast };
}
