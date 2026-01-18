import { useState } from 'react';
import { type AgeRange, AGE_RANGE_OPTIONS, AGE_RANGE_LABELS } from '../types/notes';
import { useTopics } from '../hooks/useTopics';
import { EmojiText } from './Emoji';

interface TopicSelectorProps {
  selectedAgeRange: AgeRange | null;
  selectedTopicId: string | null;
  onAgeRangeChange: (ageRange: AgeRange | null) => void;
  onTopicSelect: (topicId: string | null, topicText: string | null) => void;
}

export function TopicSelector({
  selectedAgeRange,
  selectedTopicId,
  onAgeRangeChange,
  onTopicSelect,
}: TopicSelectorProps) {
  const [showTopics, setShowTopics] = useState(false);
  const normalizedAgeRange = selectedAgeRange === 'early-childhood' ? 'infancy' : selectedAgeRange;
  const { topics, loading: topicsLoading } = useTopics(normalizedAgeRange);

  const handleAgeRangeChange = (ageRange: string) => {
    const newAgeRange = (ageRange as AgeRange) || null;
    onAgeRangeChange(newAgeRange);
    onTopicSelect(null, null);
    setShowTopics(Boolean(newAgeRange));
  };

  const handleTopicSelect = (topicId: string, topicText: string) => {
    onTopicSelect(topicId, topicText);
    setShowTopics(false);
  };

  const selectedTopic = selectedTopicId
    ? topics.find((topic) => topic.id === selectedTopicId)
    : null;
  const buttonLabel = topicsLoading
    ? '⏳ Загрузка тем...'
    : selectedTopicId
      ? '✅ Тема выбрана (изменить)'
      : topics.length > 0
        ? `💡 Выбрать тему для размышлений (${topics.length})`
        : '💡 Выбрать тему для размышлений';

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Возрастной период
        </label>
        <select
          value={selectedAgeRange || ''}
          onChange={(event) => handleAgeRangeChange(event.target.value)}
          className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Выберите возраст</option>
          {AGE_RANGE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {selectedAgeRange && (
        <div>
          <button
            onClick={() => setShowTopics((prev) => !prev)}
            disabled={topicsLoading}
            className="flex w-full items-center justify-between rounded-md bg-green-100 px-4 py-2 text-green-800 transition hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <EmojiText text={buttonLabel} />
            <span>{showTopics ? '▲' : '▼'}</span>
          </button>

          {showTopics && !topicsLoading && (
            <div className="mt-2 max-h-96 overflow-y-auto rounded-md border border-gray-300">
              {topics.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p className="mb-2">Нет тем для этого возраста</p>
                  <p className="text-sm">Темы могут быть добавлены администратором</p>
                </div>
              ) : (
                <>
                  <div className="border-b bg-blue-50 p-4">
                    <p className="font-medium text-blue-900">
                      <EmojiText text="📚 Вопросы для размышлений о себе" />
                    </p>
                    <p className="mt-1 text-xs text-blue-700">
                      Выберите вопрос, который вас интересует ({topics.length} доступно)
                    </p>
                  </div>
                  <div className="divide-y">
                    {topics.map((topic, index) => (
                      <button
                        key={topic.id}
                        onClick={() => handleTopicSelect(topic.id, topic.text)}
                        className="w-full px-4 py-3 text-left transition-colors hover:bg-blue-50"
                      >
                        <span className="text-sm text-gray-700">
                          {index + 1}. {topic.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {selectedTopic && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <p className="mb-1 text-sm font-medium text-green-900">
            <EmojiText text="💡 Выбранная тема:" />
          </p>
          <p className="text-sm text-green-800">{selectedTopic.text}</p>
        </div>
      )}
    </div>
  );
}
