import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BiographyImportModal } from '../BiographyImportModal';

describe('BiographyImportModal', () => {
  it('показывает progress bar и текущий шаг во время загрузки', () => {
    render(
      <BiographyImportModal
        isOpen={true}
        loading={true}
        error={null}
        errorDetail={null}
        meta={null}
        progress={{ step: 1, total: 3, label: 'Извлечение фактов из Wikipedia' }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Построение таймлайна...')).toBeInTheDocument();
    expect(screen.getAllByText('Извлечение фактов из Wikipedia').length).toBeGreaterThanOrEqual(1);
  });

  it('показывает ошибку импорта с подробностями', () => {
    render(
      <BiographyImportModal
        isOpen={true}
        loading={false}
        error="Не удалось построить таймлайн"
        errorDetail="two-pass-flash-failed: all slices returned 0 facts"
        meta={null}
        progress={{ step: 1, total: 3, label: 'Извлечение фактов из Wikipedia' }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Ошибка импорта')).toBeInTheDocument();
    expect(screen.getByText('Не удалось построить таймлайн')).toBeInTheDocument();
    expect(screen.getByText('Подробности ошибки')).toBeInTheDocument();
    expect(screen.getByText('ОК')).toBeInTheDocument();
  });

  it('показывает метаданные успешного импорта', () => {
    render(
      <BiographyImportModal
        isOpen={true}
        loading={false}
        error={null}
        errorDetail={null}
        meta={{
          model: 'gemini-2.5-flash -> annotation -> redaktura -> composition -> render',
          nodes: 14,
          edges: 3,
        }}
        progress={null}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Таймлайн построен')).toBeInTheDocument();
    expect(screen.getByText('Таймлайн успешно построен')).toBeInTheDocument();
    expect(screen.getByText(/14 узлов, 3 веток/)).toBeInTheDocument();
  });
});
