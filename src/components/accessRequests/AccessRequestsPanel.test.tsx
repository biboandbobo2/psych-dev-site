import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CourseOption } from '../../hooks/useCourses';
import type { AccessRequest } from '../../types/accessRequests';

const requests: AccessRequest[] = [];
const useAccessRequests = vi.fn(() => ({ requests, loading: false }));

vi.mock('../../hooks/useAccessRequests', () => ({
  ACCESS_REQUESTS_COLLECTION: 'accessRequests',
  useAccessRequests: (options?: { courseId?: string }) => useAccessRequests(options),
}));

const COURSES: CourseOption[] = [
  { id: 'external-x', name: 'Внешний курс X', icon: '🧪', order: 10, published: true },
];

vi.mock('../../hooks/useCourses', () => ({
  useCourses: () => ({
    courses: COURSES,
    courseMap: new Map(COURSES.map((course) => [course.id, course])),
    loading: false,
  }),
}));

vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: { uid: string } }) => unknown) =>
    selector({ user: { uid: 'admin-uid' } }),
}));

const bulkEnrollStudents = vi.fn();
vi.mock('../../lib/adminFunctions', () => ({
  bulkEnrollStudents: (params: unknown) => bulkEnrollStudents(params),
}));

const reportAppError = vi.fn();
vi.mock('../../lib/errorHandler', () => ({
  reportAppError: (payload: unknown) => reportAppError(payload),
}));

vi.mock('../../lib/firebase', () => ({ db: {} }));

const updateDoc = vi.fn();
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    doc: (_db: unknown, path: string, id: string) => ({ path: `${path}/${id}` }),
    updateDoc: (ref: unknown, data: unknown) => updateDoc(ref, data),
    serverTimestamp: () => 'server-timestamp',
  };
});

import { AccessRequestsPanel } from './AccessRequestsPanel';

const stamp = (iso: string) =>
  ({ toDate: () => new Date(iso) }) as unknown as AccessRequest['createdAt'];

const WITH_COURSE: AccessRequest = {
  id: 'req-1',
  uid: 'student-uid',
  email: 'student@example.com',
  displayName: 'Иван Петров',
  courseId: 'external-x',
  message: 'Хочу пройти курс целиком, работаю с подростками',
  status: 'new',
  createdAt: stamp('2026-09-21T10:00:00Z'),
};

const WITHOUT_COURSE: AccessRequest = {
  ...WITH_COURSE,
  id: 'req-2',
  uid: 'guest-uid',
  email: 'guest@example.com',
  displayName: null,
  courseId: null,
  message: '',
};

const renderPanel = (props: { courseId?: string; onResolved?: () => void } = {}) =>
  render(
    <MemoryRouter>
      <AccessRequestsPanel {...props} />
    </MemoryRouter>
  );

beforeEach(() => {
  requests.length = 0;
  vi.clearAllMocks();
});

describe('AccessRequestsPanel', () => {
  it('без заявок не рендерит ничего', () => {
    const { container } = renderPanel();
    expect(container).toBeEmptyDOMElement();
  });

  it('показывает заявителя, курс, дату и текст заявки', () => {
    requests.push(WITH_COURSE);
    renderPanel();

    expect(screen.getByRole('heading', { name: 'Заявки на доступ · 1' })).toBeInTheDocument();
    expect(screen.getByText('Иван Петров')).toBeInTheDocument();
    expect(screen.getByText('student@example.com')).toBeInTheDocument();
    expect(screen.getByText('Внешний курс X · 21.09.2026')).toBeInTheDocument();
    expect(screen.getByText(WITH_COURSE.message)).toBeInTheDocument();
  });

  it('курс страницы прокидывается в запрос заявок', () => {
    requests.push(WITH_COURSE);
    renderPanel({ courseId: 'external-x' });

    expect(useAccessRequests).toHaveBeenCalledWith({ courseId: 'external-x' });
  });

  it('заявка без курса ведёт в карточку пользователя, а не открывает курс', () => {
    requests.push(WITHOUT_COURSE);
    renderPanel();

    expect(screen.getByText('курс не указан · 21.09.2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Открыть курс' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Открыть карточку' })).toHaveAttribute(
      'href',
      '/admin/users?user=guest-uid'
    );
  });

  it('«Открыть курс» записывает студента и закрывает заявку', async () => {
    requests.push(WITH_COURSE);
    const onResolved = vi.fn();
    renderPanel({ courseId: 'external-x', onResolved });

    fireEvent.click(screen.getByRole('button', { name: 'Открыть курс' }));

    await waitFor(() => expect(bulkEnrollStudents).toHaveBeenCalledTimes(1));
    expect(bulkEnrollStudents).toHaveBeenCalledWith({
      emails: ['student@example.com'],
      courseIds: ['external-x'],
    });
    expect(updateDoc).toHaveBeenCalledWith(
      { path: 'accessRequests/req-1' },
      { status: 'approved', resolvedAt: 'server-timestamp', resolvedBy: 'admin-uid' }
    );
    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1));
  });

  it('«Отклонить» спрашивает подтверждение и только потом пишет статус', async () => {
    requests.push(WITH_COURSE);
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Отклонить' }));
    expect(updateDoc).not.toHaveBeenCalled();

    expect(screen.getByText('Отклонить заявку?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Да' }));

    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
    expect(updateDoc).toHaveBeenCalledWith(
      { path: 'accessRequests/req-1' },
      { status: 'declined', resolvedAt: 'server-timestamp', resolvedBy: 'admin-uid' }
    );
    expect(bulkEnrollStudents).not.toHaveBeenCalled();
  });

  it('ошибка выдачи доступа показывается в панели, заявка не закрывается', async () => {
    requests.push(WITH_COURSE);
    bulkEnrollStudents.mockRejectedValueOnce(new Error('Нет прав на курс'));
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Открыть курс' }));

    await waitFor(() => expect(screen.getByText('Нет прав на курс')).toBeInTheDocument());
    expect(updateDoc).not.toHaveBeenCalled();
    expect(reportAppError).toHaveBeenCalledTimes(1);
  });

  it('длинный текст заявки разворачивается по клику', () => {
    requests.push(WITH_COURSE);
    renderPanel();

    const text = screen.getByRole('button', { name: WITH_COURSE.message });
    expect(text).toHaveAttribute('aria-expanded', 'false');
    expect(text.className).toContain('line-clamp-3');

    fireEvent.click(text);

    expect(text).toHaveAttribute('aria-expanded', 'true');
    expect(text.className).not.toContain('line-clamp-3');
  });

  it('счётчик в шапке считает все заявки списка', () => {
    requests.push(WITH_COURSE, WITHOUT_COURSE);
    renderPanel();

    const panel = screen.getByRole('heading', { name: 'Заявки на доступ · 2' }).parentElement;
    expect(within(panel as HTMLElement).getAllByRole('listitem')).toHaveLength(2);
  });
});
