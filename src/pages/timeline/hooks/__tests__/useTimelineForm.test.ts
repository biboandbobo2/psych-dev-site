import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useTimelineForm } from '../useTimelineForm';
import type { NodeT } from '../../types';

describe('useTimelineForm', () => {
  it('инициализируется с пустыми значениями', () => {
    const { result } = renderHook(() => useTimelineForm());

    expect(result.current.formEventId).toBeNull();
    expect(result.current.formEventAge).toBe('');
    expect(result.current.formEventLabel).toBe('');
    expect(result.current.formEventNotes).toBe('');
    expect(result.current.formEventSphere).toBeUndefined();
    expect(result.current.formEventIsDecision).toBe(false);
    expect(result.current.formEventIcon).toBeNull();
    expect(result.current.hasFormChanges).toBe(false);
  });

  it('обновляет значения формы', () => {
    const { result } = renderHook(() => useTimelineForm());

    act(() => {
      result.current.setFormEventAge('25');
      result.current.setFormEventLabel('Новое событие');
      result.current.setFormEventSphere('education');
      result.current.setFormEventIsDecision(true);
    });

    expect(result.current.formEventAge).toBe('25');
    expect(result.current.formEventLabel).toBe('Новое событие');
    expect(result.current.formEventSphere).toBe('education');
    expect(result.current.formEventIsDecision).toBe(true);
  });

  it('заполняет форму из ноды', () => {
    const { result } = renderHook(() => useTimelineForm());

    const testNode: NodeT = {
      id: 'test-id',
      age: 30,
      x: 500,
      label: 'Тестовое событие',
      notes: 'Некоторые заметки',
      sphere: 'work',
      isDecision: true,
      iconId: 'graduation' as any,
    };

    act(() => {
      result.current.setFormFromNode(testNode);
    });

    expect(result.current.formEventId).toBe('test-id');
    expect(result.current.formEventAge).toBe('30');
    expect(result.current.formEventLabel).toBe('Тестовое событие');
    expect(result.current.formEventNotes).toBe('Некоторые заметки');
    expect(result.current.formEventSphere).toBe('work');
    expect(result.current.formEventIsDecision).toBe(true);
    expect(result.current.formEventIcon).toBe('graduation');
  });

  it('обнаруживает изменения формы', () => {
    const { result } = renderHook(() => useTimelineForm());

    const testNode: NodeT = {
      id: 'test-id',
      age: 30,
      x: 500,
      label: 'Исходное событие',
      notes: '',
      sphere: 'work',
      isDecision: false,
    };

    act(() => {
      result.current.setFormFromNode(testNode);
    });

    expect(result.current.hasFormChanges).toBe(false);

    act(() => {
      result.current.setFormEventLabel('Измененное событие');
    });

    expect(result.current.hasFormChanges).toBe(true);
  });

  it('очищает форму', () => {
    const { result } = renderHook(() => useTimelineForm());

    act(() => {
      result.current.setFormEventAge('25');
      result.current.setFormEventLabel('Событие');
      result.current.setFormEventSphere('education');
    });

    expect(result.current.formEventLabel).toBe('Событие');

    act(() => {
      result.current.clearForm();
    });

    expect(result.current.formEventId).toBeNull();
    expect(result.current.formEventAge).toBe('');
    expect(result.current.formEventLabel).toBe('');
    expect(result.current.formEventSphere).toBeUndefined();
    expect(result.current.hasFormChanges).toBe(false);
  });

  it('не показывает изменения для новой формы', () => {
    const { result } = renderHook(() => useTimelineForm());

    act(() => {
      result.current.setFormEventLabel('Новое событие');
      result.current.setFormEventAge('20');
    });

    // Для новой формы (formEventId === null) hasFormChanges всегда false
    expect(result.current.hasFormChanges).toBe(false);
  });
});
