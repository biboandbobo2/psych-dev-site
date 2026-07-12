import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDoc } from 'firebase/firestore';
import { loadGroupProgress } from './GroupWatchStats';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, ...path: string[]) => ({ path: path.join('/') })),
  getDoc: vi.fn(),
}));

vi.mock('../../../lib/firebase', () => ({
  db: {},
}));

vi.mock('../../../hooks/useAllGroups', () => ({
  useAllGroups: vi.fn(() => ({ groups: [] })),
}));

vi.mock('../../../hooks', () => ({
  usePublishedLessonOptions: vi.fn(() => ({ lessonsByCourse: {} })),
}));

const getDocMock = vi.mocked(getDoc);

/** getDoc-стаб: участники с uid, начинающимся на "bad", падают. */
function installGetDoc() {
  getDocMock.mockImplementation((async (ref: { path: string }) => {
    const [, uid] = ref.path.split('/');
    if (uid.startsWith('bad')) {
      throw new Error('permission denied');
    }
    if (ref.path.includes('courseProgress')) {
      return {
        exists: () => true,
        data: () => ({ watchedLessonIds: ['lesson-1'] }),
      };
    }
    return {
      exists: () => true,
      data: () => ({ displayName: `Имя ${uid}` }),
    };
  }) as unknown as typeof getDoc);
}

describe('loadGroupProgress — мягкая деградация', () => {
  beforeEach(() => {
    getDocMock.mockReset();
    installGetDoc();
  });

  it('отказ одного участника не обнуляет остальных', async () => {
    const { members, failedCount } = await loadGroupProgress(['good-1', 'bad-1'], 'course-1');

    expect(members).toHaveLength(2);
    expect(failedCount).toBe(1);

    const ok = members.find((member) => member.uid === 'good-1');
    expect(ok?.name).toBe('Имя good-1');
    expect(ok?.watchedLessonIds.has('lesson-1')).toBe(true);

    const failed = members.find((member) => member.uid === 'bad-1');
    expect(failed?.name).toContain('bad-1');
    expect(failed?.watchedLessonIds.size).toBe(0);
  });

  it('когда упали все участники — failedCount равен размеру группы', async () => {
    const { members, failedCount } = await loadGroupProgress(['bad-1', 'bad-2'], 'course-1');

    expect(members).toHaveLength(2);
    expect(failedCount).toBe(2);
  });
});
