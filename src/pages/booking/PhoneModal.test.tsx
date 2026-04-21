import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PhoneModal } from './PhoneModal';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('../../lib/firebase', () => ({
  db: {},
}));

describe('PhoneModal', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.style.overflow = '';
  });

  it('locks body scroll while mounted and restores it on unmount', () => {
    const { unmount } = render(<PhoneModal uid="user-1" onComplete={vi.fn()} />);

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('');
  });

  it('does not rely on native autofocus for the phone input', () => {
    render(<PhoneModal uid="user-1" onComplete={vi.fn()} />);

    const input = screen.getByPlaceholderText('+7 (999) 123-45-67');
    expect(input).not.toHaveAttribute('autofocus');
  });
});
