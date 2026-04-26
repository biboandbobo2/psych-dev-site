import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnnouncementForm } from '../AnnouncementForm';

describe('AnnouncementForm', () => {
  it('предзаполняет text и newsType', () => {
    render(
      <AnnouncementForm
        initialValue={{ text: 'Привет', newsType: 'content' }}
        isEveryone={true}
        saving={false}
        errorMessage={null}
        submitLabel="OK"
        onSubmit={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(
      /Добавили книгу|пробный экзамен/
    );
    expect(textarea).toHaveValue('Привет');
    expect(screen.getByLabelText(/Контентная/)).toBeChecked();
    expect(screen.getByLabelText(/Техническая/)).not.toBeChecked();
  });

  it('не показывает выбор newsType, если isEveryone=false', () => {
    render(
      <AnnouncementForm
        initialValue={{ text: 'Привет', newsType: null }}
        isEveryone={false}
        saving={false}
        errorMessage={null}
        submitLabel="OK"
        onSubmit={vi.fn()}
      />
    );
    expect(screen.queryByLabelText(/Контентная/)).not.toBeInTheDocument();
  });

  it('submit передаёт payload с newsType=null если не everyone', () => {
    const onSubmit = vi.fn();
    render(
      <AnnouncementForm
        initialValue={{ text: 'Привет всем', newsType: null }}
        isEveryone={false}
        saving={false}
        errorMessage={null}
        submitLabel="OK"
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onSubmit).toHaveBeenCalledWith({
      text: 'Привет всем',
      newsType: null,
    });
  });

  it('блокирует submit при text < 3 символов', () => {
    render(
      <AnnouncementForm
        initialValue={{ text: 'A', newsType: null }}
        isEveryone={false}
        saving={false}
        errorMessage={null}
        submitLabel="OK"
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'OK' })).toBeDisabled();
  });
});
