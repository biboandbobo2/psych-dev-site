import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminPanel } from '../Profile';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, collectionName) => ({ collectionName })),
  getDocs: vi.fn(),
  query: vi.fn((...args) => ({ args })),
  where: vi.fn((...args) => ({ args })),
  getCountFromServer: vi.fn(),
  getFirestore: vi.fn(() => ({})),
}));

const mockPeriods = [
  { data: () => ({ published: true }) },
  { data: () => ({ published: false }) },
  { data: () => ({ published: false }) },
];

describe('AdminPanel statistics', () => {
  let firestore: Awaited<typeof import('firebase/firestore')>;

  beforeEach(async () => {
    firestore = await vi.importMock<typeof import('firebase/firestore')>('firebase/firestore');
    firestore.collection.mockClear();
    firestore.query.mockClear();
    firestore.where.mockClear();
    firestore.getDocs.mockClear();
    firestore.getCountFromServer.mockClear();

    firestore.getDocs.mockResolvedValue({
      size: mockPeriods.length,
      docs: mockPeriods,
    });

    firestore.getCountFromServer.mockResolvedValue({
      data: () => ({ count: 5 }),
    });
  });

  it('отображает правильные данные по периодам и администраторам', async () => {
    render(
      <MemoryRouter>
        <AdminPanel isSuperAdmin={false} />
      </MemoryRouter>
    );

    await waitFor(() => expect(firestore.getDocs).toHaveBeenCalled());
    await waitFor(() => expect(firestore.getCountFromServer).toHaveBeenCalled());

    const totalCard = screen.getByText('Всего периодов').parentElement;
    const publishedCard = screen.getByText('Опубликовано').parentElement;
    const adminsCard = screen.getByText('Администраторов').parentElement;

    expect(within(totalCard!).getByText('3')).toBeInTheDocument();
    expect(within(publishedCard!).getByText('1')).toBeInTheDocument();
    expect(within(adminsCard!).getByText('5')).toBeInTheDocument();

    expect(firestore.collection).toHaveBeenCalledWith(expect.anything(), 'periods');
    expect(firestore.collection).toHaveBeenCalledWith(expect.anything(), 'users');
    expect(firestore.where).toHaveBeenCalledWith('role', 'in', ['admin', 'super-admin']);
  });
});
