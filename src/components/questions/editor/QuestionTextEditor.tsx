import { useId } from 'react';
import { EmojiText } from '../../Emoji';

const QUESTION_TEXT_LIMIT = 280;

interface QuestionTextEditorProps {
  questionText: string;
  onQuestionTextChange: (value: string) => void;
}

export function QuestionTextEditor({
  questionText,
  onQuestionTextChange,
}: QuestionTextEditorProps) {
  const questionHintId = useId();
  const trimmedQuestionText = questionText.trim();
  const questionError = trimmedQuestionText.length === 0 ? 'Введите текст вопроса' : null;
  const questionHintText =
    'Ctrl/⌘+Enter — сохранить; до 280 символов, поддерживаются переносы строк';

  return (
    <section>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Текст вопроса <span className="text-red-500">*</span>
      </label>
      <textarea
        value={questionText}
        onChange={(event) => onQuestionTextChange(event.target.value)}
        placeholder="Введите текст вопроса..."
        maxLength={QUESTION_TEXT_LIMIT}
        aria-invalid={Boolean(questionError)}
        aria-describedby={questionHintId}
        className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
          questionError
            ? 'border-red-400 focus:border-red-400'
            : 'border-gray-300 focus:border-indigo-500'
        }`}
        rows={3}
      />
      <div
        id={questionHintId}
        className={`mt-2 flex items-center justify-between text-xs ${
          questionError ? 'text-red-600' : 'text-gray-500'
        } min-h-[20px]`}
      >
        <span>{questionError ? questionError : <EmojiText text={questionHintText} />}</span>
        <span>
          {questionText.length}/{QUESTION_TEXT_LIMIT}
        </span>
      </div>
    </section>
  );
}
