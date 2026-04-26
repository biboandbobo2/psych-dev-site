import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { MonthGrid } from '../MonthGrid';
import type { GroupEvent } from '../../../../../types/groupFeed';

vi.mock('firebase/firestore', () => ({
  Timestamp: {
    fromMillis: (ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms) }),
  },
}));

describe('MonthGrid', () => {
  it('рендерит 7 заголовков дней недели + 42 ячейки', () => {
    const { container } = render(
      <MonthGrid
        monthDate={new Date(2026, 4, 1)}
        events={[]}
        onCreateClick={vi.fn()}
        onItemClick={vi.fn()}
      />
    );
    expect(screen.getByText('Пн')).toBeInTheDocument();
    expect(screen.getByText('Вс')).toBeInTheDocument();
    // Ячейки имеют group/cell wrapper.
    const cells = container.querySelectorAll('.group\\/cell');
    expect(cells).toHaveLength(42);
  });

  it('распределяет event по дате startAt', () => {
    const onItem = vi.fn();
    const ev: GroupEvent = {
      id: 'e1',
      groupId: 'g1',
      kind: 'event',
      text: 'Лекция Выготского',
      dateLabel: '15.05',
      dueDate: null,
      startAt: Timestamp.fromMillis(new Date(2026, 4, 15, 9, 0).getTime()),
      endAt: Timestamp.fromMillis(new Date(2026, 4, 15, 10, 0).getTime()),
      isAllDay: false,
      createdAt: null,
      createdBy: 'u1',
    };

    render(
      <MonthGrid
        monthDate={new Date(2026, 4, 1)}
        events={[ev]}
        onCreateClick={vi.fn()}
        onItemClick={onItem}
      />
    );
    fireEvent.click(screen.getByTitle('Лекция Выготского'));
    expect(onItem).toHaveBeenCalledWith(ev);
  });

  it('распределяет assignment по dueDate', () => {
    const onItem = vi.fn();
    const assignment: GroupEvent = {
      id: 'a1',
      groupId: 'g1',
      kind: 'assignment',
      text: 'Сдать эссе',
      dateLabel: '',
      dueDate: '2026-05-20',
      createdAt: null,
      createdBy: 'u1',
    };
    render(
      <MonthGrid
        monthDate={new Date(2026, 4, 1)}
        events={[assignment]}
        onCreateClick={vi.fn()}
        onItemClick={onItem}
      />
    );
    fireEvent.click(screen.getByTitle('Сдать эссе'));
    expect(onItem).toHaveBeenCalledWith(assignment);
  });
});
