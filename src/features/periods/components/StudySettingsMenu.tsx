import { useEffect, useRef, useState } from 'react';
import type { LectureQuestionVisibility } from '../../../types/lectureQuestions';
import type { LectureNoteVisibility } from '../../../types/notes';

interface StudySettingsMenuProps {
  showTimestamps: boolean;
  onToggleTimestamps: () => void;
  /** false — гость: блоки видимости скрыты. */
  showQuestionsVisibility: boolean;
  questionsVisibility: LectureQuestionVisibility;
  onQuestionsVisibilityChange: (value: LectureQuestionVisibility) => void;
  noteVisibility: LectureNoteVisibility;
  onNoteVisibilityChange: (value: LectureNoteVisibility) => void;
}

/** Шестерёнка ⚙ в строке вкладок оверлея с поповером настроек конспекта. */
export function StudySettingsMenu({
  showTimestamps,
  onToggleTimestamps,
  showQuestionsVisibility,
  questionsVisibility,
  onQuestionsVisibilityChange,
  noteVisibility,
  onNoteVisibilityChange,
}: StudySettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Поповер закрывается по клику мимо и по Esc; Esc гасится в capture-фазе,
  // чтобы не закрыть весь режим конспекта (см. Esc-иерархию).
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Настройки конспекта"
        aria-expanded={isOpen}
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] ${
          isOpen ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white'
        }`}
      >
        ⚙
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl border border-white/10 bg-[#11161d]/95 p-3 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-white/80">Таймкоды в конспекте</span>
            <button
              type="button"
              role="switch"
              aria-checked={showTimestamps}
              aria-label="Таймкоды в конспекте"
              onClick={onToggleTimestamps}
              className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                showTimestamps ? 'bg-[color:var(--accent)]' : 'bg-white/15'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                  showTimestamps ? 'left-[1.1rem]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {showQuestionsVisibility ? (
            <>
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-xs text-white/50">Мои вопросы видят · эта лекция</p>
                <div role="radiogroup" aria-label="Мои вопросы видят" className="mt-2 flex gap-1">
                  <VisibilityOption
                    label="Группа и лекторы"
                    isActive={questionsVisibility === 'group'}
                    onClick={() => onQuestionsVisibilityChange('group')}
                  />
                  <VisibilityOption
                    label="Только лекторы"
                    isActive={questionsVisibility === 'lecturers'}
                    onClick={() => onQuestionsVisibilityChange('lecturers')}
                  />
                </div>
              </div>

              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-xs text-white/50">Мой конспект видят · эта лекция</p>
                <div role="radiogroup" aria-label="Мой конспект видят" className="mt-2 flex gap-1">
                  <VisibilityOption
                    label="Только я"
                    isActive={noteVisibility === 'private'}
                    onClick={() => onNoteVisibilityChange('private')}
                  />
                  <VisibilityOption
                    label="Группа"
                    isActive={noteVisibility === 'group'}
                    onClick={() => onNoteVisibilityChange('group')}
                  />
                  <VisibilityOption
                    label="Лекторы"
                    isActive={noteVisibility === 'lecturers'}
                    onClick={() => onNoteVisibilityChange('lecturers')}
                  />
                </div>
                <p className="mt-2 text-[11px] leading-4 text-white/35">
                  Открытый конспект виден живьём: правки появляются сразу.
                  «Группа» — группа и лекторы.
                </p>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function VisibilityOption({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      onClick={onClick}
      className={`flex-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition ${
        isActive
          ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/25 text-white'
          : 'border-white/10 bg-white/5 text-white/55 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}
