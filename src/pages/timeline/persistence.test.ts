import { describe, expect, it, vi } from 'vitest';
import {
  buildTimelineDocument,
  createEmptyTimelineData,
  createTimelineCanvas,
  DEFAULT_TIMELINE_NAME,
  hasTimelineContent,
  normalizeImportedTimelineData,
  normalizeTimelineDocument,
} from './persistence';
import { DEFAULT_AGE_MAX, DEFAULT_CURRENT_AGE } from './constants';

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
    expect(normalized.ageMax).toBe(37);
    expect(normalized.nodes).toHaveLength(1);
    expect(normalized.nodes[0].notes).toBe('born');
    expect(normalized.edges).toHaveLength(1);
    expect(normalized.birthDetails?.place).toBe('Москва');
    expect(normalized.selectedPeriodization).toBe('erikson');
  });
});

describe('normalizeImportedTimelineData (B5 healing)', () => {
  it('heals orphan nodes whose parentX points at no existing branch', () => {
    const normalized = normalizeImportedTimelineData({
      currentAge: 30,
      ageMax: 100,
      nodes: [
        { id: 'a', age: 10, label: 'On main', isDecision: false, x: 2000 },
        // parentX 9999 has no matching edge.x — orphaned
        { id: 'b', age: 20, label: 'Orphan', isDecision: false, x: 9999, parentX: 9999 },
      ],
      edges: [],
    });
    const orphan = normalized.nodes.find((n) => n.id === 'b')!;
    expect(orphan.parentX).toBeUndefined();
    expect(orphan.x).toBeDefined();
    expect(orphan.x).not.toBe(9999); // moved to main line
  });

  it('keeps nodes whose parentX matches an existing edge', () => {
    const normalized = normalizeImportedTimelineData({
      currentAge: 30,
      ageMax: 100,
      nodes: [
        { id: 'origin', age: 10, label: 'Origin', isDecision: false, x: 2000 },
        { id: 'on-branch', age: 20, label: 'On branch', isDecision: false, x: 2100, parentX: 2100 },
      ],
      edges: [
        { id: 'e1', x: 2100, startAge: 10, endAge: 30, color: '#000', nodeId: 'origin' },
      ],
    });
    const onBranch = normalized.nodes.find((n) => n.id === 'on-branch')!;
    expect(onBranch.parentX).toBe(2100);
    expect(onBranch.x).toBe(2100);
  });

  it('CRITICAL: dedupes nodes/edges by id when loading a corrupted document', () => {
    // A canvas damaged by the pre-fix exponential-drag bug can have
    // the same node id present hundreds of times. normalize must collapse
    // them to one occurrence on read so the canvas heals next save.
    const normalized = normalizeImportedTimelineData({
      currentAge: 30,
      ageMax: 100,
      nodes: [
        { id: 'a', age: 10, label: 'A', isDecision: false, x: 2000 },
        { id: 'a', age: 10, label: 'A', isDecision: false, x: 2000 },
        { id: 'a', age: 10, label: 'A', isDecision: false, x: 2000 },
        { id: 'b', age: 20, label: 'B', isDecision: false, x: 2000 },
      ],
      edges: [
        { id: 'e1', x: 2100, startAge: 10, endAge: 30, color: '#000', nodeId: 'a' },
        { id: 'e1', x: 2100, startAge: 10, endAge: 30, color: '#000', nodeId: 'a' },
      ],
    });
    expect(normalized.nodes.map((n) => n.id).sort()).toEqual(['a', 'b']);
    expect(normalized.edges.map((e) => e.id)).toEqual(['e1']);
  });

  it('drops edges whose origin node is missing (existing behaviour)', () => {
    const normalized = normalizeImportedTimelineData({
      currentAge: 30,
      ageMax: 100,
      nodes: [{ id: 'a', age: 10, label: 'A', isDecision: false, x: 2000 }],
      edges: [
        { id: 'e1', x: 2100, startAge: 10, endAge: 30, color: '#000', nodeId: 'a' },
        { id: 'broken', x: 2200, startAge: 10, endAge: 30, color: '#000', nodeId: 'missing' },
      ],
    });
    expect(normalized.edges.map((x) => x.id)).toEqual(['e1']);
  });
});

describe('hasTimelineContent', () => {
  it('treats post-clearAll state as empty so the biography-import CTA returns', () => {
    expect(
      hasTimelineContent({
        currentAge: DEFAULT_CURRENT_AGE,
        ageMax: DEFAULT_AGE_MAX,
        nodes: [],
        edges: [],
        birthDetails: {},
        selectedPeriodization: null,
      })
    ).toBe(false);
  });

  it('detects content via birthDetails alone', () => {
    expect(
      hasTimelineContent({
        currentAge: DEFAULT_CURRENT_AGE,
        ageMax: DEFAULT_AGE_MAX,
        nodes: [],
        edges: [],
        birthDetails: { place: 'Москва' },
        selectedPeriodization: null,
      })
    ).toBe(true);
  });

  it('detects content via selectedPeriodization alone', () => {
    expect(
      hasTimelineContent({
        currentAge: DEFAULT_CURRENT_AGE,
        ageMax: DEFAULT_AGE_MAX,
        nodes: [],
        edges: [],
        birthDetails: {},
        selectedPeriodization: 'erikson',
      })
    ).toBe(true);
  });
});
