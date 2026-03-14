import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BiographyImportModal } from '../BiographyImportModal';

describe('BiographyImportModal', () => {
  it('показывает progress bar и первый шаг во время загрузки', () => {
    render(
      <BiographyImportModal
        isOpen={true}
        loading={true}
        error={null}
        meta={null}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Построение таймлайна...')).toBeInTheDocument();
    expect(screen.getAllByText('Загрузка статьи из Wikipedia')).toHaveLength(2);
    expect(screen.getByText(/Это может занять до минуты/i)).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('показывает ошибку импорта', () => {
    render(
      <BiographyImportModal
        isOpen={true}
        loading={false}
        error="Не удалось построить таймлайн"
        meta={null}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Ошибка импорта')).toBeInTheDocument();
    expect(screen.getByText('Не удалось построить таймлайн')).toBeInTheDocument();
    expect(screen.getByText('ОК')).toBeInTheDocument();
  });

  it('показывает метаданные успешного импорта', () => {
    render(
      <BiographyImportModal
        isOpen={true}
        loading={false}
        error={null}
        meta={{
          source: 'merged-with-heuristics',
          factsModel: 'gemini-2.5-flash',
          model: 'gemini-2.5-flash -> gemini-2.5-flash',
          reviewApplied: true,
          nodes: 14,
          edges: 3,
        }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Таймлайн построен')).toBeInTheDocument();
    expect(screen.getByText('Таймлайн успешно построен')).toBeInTheDocument();
    expect(screen.getByText(/merged-with-heuristics/)).toBeInTheDocument();
    expect(screen.getByText(/Модель фактов:/)).toBeInTheDocument();
    expect(screen.getByText(/Модель плана:/)).toBeInTheDocument();
    expect(screen.getByText(/14 узлов, 3 веток/)).toBeInTheDocument();
  });
});
