import type { TestRubric, CourseType, CoreCourseType } from '../../../types/tests';
import { Field } from '../../Field';

const COURSE_LABELS: Record<CoreCourseType, string> = {
  development: 'Психология развития',
  clinical: 'Клиническая психология',
  general: 'Общая психология',
};

const CONTROL =
  'h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[15px] leading-none outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500';
const CONTROL_ERROR = 'border-red-400 focus:border-red-500 focus:ring-red-500/60';

function controlClass(hasError?: boolean, extra?: string) {
  return `${CONTROL} ${hasError ? CONTROL_ERROR : ''} ${extra ?? ''}`.trim();
}

interface TestBasicMetadataProps {
  title: string;
  onTitleChange: (value: string) => void;
  titleMaxLength: number;
  titleHint: string;

  course: CourseType;
  onCourseChange: (value: CourseType) => void;

  rubric: TestRubric;
  onRubricChange: (value: TestRubric) => void;
  rubricOptions: Record<string, string>;

  questionCountInput: string;
  onQuestionCountInputChange: (value: string) => void;
  questionCountError: string | null;
  questionHint: string;

  saving: boolean;
}

export function TestBasicMetadata({
  title,
  onTitleChange,
  titleMaxLength,
  titleHint,
  course,
  onCourseChange,
  rubric,
  onRubricChange,
  rubricOptions,
  questionCountInput,
  onQuestionCountInputChange,
  questionCountError,
  questionHint,
  saving,
}: TestBasicMetadataProps) {
  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-lg font-bold text-gray-900">Параметры теста</h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field htmlFor="test-title" label="Название теста *" hint={titleHint}>
          <input
            id="test-title"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Например: Тест по периоду младенчества"
            maxLength={titleMaxLength}
            className={controlClass(false)}
            disabled={saving}
          />
        </Field>

        <Field
          htmlFor="test-question-count"
          label="Количество вопросов (1–20) *"
          hint={questionHint}
          error={questionCountError}
        >
          <input
            id="test-question-count"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            value={questionCountInput}
            onChange={(e) => onQuestionCountInputChange(e.target.value)}
            className={controlClass(Boolean(questionCountError))}
            aria-invalid={Boolean(questionCountError)}
            disabled={saving}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field htmlFor="test-course" label="Курс *" hint="Выберите курс для теста.">
          <div className="relative">
            <select
              id="test-course"
              value={course}
              onChange={(e) => onCourseChange(e.target.value as CourseType)}
              className={controlClass(false, 'appearance-none pr-8')}
              disabled={saving}
            >
              {Object.entries(COURSE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-zinc-500"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Field>

        <Field htmlFor="test-rubric" label="Рубрика *" hint="Выберите курс целиком или конкретное занятие.">
          <div className="relative">
            <select
              id="test-rubric"
              value={rubric}
              onChange={(e) => onRubricChange(e.target.value as TestRubric)}
              className={controlClass(false, 'appearance-none pr-8')}
              disabled={saving}
            >
              <option value="full-course">Курс целиком</option>
              {Object.keys(rubricOptions).length > 0 && (
                <optgroup label="Занятия">
                  {Object.entries(rubricOptions).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <svg
              className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-zinc-500"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Field>
      </div>
    </div>
  );
}
