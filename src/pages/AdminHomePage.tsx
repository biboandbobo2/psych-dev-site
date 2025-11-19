import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHomePageContent } from '../hooks/useHomePageContent';
import { Button } from '../components/ui/Button';
import { debugLog, debugError } from '../lib/debug';
import type { HomePageContent } from '../types/homePage';

export default function AdminHomePage() {
  const navigate = useNavigate();
  const { content, loading, error: loadError, saveContent } = useHomePageContent();
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (content) {
      // Форматируем JSON с отступами для удобства редактирования
      setJsonText(JSON.stringify(content, null, 2));
    }
  }, [content]);

  const handleJsonChange = (newValue: string) => {
    setJsonText(newValue);
    setParseError(null);
    setSaveSuccess(false);

    // Проверяем валидность JSON при вводе
    if (newValue.trim()) {
      try {
        JSON.parse(newValue);
      } catch (err) {
        setParseError((err as Error).message);
      }
    }
  };

  const handleSave = async () => {
    try {
      // Парсим и валидируем JSON
      const parsedContent = JSON.parse(jsonText) as HomePageContent;

      // Базовая валидация структуры
      if (!parsedContent.sections || !Array.isArray(parsedContent.sections)) {
        throw new Error('Отсутствует поле sections или оно не является массивом');
      }

      setSaving(true);
      await saveContent(parsedContent);
      setSaveSuccess(true);
      debugLog('HomePage content saved successfully');

      // Убираем сообщение об успехе через 3 секунды
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      debugError('Error saving HomePage content', err);
      setParseError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (content && confirm('Вы уверены? Все несохранённые изменения будут потеряны.')) {
      setJsonText(JSON.stringify(content, null, 2));
      setParseError(null);
      setSaveSuccess(false);
    }
  };

  const handlePreview = () => {
    window.open('/', '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted">Загрузка...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Ошибка загрузки</h3>
        <p className="text-red-700">{loadError.message}</p>
      </div>
    );
  }

  const hasChanges = content && jsonText !== JSON.stringify(content, null, 2);
  const canSave = !parseError && hasChanges && !saving;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fg">Редактор главной страницы</h1>
          <p className="text-muted mt-1">
            Редактируйте контент главной страницы в формате JSON
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/content')}>
            Назад к контенту
          </Button>
          <Button variant="secondary" onClick={handlePreview}>
            Предпросмотр
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {saveSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">✓ Изменения успешно сохранены!</p>
        </div>
      )}

      {parseError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-red-900 font-semibold mb-1">Ошибка в JSON:</h4>
          <p className="text-red-700 text-sm font-mono">{parseError}</p>
        </div>
      )}

      {/* JSON Editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-fg">
            JSON контент (редактируйте с осторожностью):
          </label>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="secondary" onClick={handleReset} size="sm">
                Отменить изменения
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!canSave}
              size="sm"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>

        <textarea
          value={jsonText}
          onChange={(e) => handleJsonChange(e.target.value)}
          className="w-full h-[600px] p-4 font-mono text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          spellCheck={false}
        />

        <div className="text-sm text-muted">
          <p className="mb-1">
            <strong>Совет:</strong> Используйте онлайн JSON-валидатор для проверки синтаксиса перед сохранением.
          </p>
          <p>
            <strong>Структура:</strong> Страница состоит из секций (sections). Каждая секция имеет type, order, enabled и content.
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-blue-900 font-semibold mb-2">ℹ️ Информация</h4>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Секции отображаются в порядке, заданном полем <code className="px-1 bg-blue-100 rounded">order</code></li>
          <li>• Поле <code className="px-1 bg-blue-100 rounded">enabled: false</code> скрывает секцию</li>
          <li>• Изменения применяются сразу после сохранения</li>
          <li>• Будьте осторожны при редактировании структуры - неверный JSON может сломать страницу</li>
        </ul>
      </div>
    </div>
  );
}
