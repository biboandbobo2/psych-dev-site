import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BaseModal, ModalCancelButton, ModalSaveButton } from '../BaseModal';

describe('BaseModal', () => {
  it('не рендерится когда isOpen=false', () => {
    render(
      <BaseModal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <div>Content</div>
      </BaseModal>
    );

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('рендерится когда isOpen=true', () => {
    render(
      <BaseModal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <div>Content</div>
      </BaseModal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('вызывает onClose при клике на кнопку закрытия', () => {
    const onClose = vi.fn();
    render(
      <BaseModal isOpen={true} onClose={onClose} title="Test Modal">
        <div>Content</div>
      </BaseModal>
    );

    const closeButton = screen.getByLabelText('Закрыть');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('блокирует кнопку закрытия когда disabled=true', () => {
    const onClose = vi.fn();
    render(
      <BaseModal isOpen={true} onClose={onClose} title="Test Modal" disabled={true}>
        <div>Content</div>
      </BaseModal>
    );

    const closeButton = screen.getByLabelText('Закрыть');
    expect(closeButton).toBeDisabled();
  });

  it('рендерит footer когда передан', () => {
    render(
      <BaseModal
        isOpen={true}
        onClose={vi.fn()}
        title="Test Modal"
        footer={<button>Save</button>}
      >
        <div>Content</div>
      </BaseModal>
    );

    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('применяет правильный maxWidth класс', () => {
    const { container } = render(
      <BaseModal isOpen={true} onClose={vi.fn()} title="Test Modal" maxWidth="md">
        <div>Content</div>
      </BaseModal>
    );

    const modal = container.querySelector('.max-w-md');
    expect(modal).toBeInTheDocument();
  });
});

describe('ModalCancelButton', () => {
  it('рендерит текст по умолчанию', () => {
    render(<ModalCancelButton onClick={vi.fn()} />);
    expect(screen.getByText('Отмена')).toBeInTheDocument();
  });

  it('рендерит кастомный текст', () => {
    render(<ModalCancelButton onClick={vi.fn()}>Close</ModalCancelButton>);
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('вызывает onClick при клике', () => {
    const onClick = vi.fn();
    render(<ModalCancelButton onClick={onClick} />);

    fireEvent.click(screen.getByText('Отмена'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('блокируется когда disabled=true', () => {
    render(<ModalCancelButton onClick={vi.fn()} disabled={true} />);
    expect(screen.getByText('Отмена')).toBeDisabled();
  });
});

describe('ModalSaveButton', () => {
  it('рендерит текст по умолчанию', () => {
    render(<ModalSaveButton onClick={vi.fn()} />);
    expect(screen.getByText('Сохранить')).toBeInTheDocument();
  });

  it('показывает индикатор загрузки когда loading=true', () => {
    render(<ModalSaveButton onClick={vi.fn()} loading={true} />);
    expect(screen.getByText('Сохранение...')).toBeInTheDocument();
  });

  it('блокируется когда loading=true', () => {
    render(<ModalSaveButton onClick={vi.fn()} loading={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('вызывает onClick при клике', () => {
    const onClick = vi.fn();
    render(<ModalSaveButton onClick={onClick} />);

    fireEvent.click(screen.getByText('Сохранить'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
