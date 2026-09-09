import { NOTE_FIELD_CLASS, NoteContextSelector } from './NoteContextSelector';

interface NoteFormFieldsProps {
  title: string;
  content: string;
  selectedCourseId: string | null;
  selectedPeriodId: string | null;
  saving: boolean;
  autoFocus?: boolean;
  titlePlaceholder?: string;
  contentPlaceholder?: string;
  contentLabel?: string;
  /** false — конспект лекции: курс/занятие и заголовок заданы лекцией и не редактируются. */
  showContext?: boolean;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onCourseChange: (courseId: string | null) => void;
  onPeriodChange: (periodId: string | null, periodTitle: string | null) => void;
}

export function NoteFormFields({
  title,
  content,
  selectedCourseId,
  selectedPeriodId,
  saving,
  autoFocus = false,
  titlePlaceholder = 'Введите заголовок...',
  contentPlaceholder = 'Напишите свои мысли...',
  contentLabel = 'Ваши размышления',
  showContext = true,
  onTitleChange,
  onContentChange,
  onCourseChange,
  onPeriodChange,
}: NoteFormFieldsProps) {
  return (
    <div className="space-y-4">
      {showContext ? (
        <>
          <NoteContextSelector
            selectedCourseId={selectedCourseId}
            selectedPeriodId={selectedPeriodId}
            saving={saving}
            onCourseChange={onCourseChange}
            onPeriodChange={onPeriodChange}
          />

          <div>
            <label htmlFor="note-title" className="mb-2 block text-sm font-medium text-fg">
              Заголовок заметки
            </label>
            <input
              id="note-title"
              type="text"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={titlePlaceholder}
              className={NOTE_FIELD_CLASS}
              disabled={saving}
              autoFocus={autoFocus}
            />
          </div>
        </>
      ) : null}

      <div>
        <label htmlFor="note-content" className="mb-2 block text-sm font-medium text-fg">
          {contentLabel}
        </label>
        <textarea
          id="note-content"
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          placeholder={contentPlaceholder}
          className={`${NOTE_FIELD_CLASS} min-h-[300px] resize-y`}
          disabled={saving}
          autoFocus={autoFocus && !showContext}
        />
      </div>
    </div>
  );
}
