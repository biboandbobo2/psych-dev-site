import { describe, expect, it } from 'vitest';
import { buildPosterSubtitle, collectSphereLegend } from '../exportPoster';
import { SPHERE_META } from '../../../constants';
import type { NodeT } from '../../../types';

describe('exportPoster helpers', () => {
  it('collectSphereLegend: только сферы с событиями, порядок как в SPHERE_META', () => {
    const nodes: NodeT[] = [
      { id: 'a', age: 1, label: 'A', isDecision: false, sphere: 'family' },
      { id: 'b', age: 2, label: 'B', isDecision: false, sphere: 'education' },
      { id: 'c', age: 3, label: 'C', isDecision: false, sphere: 'family' },
      { id: 'd', age: 4, label: 'D', isDecision: false }, // без сферы
    ];
    const legend = collectSphereLegend(nodes);
    expect(legend).toEqual([
      {
        color: SPHERE_META.education.color,
        label: SPHERE_META.education.label,
        emoji: SPHERE_META.education.emoji,
        count: 1,
      },
      {
        color: SPHERE_META.family.color,
        label: SPHERE_META.family.label,
        emoji: SPHERE_META.family.emoji,
        count: 2,
      },
    ]);
  });

  it('collectSphereLegend: пусто без сфер', () => {
    expect(collectSphereLegend([{ id: 'x', age: 1, label: 'X', isDecision: false }])).toEqual([]);
  });

  it('buildPosterSubtitle содержит возраст', () => {
    const subtitle = buildPosterSubtitle({
      currentAge: 28,
      ageMax: 100,
      nodes: [],
      edges: [],
      birthDetails: {},
      selectedPeriodization: null,
    });
    expect(subtitle).toContain('Возраст 28');
  });
});
