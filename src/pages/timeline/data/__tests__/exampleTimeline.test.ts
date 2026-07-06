import { describe, expect, it } from 'vitest';
import { EXAMPLE_TIMELINE } from '../exampleTimeline';
import { normalizeImportedTimelineData } from '../../persistence';
import { referentialViolations, duplicateIds } from '../../utils/__tests__/graphGen';
import { LINE_X_POSITION } from '../../constants';

describe('EXAMPLE_TIMELINE (стартовый пример)', () => {
  it('проходит нормализацию без изменений (данные каноничны)', () => {
    const normalized = normalizeImportedTimelineData(EXAMPLE_TIMELINE);
    expect(normalized.nodes).toEqual(EXAMPLE_TIMELINE.nodes);
    expect(normalized.edges).toEqual(EXAMPLE_TIMELINE.edges);
    expect(normalized.currentAge).toBe(EXAMPLE_TIMELINE.currentAge);
    expect(normalized.ageMax).toBe(EXAMPLE_TIMELINE.ageMax);
  });

  it('не нарушает ссылочную целостность и не содержит дублей', () => {
    expect(referentialViolations(EXAMPLE_TIMELINE)).toEqual([]);
    expect(duplicateIds(EXAMPLE_TIMELINE.nodes)).toEqual([]);
    expect(duplicateIds(EXAMPLE_TIMELINE.edges)).toEqual([]);
  });

  it('события веток лежат в их возрастных окнах (I12), origin вне главной линии', () => {
    for (const edge of EXAMPLE_TIMELINE.edges) {
      const origin = EXAMPLE_TIMELINE.nodes.find((n) => n.id === edge.nodeId)!;
      expect(origin.x, `origin ${origin.id}`).not.toBe(LINE_X_POSITION);
      const onBranch = EXAMPLE_TIMELINE.nodes.filter((n) => n.parentX === edge.x);
      expect(onBranch.length).toBeGreaterThan(0);
      for (const ev of onBranch) {
        expect(ev.age, `событие ${ev.id}`).toBeGreaterThanOrEqual(edge.startAge);
        expect(ev.age, `событие ${ev.id}`).toBeLessThanOrEqual(edge.endAge);
      }
    }
  });
});
