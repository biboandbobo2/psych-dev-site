import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useClickOutside } from '../useClickOutside';

describe('useClickOutside', () => {
  it('вызывает callback при клике вне элемента', () => {
    const callback = vi.fn();

    // Создаём реальный DOM элемент
    const container = document.createElement('div');
    const target = document.createElement('div');
    container.appendChild(target);
    document.body.appendChild(container);

    // Рендерим хук с ref на target
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(target);
      useClickOutside(ref, callback, true);
      return ref;
    });

    // Кликаем вне элемента (на document.body)
    const outsideClick = new MouseEvent('mousedown', { bubbles: true });
    document.body.dispatchEvent(outsideClick);

    expect(callback).toHaveBeenCalledTimes(1);

    // Cleanup
    document.body.removeChild(container);
  });

  it('не вызывает callback при клике внутри элемента', () => {
    const callback = vi.fn();

    const container = document.createElement('div');
    const target = document.createElement('div');
    container.appendChild(target);
    document.body.appendChild(container);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(target);
      useClickOutside(ref, callback, true);
      return ref;
    });

    // Кликаем внутри элемента
    const insideClick = new MouseEvent('mousedown', { bubbles: true });
    target.dispatchEvent(insideClick);

    expect(callback).not.toHaveBeenCalled();

    document.body.removeChild(container);
  });

  it('не вызывает callback когда enabled=false', () => {
    const callback = vi.fn();

    const container = document.createElement('div');
    const target = document.createElement('div');
    container.appendChild(target);
    document.body.appendChild(container);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(target);
      useClickOutside(ref, callback, false);
      return ref;
    });

    // Кликаем вне элемента
    const outsideClick = new MouseEvent('mousedown', { bubbles: true });
    document.body.dispatchEvent(outsideClick);

    expect(callback).not.toHaveBeenCalled();

    document.body.removeChild(container);
  });

  it('удаляет event listener при размонтировании', () => {
    const callback = vi.fn();

    const container = document.createElement('div');
    const target = document.createElement('div');
    container.appendChild(target);
    document.body.appendChild(container);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(target);
      useClickOutside(ref, callback, true);
      return ref;
    });

    // Размонтируем хук
    unmount();

    // Кликаем вне элемента после размонтирования
    const outsideClick = new MouseEvent('mousedown', { bubbles: true });
    document.body.dispatchEvent(outsideClick);

    expect(callback).not.toHaveBeenCalled();

    document.body.removeChild(container);
  });

  it('реагирует на изменение enabled', () => {
    const callback = vi.fn();

    const container = document.createElement('div');
    const target = document.createElement('div');
    container.appendChild(target);
    document.body.appendChild(container);

    let enabled = false;

    const { rerender } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(target);
      useClickOutside(ref, callback, enabled);
      return ref;
    });

    // Клик вне — callback не должен вызваться (enabled=false)
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(callback).not.toHaveBeenCalled();

    // Включаем отслеживание
    enabled = true;
    rerender();

    // Теперь callback должен вызваться
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(callback).toHaveBeenCalledTimes(1);

    document.body.removeChild(container);
  });
});
