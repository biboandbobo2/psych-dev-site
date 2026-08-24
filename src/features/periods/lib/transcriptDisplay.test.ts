import { describe, expect, it } from 'vitest';
import { groupTranscriptSegments } from './transcriptDisplay';
import type { VideoTranscriptSegment } from '../../../types/videoTranscripts';

function seg(index: number, startMs: number, endMs: number, text: string): VideoTranscriptSegment {
  return { index, startMs, endMs, durationMs: endMs - startMs, text };
}

describe('groupTranscriptSegments', () => {
  it('склеивает короткие подряд идущие youtube-реплики в один абзац', () => {
    const groups = groupTranscriptSegments([
      seg(0, 0, 2000, 'Так, э, привет всем вновь'),
      seg(1, 2000, 5000, 'присоединившимся.'),
      seg(2, 5000, 8000, 'Мы решаем технические вопросы'),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      index: 0,
      startMs: 0,
      endMs: 8000,
      durationMs: 8000,
      text: 'Так, э, привет всем вновь присоединившимся. Мы решаем технические вопросы',
    });
  });

  it('начинает новый абзац на паузе в речи', () => {
    const groups = groupTranscriptSegments([
      seg(0, 0, 2000, 'Первая реплика.'),
      seg(1, 9000, 11000, 'После паузы.'),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].startMs).toBe(0);
    expect(groups[1].startMs).toBe(9000);
  });

  it('начинает новый абзац, когда текущий набрал целевую длину', () => {
    const longText = 'а'.repeat(350);
    const groups = groupTranscriptSegments([
      seg(0, 0, 2000, longText),
      seg(1, 2000, 4000, 'Продолжение сразу после.'),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[1].text).toBe('Продолжение сразу после.');
  });

  it('не трогает ручные транскрипты с длинными сегментами', () => {
    const manual = [
      seg(0, 0, 30000, 'Л: '.padEnd(400, 'разговорный длинный текст ')),
      seg(1, 30000, 62000, 'Л: '.padEnd(380, 'вторая длинная реплика ')),
    ];

    const groups = groupTranscriptSegments(manual);

    expect(groups).toHaveLength(2);
    expect(groups[0].text).toBe(manual[0].text);
    expect(groups[1].text).toBe(manual[1].text);
  });

  it('пустой список — пустой результат', () => {
    expect(groupTranscriptSegments([])).toEqual([]);
  });
});
