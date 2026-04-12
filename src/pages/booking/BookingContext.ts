import { createContext, useContext } from 'react';

interface BookingContextValue {
  userPhone: string | null;
  userPhoneLoading: boolean;
}

export const BookingContext = createContext<BookingContextValue>({
  userPhone: null,
  userPhoneLoading: false,
});

export function useBookingContext() {
  return useContext(BookingContext);
}
