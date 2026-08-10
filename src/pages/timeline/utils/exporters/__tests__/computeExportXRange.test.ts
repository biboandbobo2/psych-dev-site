import { describe, expect, it } from 'vitest';
import { computeExportXRange } from '../common';
import type { TimelineExportPayload } from '../common';
import type { EdgeT, NodeT } from '../../../types';

function makePayload(nodes: Partial<NodeT>[], edges: Partial<EdgeT>[]): TimelineExportPayload {
  return {
    currentAge: 30,
    ageMax: 100,
    nodes: nodes.map((n, i) => ({
      id: `n${i}`,
      age: 10,
      label: `N${i}`,
      isDecision: false,
      ...n,
    })) as NodeT[],
    edges: edges.map((e, i) => ({
      id: `e${i}`,
      x: 2000,
      startAge: 5,
      endAge: 15,
      color: '#000',
      nodeId: `n${i}`,
      ...e,
    })) as EdgeT[],
    birthDetails: {},
    selectedPeriodization: null,
  };
}

// Раскладка биографических веток может уводить x за пределы мира (0..4000);
// без динамических границ такие ветки обрезались в PNG/PDF.
describe('computeExportXRange', () => {
  it('покрывает крайние узлы и ветки с запасом под подписи', () => {
    const payload = makePayload(
      [{ x: -500 }, { x: 2000 }, { x: 4500 }],
      [{ x: -900 }, { x: 4100 }]
    );
    const range = computeExportXRange(payload);
    expect(range.minX).toBeLessThanOrEqual(-900);
    expect(range.maxX).toBeGreaterThanOrEqual(4500);
  });

  it('узлы на главной линии (x undefined) не влияют на диапазон', () => {
    const payload = makePayload([{ x: undefined }, { x: 1800 }], []);
    const range = computeExportXRange(payload);
    expect(range.minX).toBeGreaterThan(0);
    expect(range.maxX).toBeLessThan(4000);
  });

  it('пустой таймлайн даёт нулевой диапазон (рендерер оставит мир по умолчанию)', () => {
    expect(computeExportXRange(makePayload([], []))).toEqual({ minX: 0, maxX: 0 });
  });
});
