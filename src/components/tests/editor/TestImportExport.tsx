import { useRef } from 'react';
import type { Test } from '../../../types/tests';
import { debugError } from '../../../lib/debug';
import { exportTestToJson, importTestFromJson, readFileAsText, downloadJson } from '../../../utils/testImportExport';
import { Emoji, EmojiText } from '../../Emoji';

interface TestImportExportProps {
  // Данные текущего теста для экспорта
  testData: Test;

  // Callback для применения импортированных данных
  onImportSuccess: (data: {
    title: string;
    description?: string;
    rubric: string;
    prerequisiteTestId?: string;
    requiredPercentage?: number;
    defaultRevealPolicy?: any;
    appearance?: any;
    questions: any[];
  }) => void;

  saving: boolean;
  testId?: string;
}

export function TestImportExport({
  testData,
  onImportSuccess,
  saving,
  testId,
}: TestImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportTest = () => {
    try {
      const json = exportTestToJson(testData);
      const filename = `test-${testData.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
      downloadJson(JSON.parse(json), filename);
    } catch (error) {
      alert('Ошибка экспорта теста');
      debugError('Ошибка экспорта теста:', error);
    }
  };

  const handleImportTest = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const result = importTestFromJson(content);

      if (!result.success) {
        alert(result.error || 'Ошибка импорта теста');
        return;
      }

      if (!result.data) {
        alert('Данные теста не найдены в файле');
        return;
      }

      // Подтверждение перед заменой данных
      const confirmImport = window.confirm(
        'Импорт теста заменит все текущие данные. Продолжить?'
      );
      if (!confirmImport) return;

      // Передаём данные родительскому компоненту
      onImportSuccess({
        title: result.data.title || '',
        description: result.data.appearance?.introDescription || '',
        rubric: result.data.rubric || 'full-course',
        prerequisiteTestId: result.data.prerequisiteTestId,
        requiredPercentage: result.data.requiredPercentage,
        defaultRevealPolicy: result.data.defaultRevealPolicy,
        appearance: result.data.appearance,
        questions: result.questions || [],
      });

      alert(`Тест успешно импортирован! Загружено ${result.questions?.length || 0} вопросов.`);
    } catch (error) {
      alert('Не удалось прочитать файл');
      debugError('Не удалось прочитать файл:', error);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Импорт и экспорт</h3>
        <p className="mt-1 text-sm text-gray-600">
          Сохраните тест в JSON или загрузите ранее экспортированный тест
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportTest}
        className="hidden"
      />

      {/* Кнопки */}
      <div className="flex flex-wrap gap-3">
        {/* Экспорт */}
        <button
          onClick={handleExportTest}
          disabled={saving || !testData.title}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          title="Экспортировать весь тест в JSON файл"
        >
          <Emoji token="📤" size={16} />
          <span>Экспортировать тест</span>
        </button>

        {/* Импорт */}
        <button
          onClick={handleImportClick}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          title="Импортировать тест из JSON файла"
        >
          <Emoji token="📥" size={16} />
          <span>Импортировать тест</span>
        </button>
      </div>

      {/* Информация */}
      <div className="space-y-2 text-sm text-gray-600">
        <p>
          <strong>Экспорт:</strong> Сохраняет все данные теста (метаданные, оформление, вопросы) в JSON файл.
        </p>
        <p>
          <strong>Импорт:</strong> Загружает тест из JSON файла и заполняет все поля редактора.
        </p>
      </div>

      {/* Предупреждение */}
      {testId && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          <EmojiText text="⚠️ Внимание:" /> Импорт заменит все текущие данные теста. Рекомендуется сначала экспортировать
          текущую версию для создания резервной копии.
        </div>
      )}

      {/* Полезная информация */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
        <EmojiText text="💡 Совет:" /> Используйте экспорт для создания шаблонов тестов или переноса
        тестов между разными окружениями.
      </div>
    </div>
  );
}
