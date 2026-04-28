import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Period } from '../../../types/content';
import type { Test } from '../../../types/tests';
import type { VideoTranscriptSearchChunkDoc } from '../../../types/videoTranscripts';
import { useContentSearch } from './useContentSearch';

const EMPTY_DATA = {
  periods: [],
  clinicalTopics: new Map<string, Period>(),
  generalTopics: new Map<string, Period>(),
  transcriptSearchChunks: [] as VideoTranscriptSearchChunkDoc[],
};

function makePeriod(overrides: Partial<Period>): Period {
  return {
    period: 'p1',
    title: '',
    subtitle: '',
    concepts: [],
    authors: [],
    core_literature: [],
    extra_literature: [],
    extra_videos: [],
    accent: '#000',
    accent100: '#fff',
    published: true,
    ...overrides,
  } as Period;
}

function makeTest(overrides: Partial<Test>): Test {
  return {
    id: 't1',
    title: '',
    course: 'development',
    rubric: 'full-course',
    questionCount: 0,
    questions: [],
    status: 'published',
    createdAt: new Date() as never,
    updatedAt: new Date() as never,
    createdBy: 'u',
    ...overrides,
  } as Test;
}

describe('useContentSearch transcript results', () => {
  it('агрегирует несколько совпадений одной лекции в один transcript result', () => {
    const { result } = renderHook(() =>
      useContentSearch(
        {
          periods: [],
          clinicalTopics: new Map(),
          generalTopics: new Map(),
          transcriptSearchChunks: [
            {
              youtubeVideoId: 'dQw4w9WgXcQ',
              referenceKey: 'development::intro::0',
              courseId: 'development',
              periodId: 'intro',
              periodTitle: 'Введение',
              lectureTitle: 'Вступительная лекция',
              sourcePath: 'intro/singleton',
              sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              chunkIndex: 0,
              startMs: 65_000,
              endMs: 80_000,
              timestampLabel: '01:05',
              segmentCount: 2,
              text: 'Развитие связано с переживанием времени',
              normalizedText: 'развитие связано с переживанием времени',
              updatedAt: new Date() as never,
              version: 1,
            },
            {
              youtubeVideoId: 'dQw4w9WgXcQ',
              referenceKey: 'development::intro::0',
              courseId: 'development',
              periodId: 'intro',
              periodTitle: 'Введение',
              lectureTitle: 'Вступительная лекция',
              sourcePath: 'intro/singleton',
              sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              chunkIndex: 1,
              startMs: 125_000,
              endMs: 138_000,
              timestampLabel: '02:05',
              segmentCount: 2,
              text: 'Время и развитие обсуждаются повторно',
              normalizedText: 'время и развитие обсуждаются повторно',
              updatedAt: new Date() as never,
              version: 1,
            },
          ],
        },
        []
      )
    );

    act(() => {
      result.current.search('развитие');
    });

    expect(result.current.state.status).toBe('success');
    expect(result.current.state.results).toHaveLength(1);
    expect(result.current.state.results[0]).toMatchObject({
      type: 'transcript',
      title: 'Вступительная лекция',
      periodTitle: 'Введение',
    });

    const transcriptResult = result.current.state.results[0];
    if (transcriptResult.type !== 'transcript') {
      throw new Error('Expected transcript result');
    }

    expect(transcriptResult.path).toContain('/intro?');
    expect(transcriptResult.path).toContain('study=1');
    expect(transcriptResult.path).toContain('panel=transcript');
    expect(transcriptResult.path).toContain('video=dQw4w9WgXcQ');
    expect(transcriptResult.path).toContain('t=65');
    expect(transcriptResult.timestamps).toEqual([
      expect.objectContaining({ startMs: 65_000, timestampLabel: '01:05' }),
      expect.objectContaining({ startMs: 125_000, timestampLabel: '02:05' }),
    ]);
  });

  it('повторно выполняет поиск, когда transcript chunks догрузились после первого запроса', () => {
    const initialContentData = {
      periods: [],
      clinicalTopics: new Map(),
      generalTopics: new Map(),
      transcriptSearchChunks: [],
    };

    const { result, rerender } = renderHook(
      ({ contentData }) => useContentSearch(contentData, []),
      {
        initialProps: {
          contentData: initialContentData,
        },
      }
    );

    act(() => {
      result.current.search('николай васильевич смирнов');
    });

    expect(result.current.state.results).toHaveLength(0);

    rerender({
      contentData: {
        ...initialContentData,
        transcriptSearchChunks: [
          {
            youtubeVideoId: 'video-2',
            referenceKey: 'development::youth::0',
            courseId: 'development',
            periodId: 'youth',
            periodTitle: 'Юность',
            lectureTitle: 'Лекция про юность',
            sourcePath: 'periods/youth',
            sourceUrl: 'https://www.youtube.com/watch?v=video-2',
            chunkIndex: 0,
            startMs: 90_000,
            endMs: 120_000,
            timestampLabel: '01:30',
            segmentCount: 2,
            text: 'Николай Васильевич Смирнов описывает особенности развития',
            normalizedText: 'николай васильевич смирнов описывает особенности развития',
            updatedAt: new Date() as never,
            version: 1,
          },
        ],
      },
    });

    expect(result.current.state.status).toBe('success');
    expect(result.current.state.results).toHaveLength(1);
    expect(result.current.state.results[0]).toMatchObject({
      type: 'transcript',
      lectureTitle: 'Лекция про юность',
    });
  });
});

describe('useContentSearch query lifecycle', () => {
  it('пустой запрос → status idle, isReady отражает наличие данных', () => {
    const { result } = renderHook(() => useContentSearch(EMPTY_DATA, []));
    expect(result.current.state.status).toBe('idle');
    expect(result.current.hasResults).toBe(false);
    expect(result.current.isReady).toBe(false);
  });

  it('запрос короче minQueryLength → status idle, results пусты', () => {
    const { result } = renderHook(() =>
      useContentSearch(
        { ...EMPTY_DATA, periods: [makePeriod({ title: 'Память' })] },
        [],
        { minQueryLength: 4 },
      ),
    );
    act(() => result.current.search('па'));
    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.results).toHaveLength(0);
  });

  it('запрос только из stop-words → status success, results пусты', () => {
    const { result } = renderHook(() =>
      useContentSearch(
        { ...EMPTY_DATA, periods: [makePeriod({ title: 'and the' })] },
        [],
      ),
    );
    act(() => result.current.search('and the'));
    expect(result.current.state.status).toBe('success');
    expect(result.current.state.results).toHaveLength(0);
  });

  it('reset() возвращает state к idle', () => {
    const { result } = renderHook(() =>
      useContentSearch(
        { ...EMPTY_DATA, periods: [makePeriod({ title: 'Память' })] },
        [],
      ),
    );
    act(() => result.current.search('Память'));
    expect(result.current.state.status).toBe('success');
    act(() => result.current.reset());
    expect(result.current.state).toEqual({ status: 'idle', results: [], query: '' });
  });

  it('AND-семантика: несколько слов требуют наличия всех', () => {
    const { result } = renderHook(() =>
      useContentSearch(
        {
          ...EMPTY_DATA,
          periods: [
            makePeriod({ period: 'p1', title: 'Память и внимание', subtitle: '' }),
            makePeriod({ period: 'p2', title: 'Только память', subtitle: '' }),
          ],
        },
        [],
      ),
    );
    act(() => result.current.search('память внимание'));
    expect(result.current.state.results).toHaveLength(1);
    expect((result.current.state.results[0] as { period: string }).period).toBe('p1');
  });
});

describe('useContentSearch content matching branches', () => {
  it('matches title (highest score) и subtitle одновременно', () => {
    const { result } = renderHook(() =>
      useContentSearch(
        {
          ...EMPTY_DATA,
          periods: [makePeriod({ title: 'Память', subtitle: 'память лекция' })],
        },
        [],
      ),
    );
    act(() => result.current.search('память'));
    const res = result.current.state.results[0] as {
      type: string;
      matchedIn: string[];
      relevanceScore: number;
    };
    expect(res.type).toBe('content');
    expect(res.matchedIn.sort()).toEqual(['subtitle', 'title']);
    expect(res.relevanceScore).toBe(15); // title 10 + subtitle 5
  });

  it('matches concepts через legacy поле (string и { name })', () => {
    const { result } = renderHook(() =>
      useContentSearch(
        {
          ...EMPTY_DATA,
          periods: [
            makePeriod({
              period: 'p-string',
              concepts: ['лимбическая система' as never],
            }),
            makePeriod({
              period: 'p-named',
              concepts: [{ name: 'лимбическая система' }],
            }),
          ],
        },
        [],
      ),
    );
    act(() => result.current.search('лимбическая'));
    expect(result.current.state.results).toHaveLength(2);
    for (const r of result.current.state.results) {
      expect((r as { matchedIn: string[] }).matchedIn).toContain('concepts');
    }
  });

  it('matches concepts через sections и игнорирует legacy при наличии sections', () => {
    const { result } = renderHook(() =>
      useContentSearch(
        {
          ...EMPTY_DATA,
          periods: [
            makePeriod({
              concepts: [{ name: 'устаревшее' }],
              sections: {
                concepts: { title: 'Концепты', content: [{ name: 'кортизол' }] },
              },
            }),
          ],
        },
        [],
      ),
    );
    act(() => result.current.search('кортизол'));
    expect(result.current.state.results).toHaveLength(1);
    act(() => result.current.search('устаревшее'));
    expect(result.current.state.results).toHaveLength(0);
  });

  it('matches authors / literature / videos / leisure', () => {
    const { result } = renderHook(() =>
      useContentSearch(
        {
          ...EMPTY_DATA,
          periods: [
            makePeriod({
              period: 'p-authors',
              authors: [{ name: 'Боулби' }],
            }),
            makePeriod({
              period: 'p-lit',
              core_literature: [{ title: 'Привязанность Боулби' }],
            }),
            makePeriod({
              period: 'p-videos',
              extra_videos: [{ title: 'Лекция Боулби' }],
            }),
            makePeriod({
              period: 'p-leisure',
              leisure: [{ title: 'Фильм про Боулби' }],
            }),
          ],
        },
        [],
      ),
    );
    act(() => result.current.search('боулби'));
    const matchedFields = new Set(
      result.current.state.results.flatMap(
        (r) => (r as { matchedIn: string[] }).matchedIn,
      ),
    );
    expect(matchedFields).toEqual(new Set(['authors', 'literature', 'videos', 'leisure']));
  });

  it('фильтрует unpublished контент', () => {
    const { result } = renderHook(() =>
      useContentSearch(
        {
          ...EMPTY_DATA,
          periods: [makePeriod({ title: 'Память', published: false })],
        },
        [],
      ),
    );
    act(() => result.current.search('память'));
    expect(result.current.state.results).toHaveLength(0);
  });

  it('включает контент из clinicalTopics и generalTopics с правильным course', () => {
    const clinical = new Map([['c1', makePeriod({ period: 'c1', title: 'Шизофрения' })]]);
    const general = new Map([['g1', makePeriod({ period: 'g1', title: 'Шизофрения' })]]);
    const { result } = renderHook(() =>
      useContentSearch({ ...EMPTY_DATA, clinicalTopics: clinical, generalTopics: general }, []),
    );
    act(() => result.current.search('шизофрения'));
    const courses = (result.current.state.results as Array<{ course: string }>).map((r) => r.course);
    expect(courses.sort()).toEqual(['clinical', 'general']);
  });
});

describe('useContentSearch test matching branches', () => {
  it('matches testTitle, question, answer, explanation; считает каждое поле один раз', () => {
    const { result } = renderHook(() =>
      useContentSearch(EMPTY_DATA, [
        makeTest({
          id: 't1',
          title: 'Тест про память',
          questions: [
            {
              id: 'q1',
              questionText: 'Что такое память?',
              answers: [
                { id: 'a1', text: 'память это процесс' },
                { id: 'a2', text: 'память это всё' },
              ],
              correctAnswerId: 'a1',
              shuffleAnswers: false,
              revealPolicy: 'never',
              explanation: 'память изучается давно',
            } as never,
          ],
        }),
      ]),
    );
    act(() => result.current.search('память'));
    const res = result.current.state.results[0] as {
      type: string;
      matchedIn: string[];
      relevanceScore: number;
    };
    expect(res.type).toBe('test');
    expect(res.matchedIn.sort()).toEqual(['answer', 'explanation', 'question', 'testTitle']);
    expect(res.relevanceScore).toBe(10 + 7 + 5 + 4);
  });

  it('фильтрует не-published тесты', () => {
    const { result } = renderHook(() =>
      useContentSearch(EMPTY_DATA, [
        makeTest({ title: 'Память', status: 'draft' }),
        makeTest({ id: 't2', title: 'Память', status: 'unpublished' }),
      ]),
    );
    act(() => result.current.search('память'));
    expect(result.current.state.results).toHaveLength(0);
  });
});

describe('useContentSearch ordering', () => {
  it('контент идёт первым, потом transcript, потом тесты', () => {
    const { result } = renderHook(() =>
      useContentSearch(
        {
          ...EMPTY_DATA,
          periods: [makePeriod({ title: 'foo' })],
          transcriptSearchChunks: [
            {
              youtubeVideoId: 'v1',
              referenceKey: 'k1',
              courseId: 'development',
              periodId: 'p',
              periodTitle: 'P',
              lectureTitle: 'L',
              sourcePath: '',
              sourceUrl: '',
              chunkIndex: 0,
              startMs: 0,
              endMs: 1,
              timestampLabel: '00:00',
              segmentCount: 1,
              text: 'foo',
              normalizedText: 'foo',
              updatedAt: new Date() as never,
              version: 1,
            },
          ],
        },
        [makeTest({ title: 'foo' })],
      ),
    );
    act(() => result.current.search('foo'));
    const types = (result.current.state.results as Array<{ type: string }>).map((r) => r.type);
    expect(types).toEqual(['content', 'transcript', 'test']);
  });
});
