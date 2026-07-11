import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { biographyBenchmarkGroundTruth } from '../../scripts/lib/biographyBenchmarkGroundTruth';
import { matchesBenchmarkText } from '../../scripts/lib/biographyBenchmarkMatchers';
import { biographyBenchmarkSet, STABILITY_SUBSET_IDS } from '../../scripts/lib/biographyBenchmarkSet';

const WIKI_FIXTURES_DIR = path.resolve(__dirname, '../fixtures/biography/wiki');

function loadFixture(id: string): { biographyExtract: string } | null {
  const filePath = path.join(WIKI_FIXTURES_DIR, `${id}.json`);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

describe('biography benchmark: набор и ground truth', () => {
  it('сплит 15 worker / 5 holdout, id уникальны', () => {
    expect(biographyBenchmarkSet.filter((e) => e.set === 'worker')).toHaveLength(15);
    expect(biographyBenchmarkSet.filter((e) => e.set === 'holdout')).toHaveLength(5);
    expect(new Set(biographyBenchmarkSet.map((e) => e.id)).size).toBe(biographyBenchmarkSet.length);
  });

  it('все sourceUrl — прямые ссылки *.wikipedia.org/wiki/... (инвариант источников)', () => {
    for (const entry of biographyBenchmarkSet) {
      const url = new URL(entry.sourceUrl);
      expect(url.hostname, entry.id).toMatch(/(^|\.)wikipedia\.org$/);
      expect(url.pathname, entry.id).toMatch(/^\/wiki\//);
    }
  });

  it('stability-подмножество — 5 статей из набора', () => {
    expect(STABILITY_SUBSET_IDS).toHaveLength(5);
    for (const id of STABILITY_SUBSET_IDS) {
      expect(biographyBenchmarkSet.some((e) => e.id === id), id).toBe(true);
    }
  });

  // Каждый ground-truth факт обязан находиться в тексте статьи (fixture),
  // который реально видит модель (biographyExtract). Падение здесь = либо
  // выдуманный факт, либо статья уехала и fixture надо перекачать осознанно.
  for (const entry of biographyBenchmarkSet) {
    const facts = biographyBenchmarkGroundTruth[entry.id];
    it(`${entry.id}: ground truth валиден против fixture`, () => {
      expect(facts, `нет ground truth для ${entry.id}`).toBeDefined();
      expect(facts.length).toBeGreaterThanOrEqual(3);
      expect(facts.some((f) => f.id === 'birth' && f.critical)).toBe(true);
      expect(facts.some((f) => f.id === 'death' && f.critical)).toBe(true);

      const fixture = loadFixture(entry.id);
      expect(fixture, `нет fixture ${entry.id} — запусти --fetch-fixtures`).not.toBeNull();

      for (const fact of facts) {
        expect(
          matchesBenchmarkText(fixture!.biographyExtract, fact.article),
          `${entry.id}/${fact.id}: article-матчер не находит факт в biographyExtract`
        ).toBe(true);
        expect(fact.timeline, `${entry.id}/${fact.id}: нет timeline-матчера`).toBeDefined();
      }

      const birthYear = facts.find((f) => f.id === 'birth')!.year!;
      const deathYear = facts.find((f) => f.id === 'death')!.year!;
      for (const fact of facts) {
        if (fact.year == null) continue;
        expect(fact.year, `${entry.id}/${fact.id}: год вне жизни`).toBeGreaterThanOrEqual(birthYear);
        expect(fact.year, `${entry.id}/${fact.id}: год вне жизни`).toBeLessThanOrEqual(deathYear);
      }
    });
  }
});
