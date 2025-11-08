import type { RevealPolicy } from '../../../types/tests';
import { Field } from '../../Field';
import { MAX_REVEAL_ATTEMPTS } from '../../../types/tests';

interface TestPolicyEditorProps {
  defaultRevealPolicy: RevealPolicy;
  onPolicyChange: (policy: RevealPolicy) => void;
  saving: boolean;
}

export function TestPolicyEditor({
  defaultRevealPolicy,
  onPolicyChange,
  saving,
}: TestPolicyEditorProps) {
  const mode = defaultRevealPolicy.mode;
  const attempts = defaultRevealPolicy.mode === 'after_attempts' ? defaultRevealPolicy.attempts : 1;

  const handleModeChange = (newMode: RevealPolicy['mode']) => {
    if (newMode === 'after_attempts') {
      onPolicyChange({ mode: 'after_attempts', attempts: 1 });
    } else {
      onPolicyChange({ mode: newMode });
    }
  };

  const handleAttemptsChange = (value: string) => {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= MAX_REVEAL_ATTEMPTS) {
      onPolicyChange({ mode: 'after_attempts', attempts: parsed });
    }
  };

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Политика показа правильных ответов</h3>
        <p className="mt-1 text-sm text-gray-600">
          Управляет тем, когда пользователь увидит правильный ответ при прохождении теста
        </p>
      </div>

      <Field
        htmlFor="reveal-policy-mode"
        label="Когда показывать правильные ответы"
        hint="Каждый вопрос может переопределить эту настройку"
      >
        <select
          id="reveal-policy-mode"
          value={mode}
          onChange={(e) => handleModeChange(e.target.value as RevealPolicy['mode'])}
          disabled={saving}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="immediately">Сразу после ответа на вопрос</option>
          <option value="after_attempts">После нескольких попыток</option>
          <option value="after_test">После завершения всего теста</option>
          <option value="never">Никогда не показывать</option>
        </select>
      </Field>

      {mode === 'after_attempts' && (
        <Field
          htmlFor="reveal-attempts"
          label="Количество попыток"
          hint={`От 1 до ${MAX_REVEAL_ATTEMPTS} попыток`}
        >
          <input
            id="reveal-attempts"
            type="number"
            min={1}
            max={MAX_REVEAL_ATTEMPTS}
            value={attempts}
            onChange={(e) => handleAttemptsChange(e.target.value)}
            disabled={saving}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </Field>
      )}

      {/* Пояснения для каждого режима */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
        {mode === 'immediately' && (
          <>
            <strong>Сразу после ответа:</strong> Пользователь увидит правильный ответ и пояснение
            сразу после того, как ответит на вопрос.
          </>
        )}
        {mode === 'after_attempts' && (
          <>
            <strong>После {attempts} {attempts === 1 ? 'попытки' : 'попыток'}:</strong> Правильный ответ
            будет показан только после {attempts} неправильных ответов.
          </>
        )}
        {mode === 'after_test' && (
          <>
            <strong>После завершения теста:</strong> Все правильные ответы будут показаны только
            на экране результатов после завершения теста.
          </>
        )}
        {mode === 'never' && (
          <>
            <strong>Никогда:</strong> Правильные ответы не будут показаны ни при каких условиях.
            Пользователь увидит только свой результат в процентах.
          </>
        )}
      </div>

      {/* Дополнительная информация */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
        💡 <strong>Совет:</strong> Для обучающих тестов рекомендуется режим "Сразу после ответа",
        для экзаменационных - "После завершения теста".
      </div>
    </div>
  );
}
