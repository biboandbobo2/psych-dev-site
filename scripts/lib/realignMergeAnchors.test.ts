import { describe, expect, it } from 'vitest';
import { realignMergeAnchors } from './realignMergeAnchors';
import type {
  FwV3Line,
  MergeParagraph,
} from './manualTranscriptConverter';

const fwLines: FwV3Line[] = [
  { startSec: 0, text: 'Сегодня мы поговорим про память и её виды.' },
  { startSec: 5, text: 'Начнём с классической работы Эббингауза.' },
  { startSec: 10, text: 'Он использовал бессмысленные слоги для эксперимента.' },
  { startSec: 30, text: 'Дальше Бартлетт показал реконструктивную природу памяти.' },
  { startSec: 60, text: 'Зейгарник изучала прерванные действия в школе Левина.' },
  { startSec: 90, text: 'Овсянкина продолжила исследования Зейгарник.' },
];

describe('realignMergeAnchors', () => {
  it('сдвигает anchor к точной fw-v3 строке по совпадению токенов', () => {
    const paragraphs: MergeParagraph[] = [
      {
        anchorSec: 25, // намеренно на ~5 сек впереди реального 30s
        speaker: 'L',
        text: 'Бартлетт показал реконструктивную природу памяти и контекст.',
      },
    ];
    const { paragraphs: out, diagnostics } = realignMergeAnchors(
      paragraphs,
      fwLines
    );
    expect(out[0].anchorSec).toBe(30);
    expect(diagnostics.updatedCount).toBe(1);
    expect(diagnostics.shiftStats.maxAbsSec).toBe(5);
  });

  it('не меняет anchor если совпадений мало', () => {
    const paragraphs: MergeParagraph[] = [
      {
        anchorSec: 25,
        speaker: 'L',
        text: 'Что-то совершенно постороннее без знакомых слов.',
      },
    ];
    const { paragraphs: out, diagnostics } = realignMergeAnchors(
      paragraphs,
      fwLines
    );
    expect(out[0].anchorSec).toBe(25);
    expect(diagnostics.skippedLowOverlap).toBe(1);
  });

  it('пропускает слишком короткие абзацы', () => {
    const paragraphs: MergeParagraph[] = [
      { anchorSec: 25, speaker: 'L', text: 'Да.' },
    ];
    const { diagnostics } = realignMergeAnchors(paragraphs, fwLines);
    expect(diagnostics.skippedShort).toBe(1);
  });

  it('при равных overlap выбирает ближайший к старому anchor', () => {
    // Добавим дубликат фразы про Эббингауза далеко по времени:
    const linesWithDup: FwV3Line[] = [
      ...fwLines,
      { startSec: 500, text: 'И снова про Эббингауза, бессмысленные слоги.' },
    ];
    const paragraphs: MergeParagraph[] = [
      {
        anchorSec: 8,
        speaker: 'L',
        text: 'Эббингауз использовал бессмысленные слоги.',
      },
    ];
    const { paragraphs: out } = realignMergeAnchors(paragraphs, linesWithDup);
    // Ожидаем 5 или 10 (близко к 8), не 500.
    expect(out[0].anchorSec).toBeLessThan(20);
  });

  it('не выходит за окно ±searchRadiusSec', () => {
    const paragraphs: MergeParagraph[] = [
      {
        anchorSec: 500, // далеко от всех fw-v3 строк
        speaker: 'L',
        text: 'Эббингауз бессмысленные слоги эксперимент.',
      },
    ];
    const { paragraphs: out, diagnostics } = realignMergeAnchors(
      paragraphs,
      fwLines,
      { searchRadiusSec: 60 }
    );
    expect(out[0].anchorSec).toBe(500); // остался прежним
    expect(diagnostics.skippedLowOverlap).toBe(1);
  });
});
