import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoStudyOverlay } from './VideoStudyOverlay';
import type { LectureNoteSaveStatus } from './VideoStudyNotesPanel';

vi.mock('./StudyVideoPlayer', () => ({
  StudyVideoPlayer: () => <div>Player</div>,
}));

vi.mock('./VideoStudyNotesPanel', () => ({
  VideoStudyNotesPanel: ({
    onSaveStatusChange,
    showTimestamps,
  }: {
    onSaveStatusChange?: (status: LectureNoteSaveStatus) => void;
    showTimestamps: boolean;
  }) => (
    <div>
      <div>Notes panel, timestamps: {showTimestamps ? 'on' : 'off'}</div>
      <button type="button" onClick={() => onSaveStatusChange?.('saved')}>
        report saved
      </button>
    </div>
  ),
}));

vi.mock('./VideoStudyQuestionsPanel', () => ({
  VideoStudyQuestionsPanel: () => <div>Questions panel</div>,
}));

vi.mock('./VideoTranscriptPanel', () => ({
  VideoTranscriptPanel: () => <div>Transcript panel</div>,
}));

vi.mock('./TranscriptExplainCard', () => ({
  TranscriptExplainCard: () => null,
}));

vi.mock('../hooks/useLectureExplain', () => ({
  useLectureExplain: () => ({
    state: { status: 'idle' },
    explain: vi.fn(),
    clear: vi.fn(),
  }),
}));

vi.mock('../../../hooks', () => ({
  useVideoTranscript: () => ({
    error: null,
    hasTranscript: false,
    isChecking: false,
    isLoading: false,
    metadata: null,
    transcript: null,
  }),
}));

vi.mock('../../../lib/telemetry', () => ({
  trackFeatureEvent: vi.fn(),
}));

function renderOverlay(onClose = vi.fn()) {
  render(
    <VideoStudyOverlay
      courseId="development"
      draft={{ segments: [], updatedAtMs: null }}
      embedUrl="https://www.youtube.com/embed/dQw4w9WgXcQ"
      isOpen
      onClose={onClose}
      onDraftChange={vi.fn()}
      originalUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      periodId="preschool"
      periodTitle="Дошкольный возраст"
      videoTitle="Лекция 1"
    />
  );
  return onClose;
}

describe('VideoStudyOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('вкладка ленты называется «Чат», панель конспекта не размонтируется при переключении', () => {
    renderOverlay();

    expect(screen.getByText(/Notes panel/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Чат' }));

    expect(screen.getByText('Questions panel')).toBeInTheDocument();
    // Конспект остаётся смонтированным (скрыт CSS), автосейв продолжает работать
    expect(screen.getByText(/Notes panel/)).toBeInTheDocument();
  });

  it('шестерёнка открывает настройки, тумблер включает таймкоды в конспекте', () => {
    renderOverlay();

    expect(screen.getByText('Notes panel, timestamps: off')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Настройки конспекта' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Таймкоды в конспекте' }));

    expect(screen.getByText('Notes panel, timestamps: on')).toBeInTheDocument();
  });

  it('Esc закрывает поповер настроек, а не весь оверлей', () => {
    const onClose = renderOverlay();

    fireEvent.click(screen.getByRole('button', { name: 'Настройки конспекта' }));
    expect(screen.getByRole('switch', { name: 'Таймкоды в конспекте' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('switch', { name: 'Таймкоды в конспекте' })
    ).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('индикатор в строке вкладок отражает статус автосейва панели', () => {
    renderOverlay();

    expect(
      screen.getByRole('button', { name: 'Автосохранение включено' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'report saved' }));

    expect(screen.getByRole('button', { name: 'Конспект сохранён' })).toBeInTheDocument();
  });
});
