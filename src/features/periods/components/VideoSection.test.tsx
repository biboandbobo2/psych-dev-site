import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoSection } from './VideoSection';

const mocks = vi.hoisted(() => ({
  transcriptChecking: false,
  transcriptError: null as string | null,
  transcriptLoading: false,
  transcriptReady: false,
}));

vi.mock('./VideoStudyNotesPanel', async () => {
  return {
    VideoStudyNotesPanel: ({
      draftSegments,
      onDraftSegmentsChange,
      videoTitle,
    }: {
      draftSegments: Array<{ id: string; startMs: number | null; text: string }>;
      onDraftSegmentsChange: (
        segments: Array<{ id: string; startMs: number | null; text: string }>
      ) => void;
      videoTitle: string;
    }) => {
      return (
        <div>
          <div>Study panel for {videoTitle}</div>
          <label>
            Draft
            <input
              value={draftSegments[0]?.text ?? ''}
              onChange={(event) =>
                onDraftSegmentsChange([
                  {
                    id: 'segment-1',
                    startMs: null,
                    text: event.target.value,
                  },
                ])
              }
            />
          </label>
        </div>
      );
    },
  };
});

vi.mock('./VideoTranscriptPanel', async () => {
  return {
    VideoTranscriptPanel: () => <div>Transcript panel</div>,
  };
});

vi.mock('../../../hooks', async () => {
  return {
    useVideoTranscript: () => ({
      error: mocks.transcriptError,
      hasTranscript: mocks.transcriptReady,
      isChecking: mocks.transcriptChecking,
      isLoading: mocks.transcriptLoading,
      metadata: null,
      transcript: mocks.transcriptReady ? { segments: [] } : null,
    }),
  };
});

describe('VideoSection', () => {
  beforeEach(() => {
    mocks.transcriptChecking = false;
    mocks.transcriptError = null;
    mocks.transcriptLoading = false;
    mocks.transcriptReady = false;
  });

  it('сохраняет черновик при переключении между режимами видео', async () => {
    render(
      <VideoSection
        slug="video"
        title="Видео"
        content={[{ title: 'Лекция 1', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]}
        deckUrl=""
        defaultVideoTitle="Видео-лекция"
        courseId="development"
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

  it('переключает правую панель на транскрипт, если он доступен', async () => {
    mocks.transcriptReady = true;

    render(
      <VideoSection
        slug="video"
        title="Видео"
        content={[{ title: 'Лекция 1', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]}
        deckUrl=""
        defaultVideoTitle="Видео-лекция"
        courseId="development"
        periodId="preschool"
        periodTitle="Дошкольный возраст"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Открыть конспект' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Показать транскрипт' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Показать транскрипт' }));

    expect(screen.getByText('Transcript panel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Показать конспект' })).toBeInTheDocument();
  });

  it('автоматически открывает нужную лекцию из transcript search deep-link', async () => {
    mocks.transcriptReady = true;

    render(
      <VideoSection
        slug="video"
        title="Видео"
        content={[{ title: 'Лекция 1', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]}
        deckUrl=""
        defaultVideoTitle="Видео-лекция"
        courseId="development"
        periodId="intro"
        periodTitle="Введение"
        studyLaunch={{
          requestedVideoId: 'dQw4w9WgXcQ',
          initialPanel: 'transcript',
          initialSeekMs: 65_000,
          initialQuery: 'время',
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Transcript panel')).toBeInTheDocument();
    });
  });

  it('не откатывает transcript panel в notes, пока транскрипт ещё проверяется', async () => {
    mocks.transcriptChecking = true;

    render(
      <VideoSection
        slug="video"
        title="Видео"
        content={[{ title: 'Лекция 1', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]}
        deckUrl=""
        defaultVideoTitle="Видео-лекция"
        courseId="development"
        periodId="intro"
        periodTitle="Введение"
        studyLaunch={{
          requestedVideoId: 'dQw4w9WgXcQ',
          initialPanel: 'transcript',
          initialSeekMs: 65_000,
          initialQuery: 'время',
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Transcript panel')).toBeInTheDocument();
    });
  });
});
