import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IconRecord, IconSummary } from '../types';
import { allRecordQuestions, selectRecognitionIcons } from './recognition';
const base = resolve(process.cwd(), 'public/iconography');
const icons: IconSummary[] = JSON.parse(readFileSync(`${base}/catalog.json`, 'utf8'));
const readRecord = (id: string): IconRecord => JSON.parse(readFileSync(`${base}/records/${id}.json`, 'utf8'));
describe('recognition curriculum', () => {
  it('starts immediately with seven varied Russian works and changes examples between rounds', () => {
    const first = selectRecognitionIcons(icons, 'russian', 0);
    expect(first).toHaveLength(7);
    expect(first.every((x) => x.tradition === 'Русская')).toBe(true);
    expect(new Set(first.map((x) => x.recognitionGroup)).size).toBe(7);
    expect(first[0].id).toBe('ru-6226762');
    const later = Array.from({ length: 10 }, (_, round) => selectRecognitionIcons(icons, 'russian', round)).flat();
    expect(new Set(later.filter((x) => x.recognitionGroup === 'christ').map((x) => x.id)).size).toBeGreaterThan(1);
  });
  it('keeps each regional selection separate and uses varied works', () => {
    const selected = selectRecognitionIcons(icons, 'georgian', 0);
    expect(selected.length).toBeGreaterThanOrEqual(5);
    expect(new Set(selected.map((x) => x.recognitionGroup)).size).toBe(selected.length);
    for (const collection of ['byzantine', 'greek'] as const) {
      const regional = selectRecognitionIcons(icons, collection, 0);
      expect(regional.length).toBeGreaterThanOrEqual(5);
      expect(regional.every((x) => x.tradition !== 'Русская' && x.tradition !== 'Грузинская')).toBe(true);
    }
    expect(selected.every((x) => x.tradition === 'Грузинская')).toBe(true);
  });
  it('changes the meaning of the apostle question with level, while retaining the original passport questions', () => {
    const record = readRecord('paul-ubisi');
    expect(record.recognition?.beginner.answer).toBe('Апостол');
    expect(record.recognition?.explorer.answer).toBe('Апостол Павел');
    expect(record.recognition?.explorer.distractors.every((x) => x.startsWith('Апостол '))).toBe(true);
    expect(record.recognition?.expert.answer).toContain('лоб');
    expect(record.questions).toHaveLength(8);
    expect(allRecordQuestions(record)).toHaveLength(11);
  });
  it('keeps every old catalogue ID and gives each included recognition work three independent questions', () => {
    for (const id of ['cma-168322','cma-136864','cma-136863','cma-136865','cma-150516','cma-375054','cma-283088','cma-143165','cma-128825','met-464531','met-464014','met-464013','met-464428','met-465946','met-474336','met-464011','met-463984','met-466163','met-468704','tsilkani','paul-ubisi']) expect(icons.some((x) => x.id === id)).toBe(true);
    for (const icon of icons.filter((x) => x.recognitionGroup)) {
      const r = readRecord(icon.id).recognition!;
      expect(new Set([r.beginner.id,r.explorer.id,r.expert.id]).size).toBe(3);
      expect(r.beginner.answer).not.toBe(r.expert.answer);
      for (const q of [r.beginner,r.explorer,r.expert]) {
        expect(q.iconId).toBe(icon.id);
        expect(q.distractors.length).toBeGreaterThanOrEqual(2);
        expect(q.distractors).not.toContain(q.answer);
      }
      if(r.detail) expect(r.detail.x + r.detail.width).toBeLessThanOrEqual(1);
    }
  });
});
