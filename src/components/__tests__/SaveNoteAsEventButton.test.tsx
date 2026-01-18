import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest';
import { LINE_X_POSITION } from '../../pages/timeline/constants';
import { SaveNoteAsEventButton } from '../SaveNoteAsEventButton';

describe('SaveNoteAsEventButton', () => {
  const alertMock = vi.fn();

  beforeAll(() => {
    vi.stubGlobal('alert', alertMock);
  });

  beforeEach(() => {
    alertMock.mockReset();
  });

  it('opens the modal when the button is clicked', () => {
    render(
      <SaveNoteAsEventButton noteTitle="Sample" noteContent="" onEventCreate={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: /на таймлайн/i }));

    expect(screen.getByText('Добавить на таймлайн?')).toBeInTheDocument();
  });

  it('creates an event and calls onSuccess when the form is submitted', async () => {
    const onEventCreate = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    render(
      <SaveNoteAsEventButton
        noteTitle="Sample"
        noteContent="Important thoughts"
        onEventCreate={onEventCreate}
        onSuccess={onSuccess}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /на таймлайн/i }));

    fireEvent.change(screen.getByLabelText(/Возраст события/i), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText(/Название события/i), { target: { value: '  Чекпоинт  ' } });

    const saveButton = screen.getByText(/Создать событие/i);
    fireEvent.click(saveButton);

    await waitFor(() => expect(onEventCreate).toHaveBeenCalled());

    expect(onEventCreate).toHaveBeenCalledWith({
      age: 25,
      label: 'Чекпоинт',
      x: LINE_X_POSITION,
      notes: 'Important thoughts',
      isDecision: false,
    });
    expect(onSuccess).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByText('Добавить на таймлайн?')).not.toBeInTheDocument();
    });
  });
});
