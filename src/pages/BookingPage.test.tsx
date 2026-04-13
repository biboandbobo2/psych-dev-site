import type { ReactNode } from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookingPage } from './BookingPage';

const { bookMock } = vi.hoisted(() => ({
  bookMock: vi.fn(async () => [{ record_id: 123 }]),
}));

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}));

vi.mock('./booking/BookingLayout', () => ({
  BookingLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('./booking/StartStep', () => ({
  StartStep: ({ onSelect }: { onSelect: (flow: 'room-first' | 'date-first') => void }) => (
    <button onClick={() => onSelect('room-first')}>start-room</button>
  ),
}));

vi.mock('./booking/RoomSelector', () => ({
  RoomSelector: ({ onSelect }: { onSelect: (room: { id: string; name: string }) => void }) => (
    <button onClick={() => onSelect({ id: 'room-1', name: 'Room 1' })}>select-room</button>
  ),
}));

vi.mock('./booking/DatePicker', () => ({
  DatePicker: ({ onSelect }: { onSelect: (date: string) => void }) => (
    <button onClick={() => onSelect('2026-04-14')}>select-date</button>
  ),
}));

vi.mock('./booking/TimeSlotGrid', () => ({
  TimeSlotGrid: () => <div>time-grid</div>,
}));

vi.mock('./booking/AllRoomsGrid', () => ({
  AllRoomsGrid: () => <div>all-rooms</div>,
}));

vi.mock('./booking/BookingCart', () => ({
  BookingCart: ({ onConfirm }: { onConfirm: () => void }) => (
    <button onClick={onConfirm}>confirm-cart</button>
  ),
}));

vi.mock('./booking/BookingConfirmation', () => ({
  BookingConfirmation: ({ onSubmit }: { onSubmit: (data: { name: string }) => Promise<void> }) => (
    <button onClick={() => void onSubmit({ name: 'Test User' })}>submit-booking</button>
  ),
}));

vi.mock('./booking/EventsSection', () => ({
  EventsSection: () => <div>events</div>,
}));

vi.mock('./booking/WeekSchedule', () => ({
  WeekSchedule: () => <div>week-schedule</div>,
}));

vi.mock('./booking/useBookingApi', () => ({
  useRooms: () => ({ rooms: [{ id: 'room-1', name: 'Room 1' }] }),
  useTimeSlots: () => ({ slots: [], loading: false }),
  useAllRoomsSlots: () => ({ slotsByRoom: {}, loading: false }),
  useBooking: () => ({ book: bookMock, submitting: false }),
}));

vi.mock('./booking/useWeekSchedule', () => ({
  useWeekSchedule: () => ({ busy: [], loading: false, weekDates: [] }),
}));

describe('BookingPage', () => {
  beforeEach(() => {
    bookMock.mockClear();
    bookMock.mockResolvedValue([{ record_id: 123 }]);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  it('scrolls to top when the booking view changes, including success state', async () => {
    render(
      <MemoryRouter initialEntries={['/booking']}>
        <BookingPage />
      </MemoryRouter>
    );

    const scrollToMock = vi.mocked(window.scrollTo);
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });

    scrollToMock.mockClear();
    fireEvent.click(screen.getByText('start-room'));
    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 0, behavior: 'auto' });

    scrollToMock.mockClear();
    fireEvent.click(screen.getByText('select-room'));
    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 0, behavior: 'auto' });

    scrollToMock.mockClear();
    fireEvent.click(screen.getByText('select-date'));
    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 0, behavior: 'auto' });

    scrollToMock.mockClear();
    fireEvent.click(screen.getByText('confirm-cart'));
    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 0, behavior: 'auto' });

    scrollToMock.mockClear();
    fireEvent.click(screen.getByText('submit-booking'));

    await waitFor(() => {
      expect(screen.getByText('Бронирование подтверждено!')).toBeInTheDocument();
    });

    expect(bookMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 0, behavior: 'auto' });
  });
});
