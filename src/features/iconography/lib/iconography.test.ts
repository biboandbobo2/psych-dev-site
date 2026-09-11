import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IconRecord, IconSummary } from '../types';
import { dailyIcon, loadIcon, searchIcons } from './catalog';
import { readProgress, recordAnswer } from './progress';
import { difficulties, optionsFor } from './quiz';
import { teachingQuestions } from './learning';
import { allRecordQuestions } from './recognition';
const base = resolve(process.cwd(), 'public/iconography');
const icons: IconSummary[] = JSON.parse(readFileSync(`${base}/catalog.json`, 'utf8'));
const records: IconRecord[] = icons.map((icon) => JSON.parse(readFileSync(`${base}/records/${icon.id}.json`, 'utf8')));
const manifest: { id: string; source: string; licenseUrl: string; sha256: string; widths: number[] }[] = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/iconography/media-manifest.json'), 'utf8'));

describe('editorial catalogue release gate', () => {
  it('has matching unique records, explicit rights, sources and local derivatives', () => {
    expect(new Set(icons.map((x) => x.id)).size).toBe(icons.length);
    expect(icons.length).toBeGreaterThanOrEqual(20);
    expect(manifest).toHaveLength(icons.length);
    for (const record of records) {
      expect(record.rights.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['CC0', 'Общественное достояние (PD-Art)', 'CC BY-SA 4.0']).toContain(record.rights.label);
      expect(record.sources[0].url).toMatch(/^https:\/\//);
      expect(record.caution.length).toBeGreaterThan(30);
      expect(record.clues[0].text.length).toBeGreaterThan(30);
      const provenance = manifest.find((x) => x.id === record.id)!;
      expect(provenance.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(provenance.source).toBe(record.sources[0].url);
      expect(provenance.licenseUrl).toBe(record.rights.url);
      expect(provenance.widths).toEqual(record.image.widths);
      for (const width of record.image.widths) {
        const path = `${base}/images/${record.id}-${width}.webp`;
        expect(existsSync(path)).toBe(true);
        expect(statSync(path).size).toBeLessThan(1_500_000);
        expect(width).toBeLessThanOrEqual(record.image.width);
      }
    }
  });

  it('provides usable reading links and school articles without empty visual clues', () => {
    const schools: { id: string; sections: { title: string; text: string }[] }[] = JSON.parse(readFileSync(`${base}/schools.json`, 'utf8'));
    for (const r of records) {
      expect(schools.some((s) => s.id === r.schoolId)).toBe(true);
      expect(r.reading?.length).toBeGreaterThan(0);
      for (const link of r.reading!) expect(link.url).toMatch(/^https:\/\/ru\.wikipedia\.org\/wiki\//);
      expect(r.clues.length).toBeGreaterThanOrEqual(2);
      for (const clue of r.clues) {
        expect(clue.title.length).toBeGreaterThan(3);
        expect(clue.text.length).toBeGreaterThan(25);
        expect(clue.title).not.toBe('Что важно помнить');
      }
    }
  });
  it('retains uncertainty and separates Georgian provenance from Byzantine attribution', () => {
    expect(records.find((x) => x.id === 'cma-168322')?.attribution).toContain('Приписывается');
    expect(records.find((x) => x.id === 'cma-136864')?.region).toContain('возможно');
    expect(records.find((x) => x.id === 'tsilkani')?.period).toContain('поновления');
    expect(records.find((x) => x.id === 'met-464011')?.period).toContain('или позднее');
    expect(records.filter((x) => x.tradition === 'Грузинская').length).toBeGreaterThanOrEqual(2);
  });
  it('questions remain answerable at every level and refer to their own work', () => {
    const questions = [...records.flatMap(allRecordQuestions), ...teachingQuestions];
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    for (const q of questions) {
      expect(q.distractors).not.toContain(q.answer);
      expect(q.explanation.length).toBeGreaterThan(30);
      if (q.iconId) expect(records.some((r) => r.id === q.iconId && allRecordQuestions(r).includes(q))).toBe(true);
      for (const difficulty of difficulties) {
        const options = optionsFor(q, difficulty.id);
        expect(options).toContain(q.answer);
        expect(new Set(options).size).toBe(options.length);
        expect(options.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('discovery and bounded loading', () => {
  it('searches multiple terms across museum, type and attribution', () => {
    expect(searchIcons(icons, 'умиление крит').map((x) => x.id)).toContain('cma-168322');
    expect(searchIcons(icons, 'Фаберже')[0].id).toBe('cma-375054');
    expect(searchIcons(icons, '', 'Грузинская', '14').map((x) => x.id)).toEqual(['paul-ubisi', 'ge-12630678']);
    expect(searchIcons(icons, 'никогда-не-найти')).toEqual([]);
  });
  it('changes daily work only at UTC day boundaries and handles an empty catalogue', () => {
    expect(dailyIcon(icons, new Date('2026-09-08T00:00:00Z'))).toEqual(dailyIcon(icons, new Date('2026-09-08T23:59:59Z')));
    expect(dailyIcon(icons, new Date('2026-09-09T00:00:00Z'))).not.toEqual(dailyIcon(icons, new Date('2026-09-08T23:59:59Z')));
    expect(dailyIcon([])).toBeUndefined();
  });
  it('rejects traversal before fetching a record', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch');
    await expect(loadIcon('../private')).rejects.toThrow('не найдена');
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockRestore();
  });
});

describe('private local learning progress', () => {
  beforeEach(() => localStorage.clear());
  it('repeats a failed question once, removes it only on a correct answer and keeps other failures', () => {
    recordAnswer('icon-a-subject', false); recordAnswer('icon-a-subject', false); recordAnswer('icon-a-period', false);
    expect(readProgress().difficult).toEqual(['icon-a-subject', 'icon-a-period']);
    recordAnswer('icon-a-subject', true);
    expect(readProgress()).toEqual({ difficult: ['icon-a-period'], answered: 4, correct: 1 });
  });
  it('recovers from malformed or unsupported browser storage without losing the session', () => {
    localStorage.setItem('academy.iconography.progress.v1', 'broken json');
    expect(readProgress().difficult).toEqual([]);
    const set = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(recordAnswer('icon-a', false)).toBe(false);
    set.mockRestore();
  });
});
