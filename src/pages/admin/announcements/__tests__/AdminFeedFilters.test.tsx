import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminFeedFilters } from '../AdminFeedFilters';

describe('AdminFeedFilters', () => {
  it('рендерит 4 фильтра и счётчик', () => {
    render(
      <AdminFeedFilters
        kind="all"
        onKindChange={vi.fn()}
        totalCount={12}
      />
    );
    expect(screen.getByRole('button', { name: 'Все' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📅 События' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📢 Объявления' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📋 Задания' })).toBeInTheDocument();
    expect(screen.getByText('12 записей')).toBeInTheDocument();
  });

  it('клик по «События» вызывает onKindChange("event")', () => {
    const onChange = vi.fn();
    render(
      <AdminFeedFilters kind="all" onKindChange={onChange} totalCount={0} />
    );
    fireEvent.click(screen.getByRole('button', { name: '📅 События' }));
    expect(onChange).toHaveBeenCalledWith('event');
  });

  it('текущий фильтр имеет визуальное отличие (white фон)', () => {
    render(
      <AdminFeedFilters
        kind="event"
        onKindChange={vi.fn()}
        totalCount={3}
      />
    );
    const eventBtn = screen.getByRole('button', { name: '📅 События' });
    expect(eventBtn.className).toMatch(/bg-white/);
  });
});
