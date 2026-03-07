import { type AgeRange } from '../types/notes';
import { TopicSelector } from './TopicSelector';

interface NoteFormFieldsProps {
  title: string;
  content: string;
  ageRange: AgeRange | null;
  topicId: string | null;
  saving: boolean;
  autoFocus?: boolean;
  titlePlaceholder?: string;
  contentPlaceholder?: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onAgeRangeChange: (ageRange: AgeRange | null) => void;
  onTopicSelect: (topicId: string | null, topicTitle: string | null) => void;
}

export function NoteFormFields({
  title,
  content,
  ageRange,
  topicId,
  saving,
  autoFocus = false,
  titlePlaceholder = 'Введите заголовок...',
  contentPlaceholder = 'Напишите свои мысли...',
  onTitleChange,
  onContentChange,
  onAgeRangeChange,
  onTopicSelect,
}: NoteFormFieldsProps) {
  return (
    <div className="space-y-4">
      <TopicSelector
        selectedAgeRange={ageRange}
        selectedTopicId={topicId}
        onAgeRangeChange={onAgeRangeChange}
        onTopicSelect={onTopicSelect}
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
