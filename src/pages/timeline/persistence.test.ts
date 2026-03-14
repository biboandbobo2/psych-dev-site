import { describe, expect, it, vi } from 'vitest';
import {
  buildTimelineDocument,
  createEmptyTimelineData,
  createTimelineCanvas,
  DEFAULT_TIMELINE_NAME,
  normalizeImportedTimelineData,
  normalizeTimelineDocument,
} from './persistence';

describe('timeline persistence', () => {
  it('migrates legacy single-canvas document into canvases array', () => {
    const normalized = normalizeTimelineDocument({
      userId: 'user-1',
      data: {
        currentAge: 42,
        ageMax: 100,
        nodes: [{ id: 'n1', age: 18, label: 'Поступление', isDecision: true }],
        edges: [],
        birthDetails: { place: 'Москва' },
        selectedPeriodization: 'erikson',
      },
    });

    expect(normalized.canvases).toHaveLength(1);
    expect(normalized.canvases[0].name).toBe(DEFAULT_TIMELINE_NAME);
    expect(normalized.canvases[0].data.currentAge).toBe(42);
    expect(normalized.canvases[0].data.birthDetails?.place).toBe('Москва');
    expect(normalized.activeCanvasId).toBe(normalized.canvases[0].id);
  });

  it('keeps explicit multi-canvas document as-is', () => {
    const first = createTimelineCanvas('Таймлайн 1');
    const second = createTimelineCanvas('Таймлайн 2', {
      ...createEmptyTimelineData(),
      nodes: [{ id: 'n2', age: 30, label: 'Переезд', isDecision: false }],
    });

    const normalized = normalizeTimelineDocument({
      userId: 'user-2',
      activeCanvasId: second.id,
      canvases: [first, second],
    });

    expect(normalized.canvases).toHaveLength(2);
    expect(normalized.activeCanvasId).toBe(second.id);
    expect(normalized.canvases[1].data.nodes[0]?.label).toBe('Переезд');
  });

  it('builds persisted document payload', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValueOnce('canvas-id');

    const canvas = createTimelineCanvas(DEFAULT_TIMELINE_NAME);
    const doc = buildTimelineDocument('user-3', canvas.id, [canvas]);

    expect(doc).toEqual({
      userId: 'user-3',
      activeCanvasId: 'canvas-id',
      canvases: [canvas],
    });
  });

  it('normalizes imported timeline data from json file', () => {
    const normalized = normalizeImportedTimelineData({
      currentAge: 37,
      ageMax: 20,
      nodes: [
        { id: 'n1', age: 0, label: 'Рождение', isDecision: false, notes: '  born  ' },
        { id: '', age: 10, label: 'Broken', isDecision: false },
      ],
      edges: [
        { id: 'e1', x: 1600, startAge: 0, endAge: 18, color: '#7dd3fc', nodeId: 'n1' },
        { id: 'e2', x: 2000, startAge: 1, endAge: 2, color: '#000', nodeId: 'missing' },
      ],
      birthDetails: { date: ' 6 июня 1799 ', place: ' Москва ' },
      selectedPeriodization: 'erikson',
    });

    expect(normalized.currentAge).toBe(37);
    expect(normalized.ageMax).toBeGreaterThanOrEqual(100);
    expect(normalized.nodes).toHaveLength(1);
    expect(normalized.nodes[0].notes).toBe('born');
    expect(normalized.edges).toHaveLength(1);
    expect(normalized.birthDetails?.place).toBe('Москва');
    expect(normalized.selectedPeriodization).toBe('erikson');
  });
});
