import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VideoSection } from './VideoSection';

vi.mock('./VideoStudyNotesPanel', async () => {
  return {
    VideoStudyNotesPanel: ({
      draftContent,
      onDraftChange,
      videoTitle,
    }: {
      draftContent: string;
      onDraftChange: (value: string) => void;
      videoTitle: string;
    }) => {
      return (
        <div>
          <div>Study panel for {videoTitle}</div>
          <label>
            Draft
            <input value={draftContent} onChange={(event) => onDraftChange(event.target.value)} />
          </label>
        </div>
      );
    },
  };
});

describe('VideoSection', () => {
  it('сохраняет черновик при переключении между режимами видео', async () => {
    render(
      <VideoSection
        slug="video"
        title="Видео"
        content={[{ title: 'Лекция 1', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]}
        deckUrl=""
        defaultVideoTitle="Видео-лекция"
        periodId="preschool"
        periodTitle="Дошкольный возраст"
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Открыть конспект' }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Study panel for Лекция 1')).toBeVisible();
    });
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.change(screen.getByLabelText('Draft'), {
      target: { value: 'Черновик заметки' },
    });

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Скрыть конспект' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Открыть конспект' }));

    expect(screen.getByLabelText('Draft')).toHaveValue('Черновик заметки');
    expect(document.body.style.overflow).toBe('hidden');
  });
});
