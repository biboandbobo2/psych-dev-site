import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudyVideoPlayer } from './StudyVideoPlayer';

type PlayerEvents = {
  onReady?: () => void;
  onStateChange?: (event: { data: number }) => void;
};

const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;

/** Управляемый YT.Player: позиция и состояние задаются тестом. */
function installYouTube() {
  const video = { time: 0, state: -1, events: {} as PlayerEvents };
  const iframe = document.createElement('iframe');
  (window as typeof window & { YT?: unknown }).YT = {
    Player: vi.fn(function Player(_element: HTMLElement, options: { events?: PlayerEvents }) {
      video.events = options.events ?? {};
      return {
        destroy: vi.fn(),
        getCurrentTime: () => video.time,
        getDuration: () => 120,
        getIframe: () => iframe,
        getPlayerState: () => video.state,
        pauseVideo: vi.fn(),
        seekTo: vi.fn(),
      };
    }),
  };
  const setState = (state: number) => {
    video.state = state;
    video.events.onStateChange?.({ data: state });
  };
  return { video, iframe, setState };
}

/** Секунда реального времени: тикает интервал плеера, видео идёт на `step`. */
function advance(video: { time: number }, seconds: number, step = 1) {
  for (let index = 0; index < seconds; index += 1) {
    video.time += step;
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
}

function setPageHidden(hidden: boolean) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  });
}

describe('StudyVideoPlayer — учёт просмотра', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as typeof window & { YT?: unknown }).YT;
    setPageHidden(false);
  });

  async function renderPlayer() {
    const yt = installYouTube();
    const onPlayedSpan = vi.fn();
    const onOpenedExternally = vi.fn();
    render(
      <StudyVideoPlayer
        embedUrl="https://www.youtube.com/embed/video-1"
        title="Лекция"
        onPlayedSpan={onPlayedSpan}
        onOpenedExternally={onOpenedExternally}
      />
    );
    await vi.waitFor(() => expect(yt.video.events.onStateChange).toBeDefined());
    return { ...yt, onPlayedSpan, onOpenedExternally };
  }

  it('отдаёт проигранные отрезки раз в 10 секунд и при паузе', async () => {
    const { video, setState, onPlayedSpan } = await renderPlayer();

    act(() => setState(PLAYING));
    advance(video, 12);
    act(() => setState(PAUSED));

    expect(onPlayedSpan.mock.calls.map(([span]) => [span.startSec, span.endSec])).toEqual([
      [0, 10],
      [10, 12],
    ]);
    expect(onPlayedSpan.mock.calls[0][0].durationSec).toBe(120);
  });

  it('перемотка к концу не засчитывается как просмотр', async () => {
    const { video, setState, onPlayedSpan } = await renderPlayer();

    act(() => setState(PLAYING));
    advance(video, 3);
    video.time = 110; // перетащили ползунок почти в конец
    advance(video, 10);
    act(() => setState(ENDED));

    // Секунда, в которую случилась перемотка, не засчитывается: где именно
    // был прыжок внутри тика, неизвестно — считаем консервативно.
    const spans = onPlayedSpan.mock.calls.map(([span]) => [span.startSec, span.endSec]);
    expect(spans).toEqual([
      [0, 3],
      [111, 120],
    ]);
  });

  it('скорость ×2 засчитывает проигранные минуты видео', async () => {
    const { video, setState, onPlayedSpan } = await renderPlayer();

    act(() => setState(PLAYING));
    advance(video, 5, 2);
    act(() => setState(PAUSED));

    expect(onPlayedSpan).toHaveBeenCalledWith({ startSec: 0, endSec: 10, durationSec: 120 });
  });

  it('«Смотреть на YouTube» до запуска: фокус в плеере и уход со страницы — переход', async () => {
    const { iframe, onOpenedExternally } = await renderPlayer();
    const activeElement = vi.spyOn(document, 'activeElement', 'get').mockReturnValue(iframe);

    setPageHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(onOpenedExternally).toHaveBeenCalledTimes(1);
    activeElement.mockRestore();
  });

  it('видео уже запускали (играет или на паузе) и вкладку сменили — не переход', async () => {
    const { iframe, setState, onOpenedExternally } = await renderPlayer();
    const activeElement = vi.spyOn(document, 'activeElement', 'get').mockReturnValue(iframe);

    act(() => setState(PLAYING));
    setPageHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    act(() => setState(PAUSED));
    document.dispatchEvent(new Event('visibilitychange'));

    expect(onOpenedExternally).not.toHaveBeenCalled();
    activeElement.mockRestore();
  });

  it('фокус не в плеере — не переход на YouTube', async () => {
    const { onOpenedExternally } = await renderPlayer();

    setPageHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(onOpenedExternally).not.toHaveBeenCalled();
  });
});
