import { useState, type FormEvent } from 'react';
import type { GroupEvent } from '../../../../types/groupFeed';

export interface AssignmentFormValue {
  text: string;
  dueDate: string;
  longText: string;
}

export interface AssignmentFormSubmitPayload {
  text: string;
  dueDate: string;
  longText: string;
}

export const EMPTY_ASSIGNMENT_FORM: AssignmentFormValue = {
  text: '',
  dueDate: '',
  longText: '',
};

export function assignmentToFormValue(event: GroupEvent): AssignmentFormValue {
  return {
    text: event.text ?? '',
    dueDate: event.dueDate ?? '',
    longText: event.longText ?? '',
  };
}

interface AssignmentFormProps {
  initialValue?: AssignmentFormValue;
  initialDueDate?: string;
  saving: boolean;
  errorMessage: string | null;
  submitLabel: string;
  onSubmit: (value: AssignmentFormSubmitPayload) => void;
}

export function AssignmentForm({
  initialValue,
  initialDueDate,
  saving,
  errorMessage,
  submitLabel,
  onSubmit,
}: AssignmentFormProps) {
  const seed: AssignmentFormValue =
    initialValue ?? { ...EMPTY_ASSIGNMENT_FORM, dueDate: initialDueDate ?? '' };

  const [text, setText] = useState(seed.text);
  const [dueDate, setDueDate] = useState(seed.dueDate);
  const [longText, setLongText] = useState(seed.longText);

  const canSubmit = text.trim().length >= 3 && dueDate.length > 0;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({
      text: text.trim(),
      dueDate,
      longText: longText.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="block">
        <span className="text-xs text-gray-500">Дедлайн</span>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          disabled={saving}
        />
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Короткое описание (1–2 строки, будет видно на главной)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        disabled={saving}
      />
      <textarea
        value={longText}
        onChange={(e) => setLongText(e.target.value)}
        rows={6}
        placeholder="Полный текст задания (опционально) — откроется по кнопке «Читать полностью» на главной"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        disabled={saving}
      />
      {errorMessage && <p className="text-xs text-rose-700">{errorMessage}</p>}
      <button
        type="submit"
        disabled={saving || !canSubmit}
        className="rounded-md bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {saving ? 'Сохраняем…' : submitLabel}
      </button>
    </form>
  );
}
