/**
 * Property-тесты инвариантов persistence-слоя
 * (I4, I9, I11, I12/Д8 из docs/plans/timeline-invariant-audit.md).
 */
import { describe, expect, it } from 'vitest';
import { normalizeImportedTimelineData } from './persistence';
import { buildTimelineExportPayload } from './utils/exporters/common';
import type { TimelineData } from './types';
import {
  canonical,
  g,
  genTimeline,
  type FlatGraph,
} from './utils/__tests__/graphGen';

function asTimelineData(flat: FlatGraph, extra: Partial<TimelineData> = {}): TimelineData {
  return {
    currentAge: 30,
    ageMax: 100,
    nodes: flat.nodes,
    edges: flat.edges,
    birthDetails: {},
    selectedPeriodization: null,
    ...extra,
  };
}

const SEEDS = Array.from({ length: 80 }, (_, i) => i + 1);

describe('I4: normalizeImportedTimelineData идемпотентна', () => {
  it('на чистых графах', () => {
    for (const seed of SEEDS) {
      const once = normalizeImportedTimelineData(asTimelineData(genTimeline(seed)));
      const twice = normalizeImportedTimelineData(once);
      expect(twice, `seed=${seed}`).toEqual(once);
    }
  });

  it('на повреждённых графах (shared-x, битые parentX)', () => {
    for (const seed of SEEDS) {
      const flat = genTimeline(seed, { sharedXChance: 0.4, brokenParentXCount: 2 });
      const once = normalizeImportedTimelineData(asTimelineData(flat));
      const twice = normalizeImportedTimelineData(once);
      expect(twice, `seed=${seed}`).toEqual(once);
    }
  });

  it('на документах с дублями id (до-B5 повреждение)', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const flat = genTimeline(seed);
      const corrupted = {
        ...asTimelineData(flat),
        nodes: [...flat.nodes, ...flat.nodes],
        edges: [...flat.edges, ...flat.edges],
      };
      const once = normalizeImportedTimelineData(corrupted);
      const twice = normalizeImportedTimelineData(once);
      expect(twice, `seed=${seed}`).toEqual(once);
    }
  });
});

describe('I9: экспорт → импорт сохраняет семантику', () => {
  it('nodes/edges чистого таймлайна проходят round-trip без изменений', () => {
    for (const seed of SEEDS) {
      const data = asTimelineData(genTimeline(seed));
      const payload = buildTimelineExportPayload(data);
      const imported = normalizeImportedTimelineData(JSON.parse(JSON.stringify(payload)));
      expect(canonical({ nodes: imported.nodes, edges: imported.edges }), `seed=${seed}`).toBe(
        canonical({ nodes: data.nodes, edges: data.edges })
      );
      expect(imported.currentAge, `seed=${seed}`).toBe(data.currentAge);
      expect(imported.ageMax, `seed=${seed}`).toBe(data.ageMax);
      expect(imported.birthDetails, `seed=${seed}`).toEqual(data.birthDetails);
      expect(imported.selectedPeriodization, `seed=${seed}`).toBe(data.selectedPeriodization);
    }
  });
});

describe('I11: импорт повреждённых данных детерминирован', () => {
  it('не-объект отклоняется с понятной ошибкой', () => {
    expect(() => normalizeImportedTimelineData('мусор')).toThrow(/JSON-объект/);
    expect(() => normalizeImportedTimelineData(null)).toThrow(/JSON-объект/);
  });

  it('одинаковый повреждённый вход даёт одинаковый результат', () => {
    const flat = genTimeline(7, { sharedXChance: 0.5, brokenParentXCount: 3 });
    const a = normalizeImportedTimelineData(asTimelineData(flat));
    const b = normalizeImportedTimelineData(asTimelineData(genTimeline(7, { sharedXChance: 0.5, brokenParentXCount: 3 })));
    expect(a).toEqual(b);
  });
});

describe('EdgeT.label: название ветки переживает импорт', () => {
  it('label сохраняется, пустой/мусорный — отбрасывается', () => {
    const flat = g()
      .root('a', 10)
      .branch('e1', 'a', { x: 2100, startAge: 10, endAge: 20 })
      .branch('e2', 'a', { x: 2200, startAge: 10, endAge: 20 })
      .build();
    const withLabels = {
      ...asTimelineData(flat),
      edges: [
        { ...flat.edges[0], label: '  Если бы остался  ' },
        { ...flat.edges[1], label: '' },
      ],
    };
    const imported = normalizeImportedTimelineData(withLabels);
    expect(imported.edges.find((e) => e.id === 'e1')!.label).toBe('Если бы остался');
    expect(imported.edges.find((e) => e.id === 'e2')!.label).toBeUndefined();
  });
});

describe('Д8/I12: импорт лечит события вне возрастного окна своей ветки', () => {
  it('расширяет окно ветки до события за endAge (симметрично B14-отказу в UI)', () => {
    // Ветка [10,20], событие на ней в 25 лет — состояние, которое UI
    // создать не даёт (B11/B14), но legacy-документ может содержать.
    const flat = g()
      .root('a', 10)
      .branch('e1', 'a', { x: 2100, startAge: 10, endAge: 20 })
      .rawNode({ id: 'late', age: 25, x: 2100, parentX: 2100, label: 'late', isDecision: false })
      .build();

    const imported = normalizeImportedTimelineData(asTimelineData(flat));
    const e1 = imported.edges.find((e) => e.id === 'e1')!;
    expect(e1.endAge).toBeGreaterThanOrEqual(25);
    // Событие осталось на ветке, а не «повисло в воздухе».
    expect(imported.nodes.find((n) => n.id === 'late')!.parentX).toBe(2100);
  });

  it('расширяет окно ветки до события раньше startAge', () => {
    const flat = g()
      .root('a', 30)
      .branch('e1', 'a', { x: 2100, startAge: 30, endAge: 40 })
      .rawNode({ id: 'early', age: 12, x: 2100, parentX: 2100, label: 'early', isDecision: false })
      .build();

    const imported = normalizeImportedTimelineData(asTimelineData(flat));
    const e1 = imported.edges.find((e) => e.id === 'e1')!;
    expect(e1.startAge).toBeLessThanOrEqual(12);
  });

  it('лечение идемпотентно', () => {
    const flat = g()
      .root('a', 10)
      .branch('e1', 'a', { x: 2100, startAge: 10, endAge: 20 })
      .rawNode({ id: 'late', age: 25, x: 2100, parentX: 2100, label: 'late', isDecision: false })
      .build();

    const once = normalizeImportedTimelineData(asTimelineData(flat));
    const twice = normalizeImportedTimelineData(once);
    expect(twice).toEqual(once);
  });
});
