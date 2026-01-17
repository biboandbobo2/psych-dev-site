import { useState } from 'react';
import { useGeminiKey } from '../../hooks';

/**
 * Секция профиля для управления API ключом Gemini (BYOK)
 */
export function GeminiKeySection() {
  const { currentKey, status, error, saveKey, removeKey, hasKey } = useGeminiKey();
  const [inputValue, setInputValue] = useState('');
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  const isLoading = status === 'validating' || status === 'saving';

  const handleSave = async () => {
    const success = await saveKey(inputValue);
    if (success) {
      setInputValue('');
    }
  };

  const handleRemove = async () => {
    await removeKey();
    setShowConfirmRemove(false);
  };

  // Маскирует ключ, показывая только первые 10 и последние 4 символа
  const maskKey = (key: string) => {
    if (key.length <= 14) return key;
    return `${key.slice(0, 10)}...${key.slice(-4)}`;
  };

  const addKeyForm = (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Добавьте свой API ключ Gemini, чтобы AI запросы использовали ваш аккаунт Google Cloud.
        Это позволяет не ограничиваться лимитами сайта.
      </p>

      <div className="space-y-2">
        <input
          type="password"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="AIzaSy..."
          disabled={isLoading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
        />

        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}

        {status === 'success' && (
          <p className="text-sm text-emerald-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Ключ сохранён
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Получить ключ
        </a>

        <button
          onClick={handleSave}
          disabled={isLoading || !inputValue.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading && (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {status === 'validating' ? 'Проверка...' : status === 'saving' ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
        <span role="img" aria-hidden="true">
          🔑
        </span>
        API ключ Gemini
      </h2>

      {hasKey ? (
        // Режим отображения существующего ключа
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Ключ активен</p>
                <p className="text-xs text-gray-500 font-mono">{maskKey(currentKey!)}</p>
              </div>
            </div>
            {showConfirmRemove ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Удалить?</span>
                <button
                  onClick={handleRemove}
                  disabled={isLoading}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isLoading ? '...' : 'Да'}
                </button>
                <button
                  onClick={() => setShowConfirmRemove(false)}
                  disabled={isLoading}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Нет
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmRemove(true)}
                className="text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                Удалить
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600">
            AI запросы используют ваш личный ключ. Расходы идут на ваш Google Cloud аккаунт.
          </p>
        </div>
      ) : (
        // Режим добавления ключа
        <>
          <details className="sm:hidden rounded-xl border border-gray-200 bg-gray-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-blue-600 hover:underline">
              Добавить личный ключ ИИ
            </summary>
            <div className="mt-3">{addKeyForm}</div>
          </details>
          <div className="hidden sm:block">{addKeyForm}</div>
        </>
      )}
    </div>
  );
}
