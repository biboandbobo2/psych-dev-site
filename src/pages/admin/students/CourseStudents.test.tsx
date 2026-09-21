import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CourseOption } from '../../../hooks/useCourses';
import type { CourseStudent, CourseStudentsResponse } from '../../../types/courseStudents';

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const coursesResult: { courses: CourseOption[]; loading: boolean } = {
  courses: [],
  loading: false,
};

vi.mock('../../../hooks/useEditableCourses', () => ({
  useEditableCourses: () => coursesResult,
}));

vi.mock('../../../hooks/useMyAnnouncementGroups', () => ({
  useMyAnnouncementGroups: () => ({ groups: [], loading: false }),
}));

const lessonsByCourse: Record<string, Array<{ periodId: string; periodKey: string }>> = {};

vi.mock('../../../hooks', () => ({
  usePublishedLessonOptions: () => ({ lessonsByCourse }),
}));

vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { isSuperAdmin: boolean }) => unknown) =>
    selector({ isSuperAdmin: false }),
}));

const getCourseStudents = vi.fn<[{ courseId: string }], Promise<CourseStudentsResponse>>();
const bulkEnrollStudents = vi.fn();

vi.mock('../../../lib/adminFunctions', () => ({
  getCourseStudents: (payload: { courseId: string }) => getCourseStudents(payload),
  bulkEnrollStudents: (payload: unknown) => bulkEnrollStudents(payload),
}));

const loadGroupProgress = vi.fn();

vi.mock('./courseProgress', async () => {
  const actual = await vi.importActual<typeof import('./courseProgress')>('./courseProgress');
  return {
    ...actual,
    loadGroupProgress: (members: Array<{ uid: string }>, courseId: string) =>
      loadGroupProgress(members, courseId),
  };
});

import CourseStudents from './CourseStudents';

const COURSE: CourseOption = {
  id: 'external-x',
  name: 'Внешний курс X',
  icon: '🧪',
  order: 10,
  published: true,
};

function student(overrides: Partial<CourseStudent> & { uid: string }): CourseStudent {
  return {
    displayName: null,
    email: null,
    photoURL: null,
    lastLoginAt: null,
    pendingRegistration: false,
    disabled: false,
    ...overrides,
  };
}

const RESPONSE: CourseStudentsResponse = {
  courseId: 'external-x',
  groups: [
    {
      id: 'stream-1',
      name: 'Поток 1',
      students: [
        student({ uid: 'u1', displayName: 'Мария Кузнецова', email: 'maria@example.com' }),
        student({ uid: 'u2', displayName: 'Дмитрий Орлов', email: 'orlov@example.com' }),
      ],
    },
  ],
  individual: [
    student({
      uid: 'u3',
      displayName: 'Галина Белова',
      email: 'galina@example.com',
      pendingRegistration: true,
    }),
  ],
};

const renderPage = (path = '/admin/students?course=external-x') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CourseStudents />
    </MemoryRouter>
  );

describe('CourseStudents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    coursesResult.courses = [COURSE];
    coursesResult.loading = false;
    lessonsByCourse['external-x'] = [
      { periodId: 'l1', periodKey: 'external-x:l1' },
      { periodId: 'l2', periodKey: 'external-x:l2' },
    ];
    getCourseStudents.mockResolvedValue(RESPONSE);
    loadGroupProgress.mockResolvedValue({
      members: [
        { uid: 'u1', name: 'u1', watchedLessonIds: new Set(['l1', 'l2']) },
        { uid: 'u2', name: 'u2', watchedLessonIds: new Set(['l1']) },
        { uid: 'u3', name: 'u3', watchedLessonIds: new Set<string>() },
      ],
      failedCount: 0,
    });
  });

  it('показывает поток, индивидуальных студентов и их прогресс', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Поток 1' })).toBeInTheDocument();
    expect(getCourseStudents).toHaveBeenCalledWith({ courseId: 'external-x' });

    expect(
      screen.getByText('3 студента · 2 через потоки · 1 лично · 2 занятия опубликовано')
    ).toBeInTheDocument();
    expect(screen.getByText('2 студента · в среднем 2 из 2 занятий')).toBeInTheDocument();
    expect(
      screen.getByText('1 студент · доступ выдан лично, вне потоков')
    ).toBeInTheDocument();

    expect(screen.getByText('maria@example.com')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Ожидает регистрации')).toBeInTheDocument();
    expect(screen.getAllByText('никогда')).toHaveLength(3);
  });

  it('поиск оставляет только совпавших студентов', async () => {
    renderPage();
    await screen.findByText('Мария Кузнецова');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Поиск студента' }), {
      target: { value: 'орлов' },
    });

    await waitFor(() => expect(screen.queryByText('Мария Кузнецова')).not.toBeInTheDocument());
    expect(screen.getByText('Дмитрий Орлов')).toBeInTheDocument();
    expect(screen.getByText('Никто из них не подходит под поиск.')).toBeInTheDocument();
  });

  it('сортировка по имени меняет порядок строк', async () => {
    renderPage();
    await screen.findByText('Мария Кузнецова');

    const stream = screen
      .getByRole('heading', { name: 'Поток 1' })
      .closest('section') as HTMLElement;
    expect(within(stream).getAllByRole('listitem')[0]).toHaveTextContent('Мария Кузнецова');

    fireEvent.change(screen.getByRole('combobox', { name: 'Сортировка' }), {
      target: { value: 'name' },
    });

    await waitFor(() =>
      expect(within(stream).getAllByRole('listitem')[0]).toHaveTextContent('Дмитрий Орлов')
    );
  });

  it('чужой курс в ?course= показывает заглушку и не зовёт callable', async () => {
    renderPage('/admin/students?course=development');

    expect(await screen.findByText('У вас нет прав на этот курс.')).toBeInTheDocument();
    expect(getCourseStudents).not.toHaveBeenCalled();
  });

  it('курс без студентов даёт пустое состояние', async () => {
    getCourseStudents.mockResolvedValue({ courseId: 'external-x', groups: [], individual: [] });
    renderPage();

    expect(await screen.findByText(/У курса пока нет студентов/)).toBeInTheDocument();
  });

  it('кнопка «Пригласить на курс» открывает модалку и зовёт bulkEnrollStudents', async () => {
    bulkEnrollStudents.mockResolvedValue({
      success: true,
      updatedExisting: 1,
      createdPending: 1,
      totalProcessed: 2,
      savedListId: null,
    });
    renderPage();
    await screen.findByText('Мария Кузнецова');

    fireEvent.click(screen.getByRole('button', { name: /Пригласить на курс/ }));
    const textbox = await screen.findByRole('textbox');
    fireEvent.change(textbox, { target: { value: 'new1@example.com, new2@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: 'Пригласить · 2' }));

    await waitFor(() =>
      expect(bulkEnrollStudents).toHaveBeenCalledWith({
        emails: ['new1@example.com', 'new2@example.com'],
        courseIds: ['external-x'],
      })
    );
    expect(await screen.findByText(/Доступ открыт: 1/)).toBeInTheDocument();
    // Список перечитывается после приглашения.
    await waitFor(() => expect(getCourseStudents).toHaveBeenCalledTimes(2));
  });
});
