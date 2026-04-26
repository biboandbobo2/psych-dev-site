import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { DayCell } from '../DayCell';
import type { GroupEvent } from '../../../../../types/groupFeed';
import type { CalendarMonthDay } from '../../../../../lib/calendarGrid';

vi.mock('firebase/firestore', () => ({
  Timestamp: {
    fromMillis: (ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms) }),
  },
}));

const day: CalendarMonthDay = {
  isoDate: '2026-05-15',
  date: new Date(2026, 4, 15),
  dayOfMonth: 15,
  monthOfYear: 4,
  isCurrentMonth: true,
  isToday: false,
  dayOfWeek: 5,
};

const sampleEvent = (overrides: Partial<GroupEvent> = {}): GroupEvent => ({
  id: 'e1',
  groupId: 'g1',
  kind: 'event',
  text: 'Семинар',
  dateLabel: '15.05',
  dueDate: null,
  startAt: Timestamp.fromMillis(Date.UTC(2026, 4, 15, 9, 0)),
  endAt: Timestamp.fromMillis(Date.UTC(2026, 4, 15, 10, 0)),
  isAllDay: false,
  createdAt: null,
  createdBy: 'u1',
  ...overrides,
});

describe('DayCell', () => {
  it('рендерит номер дня', () => {
    render(
      <DayCell
        day={day}
        events={[]}
        onCreateClick={vi.fn()}
        onItemClick={vi.fn()}
      />
    );
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('пустая клетка → клик вызывает onCreateClick(date)', () => {
    const onCreate = vi.fn();
    render(
      <DayCell
        day={day}
        events={[]}
        onCreateClick={onCreate}
        onItemClick={vi.fn()}
      />
    );
    const overlay = screen.getByRole('button', { name: /Создать на 2026-05-15/ });
    fireEvent.click(overlay);
    expect(onCreate).toHaveBeenCalledWith(day.date);
  });

  it('клик по плашке события → onItemClick(item)', () => {
    const onItem = vi.fn();
    const ev = sampleEvent();
    render(
      <DayCell
        day={day}
        events={[ev]}
        onCreateClick={vi.fn()}
        onItemClick={onItem}
      />
    );
    fireEvent.click(screen.getByTitle('Семинар'));
    expect(onItem).toHaveBeenCalledWith(ev);
  });

  it('показывает "+ N ещё" если событий больше 4', () => {
    const events = [1, 2, 3, 4, 5, 6].map((n) =>
      sampleEvent({ id: `e${n}`, text: `Событие ${n}` })
    );
    render(
      <DayCell
        day={day}
        events={events}
        onCreateClick={vi.fn()}
        onItemClick={vi.fn()}
      />
    );
    expect(screen.getByText(/2 ещё/)).toBeInTheDocument();
  });

  it('подсвечивает today', () => {
    const todayDay = { ...day, isToday: true };
    const { container } = render(
      <DayCell
        day={todayDay}
        events={[]}
        onCreateClick={vi.fn()}
        onItemClick={vi.fn()}
      />
    );
    expect(container.firstChild).toHaveClass('border-indigo-500');
  });
});
