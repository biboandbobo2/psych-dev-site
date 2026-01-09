import { useEffect, type RefObject } from 'react';

/**
 * Хук для отслеживания кликов вне элемента
 * Вызывает callback когда клик происходит вне ref элемента
 *
 * @param ref - RefObject на элемент, клики вне которого нужно отслеживать
 * @param callback - функция, вызываемая при клике вне элемента
 * @param enabled - флаг для включения/выключения отслеживания (по умолчанию true)
 *
 * @example
 * const dropdownRef = useRef<HTMLDivElement>(null);
 * useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  callback: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback, enabled]);
}
