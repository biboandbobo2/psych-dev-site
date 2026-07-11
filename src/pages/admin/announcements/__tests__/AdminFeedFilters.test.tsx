import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminFeedFilters } from '../AdminFeedFilters';

describe('AdminFeedFilters', () => {
  const renderFilters = (props: Partial<React.ComponentProps<typeof AdminFeedFilters>> = {}) =>
    render(
      <AdminFeedFilters
        kind="all"
        onKindChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        totalCount={0}
        {...props}
      />
    );

  it('рендерит 3 фильтра (без «Событий» — они в календаре), поиск и счётчик', () => {
    renderFilters({ totalCount: 12 });
    expect(screen.getByRole('button', { name: 'Все' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📢 Объявления' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📋 Задания' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '📅 События' })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('🔎 Поиск по тексту')).toBeInTheDocument();
    expect(screen.getByText('12 записей')).toBeInTheDocument();
  });

  it('клик по «Объявления» вызывает onKindChange("announcement")', () => {
    const onChange = vi.fn();
    renderFilters({ onKindChange: onChange });
    fireEvent.click(screen.getByRole('button', { name: '📢 Объявления' }));
    expect(onChange).toHaveBeenCalledWith('announcement');
  });

  it('текущий фильтр имеет визуальное отличие (white фон)', () => {
    renderFilters({ kind: 'announcement' });
    const activeBtn = screen.getByRole('button', { name: '📢 Объявления' });
    expect(activeBtn.className).toMatch(/bg-white/);
  });

  it('ввод в поиск вызывает onSearchChange', () => {
    const onSearch = vi.fn();
    renderFilters({ onSearchChange: onSearch });
    fireEvent.change(screen.getByPlaceholderText('🔎 Поиск по тексту'), {
      target: { value: 'эссе' },
    });
    expect(onSearch).toHaveBeenCalledWith('эссе');
  });
});
