import { useId } from 'react';
import type { RevealPolicy } from '../../../types/tests';
import { MAX_REVEAL_ATTEMPTS } from '../../../types/tests';

interface QuestionRevealPolicyEditorProps {
  questionId: string;
  revealPolicy: RevealPolicy;
  revealPolicySource: 'inherit' | 'custom';
  explanation: string | undefined;
  testRevealPolicy: RevealPolicy | null | undefined;
  onRevealPolicyModeChange: (mode: RevealPolicy['mode']) => void;
  onRevealPolicyAttemptsChange: (attempts: number) => void;
  onRevealPolicySourceChange: (source: 'inherit' | 'custom') => void;
  onExplanationChange: (explanation: string) => void;
}

export function QuestionRevealPolicyEditor({
  questionId,
  revealPolicy,
  revealPolicySource,
  explanation,
  testRevealPolicy,
  onRevealPolicyModeChange,
  onRevealPolicyAttemptsChange,
  onRevealPolicySourceChange,
  onExplanationChange,
}: QuestionRevealPolicyEditorProps) {
  const revealHintId = useId();

  const revealControlsDisabled = !!testRevealPolicy && revealPolicySource === 'inherit';
  const revealPolicyMode = revealPolicy.mode;
  const revealAttempts =
    revealPolicy.mode === 'after_attempts' ? revealPolicy.attempts : 1;

  return (
    <section className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 className="text-sm font-semibold text-indigo-900">
          Показ правильного ответа
        </h3>
        {testRevealPolicy ? (
          <div className="flex items-center gap-3 text-xs font-medium text-indigo-900">
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name={`policy-source-${questionId}`}
                checked={revealPolicySource === 'inherit'}
                onChange={() => onRevealPolicySourceChange('inherit')}
              />
              Использовать настройки теста
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name={`policy-source-${questionId}`}
                checked={revealPolicySource !== 'inherit'}
                onChange={() => onRevealPolicySourceChange('custom')}
              />
              Свои настройки
            </label>
          </div>
        ) : null}
      </div>

      <div
        className={`space-y-3 ${revealControlsDisabled ? 'opacity-60' : ''}`}
        aria-disabled={revealControlsDisabled}
      >
        <label className="flex items-center gap-2 text-sm text-indigo-900">
          <input
            type="radio"
            name={`reveal-${questionId}`}
            value="after_test"
            checked={revealPolicyMode === 'after_test'}
            onChange={() => onRevealPolicyModeChange('after_test')}
            disabled={revealControlsDisabled}
          />
          После завершения теста
        </label>
        <label className="flex items-center gap-2 text-sm text-indigo-900">
          <input
            type="radio"
            name={`reveal-${questionId}`}
            value="after_attempts"
            checked={revealPolicyMode === 'after_attempts'}
            onChange={() => onRevealPolicyModeChange('after_attempts')}
            disabled={revealControlsDisabled}
          />
          После
          <select
            value={revealAttempts}
            onChange={(event) => onRevealPolicyAttemptsChange(Number(event.target.value))}
            disabled={revealControlsDisabled}
            className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-sm text-indigo-900 focus:border-indigo-400 focus:outline-none disabled:bg-indigo-100 disabled:text-indigo-400"
          >
            {Array.from({ length: MAX_REVEAL_ATTEMPTS }, (_, index) => index + 1).map(
              (attempt) => (
                <option key={attempt} value={attempt}>
                  {attempt}
                </option>
              )
            )}
          </select>
          попыток
        </label>
        <label className="flex items-center gap-2 text-sm text-indigo-900">
          <input
            type="radio"
            name={`reveal-${questionId}`}
            value="never"
            checked={revealPolicyMode === 'never'}
            onChange={() => onRevealPolicyModeChange('never')}
            disabled={revealControlsDisabled}
          />
          Никогда
        </label>
        <label className="flex items-center gap-2 text-sm text-indigo-900">
          <input
            type="radio"
            name={`reveal-${questionId}`}
            value="immediately"
            checked={revealPolicyMode === 'immediately'}
            onChange={() => onRevealPolicyModeChange('immediately')}
            disabled={revealControlsDisabled}
          />
          Сразу
        </label>
        <textarea
          value={explanation ?? ''}
          onChange={(event) => onExplanationChange(event.target.value)}
          placeholder="Объяснение правильного ответа (показывается, когда разрешён показ)"
          aria-describedby={revealHintId}
          disabled={revealControlsDisabled}
          className="w-full rounded-md border border-indigo-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-indigo-100"
          rows={3}
        />
        <p id={revealHintId} className="text-xs text-indigo-900/80">
          Объяснение и дополнительные материалы выводятся только тогда, когда политика позволяет показать правильный ответ.
        </p>
      </div>
    </section>
  );
}
