import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ContentActionsBar } from './ContentActionsBar';

describe('ContentActionsBar', () => {
  it('shows delete button for intro lesson', () => {
    render(
      <MemoryRouter>
        <ContentActionsBar
          periodId="intro"
          saving={false}
          title="Вводное занятие"
          onSave={vi.fn()}
          onDelete={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: '🗑️ Удалить период' })).toBeInTheDocument();
    expect(screen.queryByText(/нельзя удалить/i)).not.toBeInTheDocument();
  });
});
