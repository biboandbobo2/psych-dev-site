import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCourseVideoResumePoint, saveCourseVideoResumePoint } from '../../../lib/courseVideoResume';
import { VideoSection } from './VideoSection';

const overlay = vi.hoisted(() => ({
  props: null as { isOpen: boolean; initialSeekMs: number | null; initialPaused: boolean } | null,
}));

vi.mock('./VideoStudyOverlay', () => ({
  VideoStudyOverlay: (props: NonNullable<typeof overlay.props>) => {
    overlay.props = props;
    return null;
  },
}));

vi.mock('../../../lib/courseProgress/cloudSync', () => ({
  readCloudProgress: () => undefined,
  getSyncedUid: () => null,
  scheduleVideoResumeUpload: vi.fn(),
  scheduleVideoStatUpload: vi.fn(),
  scheduleWatchedListUpload: vi.fn(),
}));

interface PlayerOptions {
  videoId: string;
  playerVars?: Record<string, unknown>;
  events?: { onReady?: () => void; onStateChange?: (event: { data: number }) => void };
}

function installPlayer() {
  const players: Array<{
    options: PlayerOptions;
    timeSec: number;
    state: number;
    seekTo: ReturnType<typeof vi.fn>;
    pauseVideo: ReturnType<typeof vi.fn>;
  }> = [];
  const Player = vi.fn(function (_element: HTMLElement, options: PlayerOptions) {
    const player = {
      options,
      timeSec: 0,
      state: 5,
      getCurrentTime: () => player.timeSec,
      getDuration: () => 7200,
      getPlayerState: () => player.state,
      pauseVideo: vi.fn(),
      seekTo: vi.fn(),
      destroy: vi.fn(),
    };
    players.push(player);
    queueMicrotask(() => options.events?.onReady?.());
    return player;
  });
  (window as typeof window & { YT?: unknown }).YT = { Player };
  return { Player, players };
}

const props = {
  slug: 'video',
  title: 'Видео',
  content: [{ title: 'Лекция 1', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }],
  deckUrl: '',
  defaultVideoTitle: 'Видео-лекция',
  courseId: 'clinical',
  periodId: 'lesson-1',
  periodTitle: 'Занятие 1',
};

function saveResume(overrides: { courseId?: string; path?: string; videoId?: string } = {}) {
  saveCourseVideoResumePoint({
    courseId: 'clinical',
    path: '/clinical/lesson-1',
    videoId: 'dQw4w9WgXcQ',
    timeMs: 1_200_000,
    ...overrides,
  });
}

describe('VideoSection: восстановление позиции', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/clinical/lesson-1');
    overlay.props = null;
  });

  afterEach(() => {
    cleanup();
    delete (window as typeof window & { YT?: unknown }).YT;
    window.history.replaceState({}, '', '/');
  });

  it('после повторного открытия передаёт сохранённые 20:00 без автозапуска', async () => {
    const { Player, players } = installPlayer();
    const first = render(<VideoSection {...props} />);
    await waitFor(() => expect(Player).toHaveBeenCalledTimes(1));
    act(() => {
      players[0].timeSec = 1200;
      players[0].state = 1;
      players[0].options.events?.onStateChange?.({ data: 1 });
    });
    expect(getCourseVideoResumePoint('clinical')?.timeSec).toBe(1200);
    first.unmount();

    render(<VideoSection {...props} />);
    await waitFor(() => expect(Player).toHaveBeenCalledTimes(2));
    expect(players[1].options.playerVars).toMatchObject({ start: 1200 });
    expect(players[1].seekTo).not.toHaveBeenCalled();
    expect(players[1].pauseVideo).not.toHaveBeenCalled();
  });

  it.each([
    { courseId: 'development' },
    { path: '/clinical/lesson-2' },
    { videoId: 'aaaaaaaaaaa' },
  ])('не применяет позицию другого курса, занятия или видео: %j', async (saved) => {
    saveResume(saved);
    const { Player, players } = installPlayer();
    render(<VideoSection {...props} />);
    await waitFor(() => expect(Player).toHaveBeenCalledTimes(1));
    expect(players[0].options.playerVars).not.toHaveProperty('start');
    expect(players[0].seekTo).not.toHaveBeenCalled();
  });

  it('сохраняет приоритет явного таймкода в ссылке на видео', async () => {
    saveResume();
    const { Player, players } = installPlayer();
    render(<VideoSection {...props} content={[{ ...props.content[0], url: `${props.content[0].url}&t=65` }]} />);
    await waitFor(() => expect(Player).toHaveBeenCalledTimes(1));
    expect(players[0].options.playerVars).toMatchObject({ start: 65 });
  });

  it('передаёт явный study deep link вместо сохранённой позиции', async () => {
    saveResume();
    const { Player, players } = installPlayer();
    render(<VideoSection {...props} studyLaunch={{
      requestedVideoId: 'dQw4w9WgXcQ', initialPanel: 'notes', initialSeekMs: 65_000, initialQuery: null,
    }} />);
    await waitFor(() => expect(overlay.props?.isOpen).toBe(true));
    await waitFor(() => expect(Player).toHaveBeenCalledTimes(1));
    expect(overlay.props).toMatchObject({ initialSeekMs: 65_000, initialPaused: false });
    expect(players[0].options.playerVars).not.toHaveProperty('start');
  });

  it('при открытии конспекта до запуска видео сохраняет восстановленную позицию', async () => {
    saveResume();
    const { Player } = installPlayer();
    render(<VideoSection {...props} />);
    await waitFor(() => expect(Player).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Открыть конспект' }));
    expect(overlay.props).toMatchObject({ isOpen: true, initialSeekMs: 1_200_000, initialPaused: true });
  });

  it('смена занятия без перезагрузки не переносит начальную позицию прежней карточки', async () => {
    saveResume();
    const { Player, players } = installPlayer();
    const view = render(<VideoSection {...props} />);
    await waitFor(() => expect(Player).toHaveBeenCalledTimes(1));
    expect(players[0].options.playerVars).toMatchObject({ start: 1200 });
    window.history.replaceState({}, '', '/clinical/lesson-2');
    view.rerender(<VideoSection {...props} periodId="lesson-2" />);
    await waitFor(() => expect(Player).toHaveBeenCalledTimes(2));
    expect(players[1].options.playerVars).not.toHaveProperty('start');
  });
});
