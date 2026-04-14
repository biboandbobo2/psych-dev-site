import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WeekSchedule } from './WeekSchedule';

vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: null }) => unknown) => selector({ user: null }),
}));

const weekDates = [
  '2026-04-13',
  '2026-04-14',
  '2026-04-15',
  '2026-04-16',
  '2026-04-17',
  '2026-04-18',
  '2026-04-19',
];

describe('WeekSchedule', () => {
  it('allows navigating forward up to offset 8 and disables the next-week button there', () => {
    const onWeekChange = vi.fn();
    const onSlotClick = vi.fn();

    const { rerender } = render(
      <WeekSchedule
        rooms={[]}
        weekDates={weekDates}
        busy={new Map()}
        loading={false}
        weekOffset={7}
        onWeekChange={onWeekChange}
        onSlotClick={onSlotClick}
      />
    );

    const nextWeekButton = screen.getByLabelText('Следующая неделя');
    expect(nextWeekButton).not.toBeDisabled();

    fireEvent.click(nextWeekButton);
    expect(onWeekChange).toHaveBeenCalledWith(8);

    rerender(
      <WeekSchedule
        rooms={[]}
        weekDates={weekDates}
        busy={new Map()}
        loading={false}
        weekOffset={8}
        onWeekChange={onWeekChange}
        onSlotClick={onSlotClick}
      />
    );

    expect(screen.getByLabelText('Следующая неделя')).toBeDisabled();
  });
});
