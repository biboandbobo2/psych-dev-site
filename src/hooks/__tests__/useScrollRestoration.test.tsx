import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

import { useScrollRestoration } from '../useScrollRestoration';

function ScrollRestorationHarness() {
  useScrollRestoration();
  const navigate = useNavigate();

  return (
    <>
      <Link to="/second">Next</Link>
      <button onClick={() => navigate(-1)}>Back</button>
      <Routes>
        <Route path="/" element={<div>First</div>} />
        <Route path="/second" element={<div>Second</div>} />
      </Routes>
    </>
  );
}

describe('useScrollRestoration', () => {
  let scrollYValue = 0;

  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => scrollYValue,
    });
    Object.defineProperty(window.history, 'scrollRestoration', {
      configurable: true,
      writable: true,
      value: 'auto',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forces manual browser scroll restoration while mounted', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollRestorationHarness />
      </MemoryRouter>
    );

    expect(window.history.scrollRestoration).toBe('manual');

    unmount();

    expect(window.history.scrollRestoration).toBe('auto');
  });

  it('resets scroll on PUSH and restores saved position on POP', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollRestorationHarness />
      </MemoryRouter>
    );

    const scrollToMock = vi.mocked(window.scrollTo);
    scrollToMock.mockClear();

    scrollYValue = 240;
    fireEvent.click(screen.getByText('Next'));

    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 0, behavior: 'auto' });

    scrollYValue = 800;
    fireEvent.click(screen.getByText('Back'));

    expect(scrollToMock).toHaveBeenLastCalledWith(0, 240);
  });
});
