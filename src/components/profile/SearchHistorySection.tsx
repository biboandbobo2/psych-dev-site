import { useState, useMemo } from 'react';
import { useSearchHistory, type SearchHistoryType, type SearchHistoryEntry } from '../../hooks';

// Конфигурация типов истории
const HISTORY_TYPES: Array<{
  type: SearchHistoryType;
  label: string;
  icon: string;
  emptyText: string;
}> = [
  { type: 'content', label: 'Контент', icon: '📚', emptyText: 'Нет поисков по контенту' },
  { type: 'research', label: 'Статьи', icon: '🔬', emptyText: 'Нет научных поисков' },
  { type: 'ai_chat', label: 'AI Чат', icon: '🤖', emptyText: 'Нет диалогов с AI' },
  { type: 'book_rag', label: 'Книги', icon: '📖', emptyText: 'Нет вопросов к книгам' },
];

const VISIBLE_ITEMS = 5;

export function SearchHistorySection() {
  const { entriesByType, loading, hasHistory, deleteEntry, clearHistory } = useSearchHistory();
  const [activeType, setActiveType] = useState<SearchHistoryType | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Определяем типы с данными
  const typesWithData = useMemo(
    () => HISTORY_TYPES.filter(({ type }) => entriesByType[type].length > 0),
    [entriesByType]
  );

  // Если нет истории вообще — не рендерим секцию
  if (!loading && !hasHistory) {
    return null;
  }

  // Авто-выбор первого таба с данными
  const effectiveType = activeType ?? typesWithData[0]?.type ?? null;
  const currentEntries = effectiveType ? entriesByType[effectiveType].slice(0, VISIBLE_ITEMS) : [];
  const currentConfig = HISTORY_TYPES.find((t) => t.type === effectiveType);
  const totalForType = effectiveType ? entriesByType[effectiveType].length : 0;

  const handleClearHistory = async () => {
    await clearHistory();
    setShowClearConfirm(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
          <div className="h-10 bg-gray-100 rounded mb-4" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      {/* Заголовок с кнопкой очистки */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span role="img" aria-hidden="true">
            🔍
          </span>
          История поисков
        </h2>
        {hasHistory && (
          <div className="relative">
            {showClearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Удалить всё?</span>
                <button
                  onClick={handleClearHistory}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Да
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Нет
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                Очистить
              </button>
            )}
          </div>
        )}
      </div>

      {/* Табы — только типы с данными */}
      {typesWithData.length > 1 && (
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {typesWithData.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                effectiveType === type
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span role="img" aria-hidden="true">
                {icon}
              </span>
              <span>{label}</span>
              <span className="text-xs opacity-70">({entriesByType[type].length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Заголовок для единственного типа */}
      {typesWithData.length === 1 && currentConfig && (
        <div className="flex items-center gap-2 mb-4 text-gray-600">
          <span role="img" aria-hidden="true">
            {currentConfig.icon}
          </span>
          <span className="font-medium">{currentConfig.label}</span>
          <span className="text-sm opacity-70">({totalForType})</span>
        </div>
      )}

      {/* Список запросов */}
      {currentEntries.length > 0 ? (
        <ul className="space-y-2">
          {currentEntries.map((entry) => (
            <SearchHistoryItem key={entry.id} entry={entry} onDelete={deleteEntry} />
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-sm py-4 text-center">{currentConfig?.emptyText ?? 'Нет данных'}</p>
      )}

      {/* Показать больше */}
      {totalForType > VISIBLE_ITEMS && (
        <button className="mt-3 text-sm text-blue-600 hover:underline w-full text-center">
          Показать все ({totalForType})
        </button>
      )}
    </div>
  );
}

// Отдельный компонент для элемента истории
interface SearchHistoryItemProps {
  entry: SearchHistoryEntry;
  onDelete: (id: string) => void;
}

function SearchHistoryItem({ entry, onDelete }: SearchHistoryItemProps) {
  const timeAgo = formatTimeAgo(entry.createdAt);

  return (
    <li className="group flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">{entry.query}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
          <span>{timeAgo}</span>
          {entry.resultsCount !== undefined && <span>• {entry.resultsCount} результатов</span>}
          {entry.hasAnswer && <span>• Ответ получен</span>}
        </div>
      </div>
      <button
        onClick={() => onDelete(entry.id)}
        className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-red-500 transition-all"
        title="Удалить"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  );
}

// Хелпер для форматирования времени
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} дн. назад`;

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
