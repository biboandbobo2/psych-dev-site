import { describe, expect, it } from 'vitest';
import { addSpan, coveredSeconds, isNaturalPlaybackStep, mergeSpans } from './watchSpans';

describe('isNaturalPlaybackStep', () => {
  it('обычное воспроизведение и скорость ×2 — естественный шаг', () => {
    expect(isNaturalPlaybackStep(1, 1)).toBe(true);
    expect(isNaturalPlaybackStep(2, 1)).toBe(true);
    expect(isNaturalPlaybackStep(0, 1)).toBe(true);
  });

  it('фоновая вкладка тикает раз в минуту — шаг всё равно естественный', () => {
    expect(isNaturalPlaybackStep(60, 60)).toBe(true);
  });

  it('перемотка вперёд и назад — не воспроизведение', () => {
    expect(isNaturalPlaybackStep(600, 1)).toBe(false);
    expect(isNaturalPlaybackStep(10, 1)).toBe(false);
    expect(isNaturalPlaybackStep(-10, 1)).toBe(false);
  });
});

describe('addSpan / coveredSeconds', () => {
  it('сливает стыкующиеся отрезки', () => {
    const spans = addSpan(addSpan([], 0, 10), 10, 20);
    expect(spans).toEqual([0, 20]);
    expect(coveredSeconds(spans)).toBe(20);
  });

  it('пересмотр того же куска не увеличивает покрытие', () => {
    const spans = addSpan(addSpan([0, 30], 5, 25), 0, 30);
    expect(spans).toEqual([0, 30]);
    expect(coveredSeconds(spans)).toBe(30);
  });

  it('разрозненные отрезки сортируются и считаются суммой', () => {
    const spans = addSpan(addSpan([], 100, 110), 0, 10);
    expect(spans).toEqual([0, 10, 100, 110]);
    expect(coveredSeconds(spans)).toBe(20);
  });

  it('округляет границы до секунды и игнорирует пустые отрезки', () => {
    expect(addSpan([], 1.4, 5.6)).toEqual([1, 6]);
    expect(addSpan([], 5, 5.2)).toEqual([]);
  });
});

describe('mergeSpans', () => {
  it('объединяет наборы с разных устройств', () => {
    expect(mergeSpans([0, 10, 50, 60], [5, 20])).toEqual([0, 20, 50, 60]);
  });

  it('мусор из Firestore отбрасывается', () => {
    expect(mergeSpans('bad', [0, 'x', 5, 10, 20, 15, 30])).toEqual([5, 10]);
    expect(mergeSpans(undefined, null)).toEqual([]);
  });
});
