import { describe, expect, it } from 'vitest';
import type { NodeT, EdgeT } from '../../types';
import { computeExportTopAge, type TimelineExportPayload } from '../exporters/common';

function buildPayload(overrides: Partial<TimelineExportPayload> = {}): TimelineExportPayload {
  return {
    currentAge: 30,
    ageMax: 100,
    nodes: [],
    edges: [],
    birthDetails: {},
    selectedPeriodization: null,
    ...overrides,
  };
}

describe('computeExportTopAge', () => {
  it('returns currentAge + 5 buffer when there are no events', () => {
    expect(computeExportTopAge(buildPayload({ currentAge: 30 }))).toBe(35);
  });

  it('takes the latest node age into account', () => {
    const nodes: NodeT[] = [
      { id: 'a', age: 10, label: 'a', isDecision: false },
      { id: 'b', age: 42, label: 'b', isDecision: false },
    ];
    expect(computeExportTopAge(buildPayload({ currentAge: 25, nodes }))).toBe(47);
  });

  it('takes the latest edge.endAge into account', () => {
    const edges: EdgeT[] = [
      { id: 'e1', x: 100, startAge: 30, endAge: 55, color: '#000', nodeId: 'n1' },
    ];
    expect(computeExportTopAge(buildPayload({ currentAge: 25, edges }))).toBe(60);
  });

  it('clamps to ageMax', () => {
    const nodes: NodeT[] = [{ id: 'a', age: 99, label: 'a', isDecision: false }];
    expect(computeExportTopAge(buildPayload({ currentAge: 99, nodes, ageMax: 100 }))).toBe(100);
  });

  it('rounds fractional ages up before adding buffer', () => {
    const nodes: NodeT[] = [{ id: 'a', age: 22.5, label: 'a', isDecision: false }];
    expect(computeExportTopAge(buildPayload({ currentAge: 0, nodes }))).toBe(28);
  });

  it('returns just the buffer for an empty canvas at age 0', () => {
    expect(computeExportTopAge(buildPayload({ currentAge: 0 }))).toBe(5);
  });
});
