import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';
import {
  formatLectureTimestamp,
  type LectureNoteSegment,
} from '../../../types/notes';

interface LectureNoteSegmentsEditorProps {
  composer: LectureNoteSegment;
  onComposerChange: (value: string) => void;
  onComposerSubmit: () => void;
  onSegmentBlur: (segmentId: string) => void;
  onSegmentChange: (segmentId: string, value: string) => void;
  onTimestampClick: (startMs: number) => void;
  segments: LectureNoteSegment[];
  showTimestamps: boolean;
  /** false — мобильный просмотр: композер скрыт, конспект только читается */
  showComposer?: boolean;
}

function TimestampButton({
  onClick,
  startMs,
}: {
  onClick: (startMs: number) => void;
  startMs: number | null;
}) {
  if (startMs === null) {
    return null;
  }

  const label = formatLectureTimestamp(startMs);

  return (
    <button
      type="button"
      onClick={() => onClick(startMs)}
      aria-label={`Перейти к ${label}`}
      className="mt-[3px] min-w-[2.75rem] shrink-0 text-left text-[11px] font-medium tabular-nums text-white/40 transition hover:text-white"
    >
      {label}
    </button>
  );
}

function AutoSizeTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const value = typeof props.value === 'string' ? props.value : '';

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = '0px';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      rows={1}
      className={`${props.className ?? ''} overflow-hidden`}
    />
  );
}

export function LectureNoteSegmentsEditor({
  composer,
  onComposerChange,
  onComposerSubmit,
  onSegmentBlur,
  onSegmentChange,
  onTimestampClick,
  segments,
  showTimestamps,
  showComposer = true,
}: LectureNoteSegmentsEditorProps) {
  return (
    <div className="space-y-1">
      {segments.map((segment) => (
        <section key={segment.id} className="flex items-start gap-2">
          {showTimestamps ? (
            <TimestampButton startMs={segment.startMs} onClick={onTimestampClick} />
          ) : null}
          <AutoSizeTextarea
            value={segment.text}
            onChange={(event) => onSegmentChange(segment.id, event.target.value)}
            onBlur={() => onSegmentBlur(segment.id)}
            className="w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/30"
            aria-label="Сегмент конспекта"
          />
        </section>
      ))}

      {showComposer ? (
        <section className="flex items-start gap-2">
          {showTimestamps ? (
            <TimestampButton startMs={composer.startMs} onClick={onTimestampClick} />
          ) : null}
          <AutoSizeTextarea
            value={composer.text}
            onChange={(event) => onComposerChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onComposerSubmit();
              }
            }}
            placeholder={'Пишите конспект по ходу лекции...'}
            className="w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/30"
            aria-label="Заметки по лекции"
          />
        </section>
      ) : null}
    </div>
  );
}
