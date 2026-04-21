import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { BookingLayout } from './BookingLayout';
import type { BookingStep } from './types';

export interface BookingSectionOutletContext {
  setBookingStep: (step: BookingStep | null) => void;
}

export function BookingSectionLayout() {
  const [bookingStep, setBookingStep] = useState<BookingStep | null>(null);

  return (
    <BookingLayout bookingStep={bookingStep ?? undefined}>
      <Outlet context={{ setBookingStep }} />
    </BookingLayout>
  );
}
