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
      draft,
      onDraftChange,
      videoTitle,
    }: {
      draft: {
        segments: Array<{ id: string; startMs: number | null; text: string }>;
        updatedAtMs: number | null;
      };
      onDraftChange: (draft: {
        segments: Array<{ id: string; startMs: number | null; text: string }>;
        updatedAtMs: number | null;
      }) => void;
      videoTitle: string;
    }) => {
      return (
        <div>
          <div>Study panel for {videoTitle}</div>
          <label>
            Draft
            <input
              value={draft.segments[0]?.text ?? ''}
              onChange={(event) =>
                onDraftChange({
                  segments: [
                    {
                      id: 'segment-1',
                      startMs: null,
                      text: event.target.value,
                    },
                  ],
                  updatedAtMs: Date.now(),
                })
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

    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Выйти из режима конспекта' })
    );
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
      expect(screen.getByRole('button', { name: 'Транскрипт' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Транскрипт' }));

    expect(screen.getByText('Transcript panel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Конспект' })).toBeInTheDocument();
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

  it('передаёт позицию между inline-плеером и оверлеем в обе стороны', async () => {
    const instances: Array<{
      destroy: ReturnType<typeof vi.fn>;
      getCurrentTime: ReturnType<typeof vi.fn>;
      getDuration: ReturnType<typeof vi.fn>;
      getPlayerState: ReturnType<typeof vi.fn>;
      pauseVideo: ReturnType<typeof vi.fn>;
      seekTo: ReturnType<typeof vi.fn>;
    }> = [];
    const playerMock = vi.fn(function Player(
      _element: HTMLElement,
      options: { events?: { onReady?: () => void } }
    ) {
      const instance = {
        destroy: vi.fn(),
        getCurrentTime: vi.fn(() => 90),
        getDuration: vi.fn(() => 3600),
        getPlayerState: vi.fn(() => 1),
        pauseVideo: vi.fn(),
        seekTo: vi.fn(),
      };
      instances.push(instance);
      queueMicrotask(() => options.events?.onReady?.());
      return instance;
    });
    (window as typeof window & { YT?: unknown }).YT = { Player: playerMock };

    try {
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

      // inline-плеер готов
      await waitFor(() => {
        expect(playerMock).toHaveBeenCalledTimes(1);
      });

      fireEvent.click(screen.getByRole('button', { name: 'Открыть конспект' }));

      // при входе inline ставится на паузу, оверлей продолжает с его позиции
      expect(instances[0].pauseVideo).toHaveBeenCalled();
      await waitFor(() => {
        expect(playerMock).toHaveBeenCalledTimes(2);
        expect(instances[1].seekTo).toHaveBeenCalledWith(90, true);
      });

      // при выходе inline получает позицию оверлея и остаётся на паузе
      instances[1].getCurrentTime.mockReturnValue(150);
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: 'Выйти из режима конспекта',
        })
      );

      expect(instances[0].seekTo).toHaveBeenCalledWith(150, true);
      expect(instances[0].pauseVideo).toHaveBeenCalledTimes(2);
    } finally {
      delete (window as typeof window & { YT?: unknown }).YT;
    }
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
