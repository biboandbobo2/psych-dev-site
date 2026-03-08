import { NoteContextSelector } from './NoteContextSelector';

interface NoteFormFieldsProps {
  title: string;
  content: string;
  selectedCourseId: string | null;
  selectedPeriodId: string | null;
  saving: boolean;
  autoFocus?: boolean;
  titlePlaceholder?: string;
  contentPlaceholder?: string;
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
  onTitleChange,
  onContentChange,
  onCourseChange,
  onPeriodChange,
}: NoteFormFieldsProps) {
  return (
    <div className="space-y-4">
      <NoteContextSelector
        selectedCourseId={selectedCourseId}
        selectedPeriodId={selectedPeriodId}
        saving={saving}
        onCourseChange={onCourseChange}
        onPeriodChange={onPeriodChange}
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Заголовок заметки</label>
        <input
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={titlePlaceholder}
          className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={saving}
          autoFocus={autoFocus}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Ваши размышления</label>
        <textarea
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          placeholder={contentPlaceholder}
          className="min-h-[300px] w-full resize-y rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={saving}
        />
      </div>
    </div>
  );
}
