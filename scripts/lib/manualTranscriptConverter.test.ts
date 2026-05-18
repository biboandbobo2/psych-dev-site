import { describe, expect, it } from 'vitest';
import {
  buildSegmentsFromMerge,
  parseFwV3File,
  parseMergeFile,
  type FwV3Line,
  type MergeParagraph,
} from './manualTranscriptConverter';

describe('parseMergeFile', () => {
  it('парсит строки вида [mm:ss] [Л|С]: текст', () => {
    const out = parseMergeFile(
      [
        '[00:00] [Л]: Привет.',
        '[01:23] [С]: Здравствуйте.',
        '[12:05] [Л]: Продолжим.',
      ].join('\n')
    );
    expect(out).toEqual([
      { anchorSec: 0, speaker: 'L', text: 'Привет.' },
      { anchorSec: 83, speaker: 'S', text: 'Здравствуйте.' },
      { anchorSec: 725, speaker: 'L', text: 'Продолжим.' },
    ]);
  });

  it('игнорирует посторонние и пустые строки', () => {
    const out = parseMergeFile(
      [
        '## Заголовок без таймкода',
        '',
        '[00:30] [Л]: Только это валидно.',
        'Просто текст без скобок',
      ].join('\n')
    );
    expect(out).toEqual([
      { anchorSec: 30, speaker: 'L', text: 'Только это валидно.' },
    ]);
  });
});

describe('parseFwV3File', () => {
  it('парсит строки вида [123.45s] текст', () => {
    const out = parseFwV3File(
      [
        '[0.0s] Сегодня говорим про память.',
        '[5.25s] Эббингауз был первым.',
        '[ 10.5s] Дальше Бартлетт.',
      ].join('\n')
    );
    expect(out).toEqual([
      { startSec: 0, text: 'Сегодня говорим про память.' },
      { startSec: 5.25, text: 'Эббингауз был первым.' },
      { startSec: 10.5, text: 'Дальше Бартлетт.' },
    ]);
  });

  it('игнорирует строки без таймкода', () => {
    const out = parseFwV3File(
      ['[5.0s] Валидная строка.', 'комментарий', ''].join('\n')
    );
    expect(out).toHaveLength(1);
    expect(out[0].startSec).toBe(5);
  });
});

describe('buildSegmentsFromMerge', () => {
  it('короткое окно: один сегмент с префиксом спикера и anchored startMs', () => {
    const paragraphs: MergeParagraph[] = [
      { anchorSec: 0, speaker: 'L', text: 'Короткий ответ.' },
    ];
    const fwLines: FwV3Line[] = [
      { startSec: 0, text: 'Короткий ответ.' },
      { startSec: 3, text: 'Конец.' },
    ];
    const segments = buildSegmentsFromMerge(paragraphs, fwLines);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      index: 0,
      startMs: 0,
      text: 'Л: Короткий ответ.',
    });
    expect(segments[0].endMs).toBeGreaterThan(segments[0].startMs);
  });

  it('длинное окно: режется на несколько сегментов по fw-v3 backbone', () => {
    // Окно длится ~95с при targetReplyDurationSec=15 — должно идти по backbone.
    const fwLines: FwV3Line[] = Array.from({ length: 20 }, (_, i) => ({
      startSec: i * 5,
      text: `строка ${i} текст для теста бакетов`,
    }));
    const paragraphs: MergeParagraph[] = [
      {
        anchorSec: 0,
        speaker: 'L',
        text:
          'Первое предложение про память. Второе про внимание. ' +
          'Третье про мышление. Четвёртое про восприятие. Пятое про эмоции.',
      },
    ];

    const segments = buildSegmentsFromMerge(paragraphs, fwLines, {
      targetReplyDurationSec: 15,
    });

    expect(segments.length).toBeGreaterThan(1);
    expect(segments.every((s) => s.text.startsWith('Л:'))).toBe(true);
    expect(segments.map((s) => s.index)).toEqual(
      segments.map((_, i) => i)
    );
    for (let i = 1; i < segments.length; i += 1) {
      expect(segments[i].startMs).toBeGreaterThanOrEqual(segments[i - 1].startMs);
    }
  });

  it('чередование Л/С: префиксы соответствуют спикеру каждого параграфа', () => {
    const paragraphs: MergeParagraph[] = [
      { anchorSec: 0, speaker: 'L', text: 'Вопрос?' },
      { anchorSec: 5, speaker: 'S', text: 'Ответ.' },
      { anchorSec: 10, speaker: 'L', text: 'Уточнение.' },
    ];
    const fwLines: FwV3Line[] = [
      { startSec: 0, text: 'Вопрос.' },
      { startSec: 5, text: 'Ответ.' },
      { startSec: 10, text: 'Уточнение.' },
      { startSec: 15, text: 'Конец.' },
    ];

    const segments = buildSegmentsFromMerge(paragraphs, fwLines);

    expect(segments).toHaveLength(3);
    expect(segments[0].text).toBe('Л: Вопрос?');
    expect(segments[1].text).toBe('С: Ответ.');
    expect(segments[2].text).toBe('Л: Уточнение.');
  });

  it('возвращает пустой массив на пустом merge', () => {
    const segments = buildSegmentsFromMerge([], [
      { startSec: 0, text: 'что-то' },
    ]);
    expect(segments).toEqual([]);
  });
});
