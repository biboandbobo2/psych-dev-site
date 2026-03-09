import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';
import {
  formatLectureTimestamp,
  type LectureNoteSegment,
} from '../../../types/notes';

interface LectureNoteSegmentsEditorProps {
  composer: LectureNoteSegment;
  onComposerChange: (value: string) => void;
  onSegmentBlur: (segmentId: string) => void;
  onSegmentChange: (segmentId: string, value: string) => void;
  onTimestampClick: (startMs: number) => void;
  segments: LectureNoteSegment[];
  showTimestamps: boolean;
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

  return (
    <button
      type="button"
      onClick={() => onClick(startMs)}
      className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/60 ring-1 ring-white/10 transition hover:bg-white/10"
    >
      {formatLectureTimestamp(startMs)}
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
  onSegmentBlur,
  onSegmentChange,
  onTimestampClick,
  segments,
  showTimestamps,
}: LectureNoteSegmentsEditorProps) {
  return (
    <div className="space-y-4">
      {segments.map((segment) => (
        <section key={segment.id} className="border-b border-white/10 pb-4 last:border-b-0">
          {showTimestamps ? (
            <div className="mb-3">
              <TimestampButton startMs={segment.startMs} onClick={onTimestampClick} />
            </div>
          ) : null}
          <AutoSizeTextarea
            value={segment.text}
            onChange={(event) => onSegmentChange(segment.id, event.target.value)}
            onBlur={() => onSegmentBlur(segment.id)}
            className="min-h-[5.5rem] w-full resize-none bg-transparent text-sm leading-7 text-white outline-none placeholder:text-white/30"
            aria-label="Сегмент конспекта"
          />
        </section>
      ))}

      <section>
        {showTimestamps && composer.startMs !== null ? (
          <div className="mb-3">
            <TimestampButton startMs={composer.startMs} onClick={onTimestampClick} />
          </div>
        ) : null}
        <AutoSizeTextarea
          value={composer.text}
          onChange={(event) => onComposerChange(event.target.value)}
          placeholder="Пишите короткий конспект по ходу лекции..."
          className="min-h-[12rem] w-full resize-none bg-transparent text-sm leading-7 text-white outline-none placeholder:text-white/30"
          aria-label="Заметки по лекции"
        />
      </section>
    </div>
  );
}
