import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssignmentForm } from '../AssignmentForm';

describe('AssignmentForm', () => {
  it('предзаполняет text, dueDate и longText', () => {
    render(
      <AssignmentForm
        initialValue={{
          text: 'Тест',
          dueDate: '2026-05-15',
          longText: 'Полный текст',
        }}
        saving={false}
        errorMessage={null}
        submitLabel="OK"
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('2026-05-15')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Тест')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Полный текст')).toBeInTheDocument();
  });

  it('submit передаёт обрезанные значения', () => {
    const onSubmit = vi.fn();
    render(
      <AssignmentForm
        initialValue={{
          text: '  Зачёт  ',
          dueDate: '2026-06-01',
          longText: '  длинный  ',
        }}
        saving={false}
        errorMessage={null}
        submitLabel="OK"
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onSubmit).toHaveBeenCalledWith({
      text: 'Зачёт',
      dueDate: '2026-06-01',
      longText: 'длинный',
    });
  });

  it('блокирует submit без dueDate', () => {
    render(
      <AssignmentForm
        initialValue={{ text: 'Тест', dueDate: '', longText: '' }}
        saving={false}
        errorMessage={null}
        submitLabel="OK"
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'OK' })).toBeDisabled();
  });

  it('блокирует submit при text < 3 символов', () => {
    render(
      <AssignmentForm
        initialValue={{ text: 'A', dueDate: '2026-05-15', longText: '' }}
        saving={false}
        errorMessage={null}
        submitLabel="OK"
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'OK' })).toBeDisabled();
  });
});
