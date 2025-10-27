import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTopics } from '../hooks/useTopics';
import { useAuth } from '../auth/AuthProvider';
import { AGE_RANGE_OPTIONS, AGE_RANGE_LABELS, type AgeRange, type TopicInput } from '../types/notes';
import { parseTopicsText, previewTopics } from '../utils/topicParser';

export default function AdminTopics() {
  const { user, isAdmin } = useAuth();
  const [selectedAgeRange, setSelectedAgeRange] = useState<AgeRange>('primary-school');
  const { topics, loading, createTopicsBulk, updateTopic, deleteTopic } = useTopics(selectedAgeRange);
  const [bulkText, setBulkText] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <p className="text-red-900">Доступ запрещён. Только для администраторов.</p>
          </div>
        </div>
      </div>
    );
  }

  const preview = showPreview ? previewTopics(bulkText) : null;

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) {
      alert('Введите темы для добавления');
      return;
    }

    const parsedTopics = parseTopicsText(bulkText);
    if (!parsedTopics.length) {
      alert('Не удалось распознать темы');
      return;
    }

    if (!confirm(`Добавить ${parsedTopics.length} тем?`)) return;

    setSaving(true);
    try {
      const maxOrder = topics.length ? Math.max(...topics.map((topic) => topic.order)) : 0;
      const inputs: TopicInput[] = parsedTopics.map((text, index) => ({
        ageRange: selectedAgeRange,
        text,
        order: maxOrder + index + 1,
      }));

      await createTopicsBulk(inputs);
      alert(`✅ Добавлено ${parsedTopics.length} тем`);
      setBulkText('');
      setShowPreview(false);
    } catch (error) {
      console.error(error);
      alert('Ошибка при добавлении тем');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (topicId: string) => {
    if (!confirm('Удалить эту тему?')) return;
    try {
      await deleteTopic(topicId);
    } catch (error) {
      console.error(error);
      alert('Ошибка при удалении темы');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-600">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <nav className="text-sm text-gray-600">
          <Link to="/admin/content" className="hover:text-blue-600">
            Редактор
          </Link>
          <span className="mx-2">→</span>
          <span className="font-medium text-gray-900">Темы для заметок</span>
        </nav>

        <h1 className="text-3xl font-bold">📚 Управление темами для размышлений</h1>

        <section className="rounded-lg bg-white p-6 shadow">
          <label className="mb-2 block text-sm font-medium text-gray-700">Возрастной период</label>
          <select
            value={selectedAgeRange}
            onChange={(event) => setSelectedAgeRange(event.target.value as AgeRange)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 md:w-auto"
          >
            {AGE_RANGE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Текущие темы ({topics.length})</h2>
          {topics.length === 0 ? (
            <p className="text-gray-500">Тем для этого возраста пока нет.</p>
          ) : (
            <div className="space-y-2">
              {topics.map((topic, index) => (
                <div
                  key={topic.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <span className="flex-shrink-0 text-sm font-medium text-gray-500">{index + 1}.</span>
                  <p className="flex-1 text-sm text-gray-700">{topic.text}</p>
                  <button
                    onClick={() => handleDelete(topic.id)}
                    className="flex-shrink-0 rounded bg-red-100 px-2 py-1 text-xs text-red-700 transition hover:bg-red-200"
                  >
                    🗑️ Удалить
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg bg-white p-6 shadow space-y-4">
          <div>
            <h2 className="mb-2 text-xl font-bold">➕ Добавить новые темы</h2>
            <p className="text-sm text-gray-600">
              Вставьте вопросы, каждый на новой строке. Нумерация (1., 2) будет удалена автоматически.
            </p>
          </div>

          <textarea
            value={bulkText}
            onChange={(event) => {
              const value = event.target.value;
              setBulkText(value);
              setShowPreview(value.trim().length > 0);
            }}
            placeholder={[
              '1. Как вы помните свой первый день в школе?',
              '2) Были ли у вас любимые учителя?',
              '3 Вопрос без нумерации',
            ].join('\n')}
            className="min-h-[200px] w-full resize-y rounded-md border border-gray-300 px-4 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={saving}
          />

          {preview && preview.count > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="mb-2 font-medium text-green-900">📝 Будет добавлено тем: {preview.count}</p>

              {preview.warnings.length > 0 && (
                <div className="mb-3 rounded border border-yellow-200 bg-yellow-50 p-3">
                  <p className="mb-1 text-sm font-medium text-yellow-900">⚠️ Предупреждения:</p>
                  <ul className="space-y-1 text-xs text-yellow-800">
                    {preview.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-green-800 hover:text-green-900">
                  Показать превью всех тем
                </summary>
                <ol className="mt-2 space-y-1 pl-5 text-green-700">
                  {preview.topics.map((topic, index) => (
                    <li key={index}>{topic}</li>
                  ))}
                </ol>
              </details>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleBulkAdd}
              disabled={saving || !bulkText.trim()}
              className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {saving ? 'Добавление...' : `➕ Добавить темы ${preview ? `(${preview.count})` : ''}`}
            </button>
            {bulkText && (
              <button
                onClick={() => {
                  setBulkText('');
                  setShowPreview(false);
                }}
                className="rounded-md border border-gray-300 px-6 py-2 transition hover:bg-gray-100"
              >
                Очистить
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
