import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VideoSection } from './VideoSection';

vi.mock('./VideoStudyNotesPanel', () => ({
  VideoStudyNotesPanel: ({ videoTitle }: { videoTitle: string }) => (
    <div>Study panel for {videoTitle}</div>
  ),
}));

describe('VideoSection', () => {
  it('переключает карточку видео в режим конспекта', () => {
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

    expect(screen.queryByText('Study panel for Лекция 1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Видео + заметки' }));

    expect(screen.getByText('Study panel for Лекция 1')).toBeInTheDocument();
  });
});
