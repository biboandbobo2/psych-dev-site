import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TranscriptSelectionMenu } from './TranscriptSelectionMenu';
import type { TextSelectionSnapshot } from '../hooks/useTextSelection';

const makeSelection = (text: string): TextSelectionSnapshot => ({
  text,
  rect: { top: 200, left: 300, width: 120, height: 20 },
});

describe('TranscriptSelectionMenu', () => {
  it('короткое выделение: поиск по тексту как есть + «Объяснить»', () => {
    const onSearch = vi.fn();
    render(
      <TranscriptSelectionMenu
        selection={makeSelection('сепарационная тревога')}
        concepts={[]}
        onSearch={onSearch}
        onExplain={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Статьи/ }));
    expect(onSearch).toHaveBeenCalledWith('сепарационная тревога');
    expect(screen.getByRole('button', { name: /Объяснить/ })).toBeInTheDocument();
  });

  it('длинное выделение: чипы из понятий урока', () => {
    const onSearch = vi.fn();
    render(
      <TranscriptSelectionMenu
        selection={makeSelection(
          'и вот когда у ребёнка формируется надёжная привязанность, он спокойнее переносит разлуку'
        )}
        concepts={['Привязанность — эмоциональная связь', 'Госпитализм']}
        onSearch={onSearch}
        onExplain={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Привязанность/ }));
    expect(onSearch).toHaveBeenCalledWith('Привязанность');
  });

  it('длинное выделение без совпадений: обрезанный запрос', () => {
    const onSearch = vi.fn();
    render(
      <TranscriptSelectionMenu
        selection={makeSelection(
          'один два три четыре пять шесть семь восемь девять десять одиннадцать'
        )}
        concepts={['Привязанность']}
        onSearch={onSearch}
        onExplain={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Статьи/ }));
    expect(onSearch).toHaveBeenCalledWith('один два три четыре пять шесть семь восемь');
  });

  it('без onExplain кнопка «Объяснить» скрыта, mousedown снаружи закрывает меню', () => {
    const onDismiss = vi.fn();
    render(
      <TranscriptSelectionMenu
        selection={makeSelection('термин')}
        concepts={[]}
        onSearch={vi.fn()}
        onDismiss={onDismiss}
      />
    );

    expect(screen.queryByRole('button', { name: /Объяснить/ })).not.toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(onDismiss).toHaveBeenCalled();
  });
});
