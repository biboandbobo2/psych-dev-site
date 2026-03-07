import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VideoSection } from './VideoSection';

vi.mock('./VideoStudyNotesPanel', async () => {
  const React = await import('react');

  return {
    VideoStudyNotesPanel: ({ videoTitle }: { videoTitle: string }) => {
      const [draft, setDraft] = React.useState('');

      return (
        <div>
          <div>Study panel for {videoTitle}</div>
          <label>
            Draft
            <input value={draft} onChange={(event) => setDraft(event.target.value)} />
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

    expect(screen.getByText('Study panel for Лекция 1')).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Открыть конспект' }));
    await waitFor(() => {
      expect(screen.getByText('Study panel for Лекция 1')).toBeVisible();
    });

    fireEvent.change(screen.getByLabelText('Draft'), {
      target: { value: 'Черновик заметки' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Скрыть конспект' }));
    fireEvent.click(screen.getByRole('button', { name: 'Открыть конспект' }));

    expect(screen.getByLabelText('Draft')).toHaveValue('Черновик заметки');
  });
});
