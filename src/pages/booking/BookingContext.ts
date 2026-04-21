import { createContext, useContext } from 'react';
import type { BookingStep } from './types';

interface BookingContextValue {
  userPhone: string | null;
  userPhoneLoading: boolean;
  bookingStep: BookingStep | null;
}

export const BookingContext = createContext<BookingContextValue>({
  userPhone: null,
  userPhoneLoading: false,
  bookingStep: null,
});

export function useBookingContext() {
  return useContext(BookingContext);
}
