import { useEffect, type ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookingSectionLayout } from './BookingSectionLayout';

const mountSpy = vi.fn();
const unmountSpy = vi.fn();

vi.mock('./BookingLayout', () => ({
  BookingLayout: ({ children }: { children: ReactNode }) => {
    useEffect(() => {
      mountSpy();
      return () => {
        unmountSpy();
      };
    }, []);

    return <div data-testid="booking-layout">{children}</div>;
  },
}));

describe('BookingSectionLayout', () => {
  beforeEach(() => {
    mountSpy.mockReset();
    unmountSpy.mockReset();
  });

  it('keeps the shared booking layout mounted across booking subroutes', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/booking',
          element: <BookingSectionLayout />,
          children: [
            { index: true, element: <div>Start page</div> },
            { path: 'photos', element: <div>Photos page</div> },
          ],
        },
      ],
      {
        initialEntries: ['/booking'],
      }
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId('booking-layout')).toBeInTheDocument();
    expect(screen.getByText('Start page')).toBeInTheDocument();
    expect(mountSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      await router.navigate('/booking/photos');
    });

    await waitFor(() => {
      expect(screen.getByText('Photos page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('booking-layout')).toBeInTheDocument();
    expect(mountSpy).toHaveBeenCalledTimes(1);
    expect(unmountSpy).not.toHaveBeenCalled();
  });
});
