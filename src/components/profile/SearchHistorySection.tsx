import { useState, useMemo } from 'react';
import { useSearchHistory, type SearchHistoryType, type SearchHistoryEntry } from '../../hooks';
import { useContentSearchStore } from '../../stores';
import { Emoji } from '../Emoji';

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
  const { openSearch } = useContentSearchStore();
  const [activeType, setActiveType] = useState<SearchHistoryType | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Повторить поиск — только для content
  const handleRepeatSearch = (entry: SearchHistoryEntry) => {
    if (entry.type === 'content') {
      openSearch(entry.query);
    }
    // research, ai_chat и book_rag раскрываются по клику на строку
  };

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

  const renderContent = () => (
    <>
      {/* Табы — только типы с данными */}
      {typesWithData.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4 sm:flex-nowrap sm:overflow-x-auto sm:pb-1">
          {typesWithData.map(({ type, label, icon }) => {
            const isActive = effectiveType === type;
            return (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors sm:flex-none sm:text-sm ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Emoji token={icon} size={16} />
                <span>{label}</span>
                <span
                  className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {entriesByType[type].length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Заголовок для единственного типа */}
      {typesWithData.length === 1 && currentConfig && (
        <div className="flex items-center gap-2 mb-4 text-gray-600">
          <Emoji token={currentConfig.icon} size={16} />
          <span className="font-medium">{currentConfig.label}</span>
          <span className="text-sm opacity-70">({totalForType})</span>
        </div>
      )}

      {/* Список запросов */}
      {currentEntries.length > 0 ? (
        <ul className="space-y-1.5 sm:space-y-2">
          {currentEntries.map((entry) => (
            <SearchHistoryItem
              key={entry.id}
              entry={entry}
              onDelete={deleteEntry}
              onRepeat={handleRepeatSearch}
            />
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
    </>
  );

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
    <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
      {/* Заголовок с кнопкой очистки */}
      <div className="mb-4 hidden items-center justify-between sm:flex">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Emoji token="🔍" size={18} />
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

      <details className="group sm:hidden" open={isMobileOpen} onToggle={(e) => setIsMobileOpen(e.currentTarget.open)}>
        <summary className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <Emoji token="🔍" size={16} />
            История поисков
          </span>
          <svg
            className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </summary>
        <div className="mt-4">
          {hasHistory && (
            <div className="mb-3">
              {showClearConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Удалить всё?</span>
                  <button
                    onClick={handleClearHistory}
                    className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Да
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Нет
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                >
                  Очистить
                </button>
              )}
            </div>
          )}
          <div className="space-y-4">
            {renderContent()}
          </div>
        </div>
      </details>

      <div className="hidden sm:block">
        {renderContent()}
      </div>

    </div>
  );
}

// Отдельный компонент для элемента истории
interface SearchHistoryItemProps {
  entry: SearchHistoryEntry;
  onDelete: (id: string) => void;
  onRepeat: (entry: SearchHistoryEntry) => void;
}

function SearchHistoryItem({ entry, onDelete, onRepeat }: SearchHistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const timeAgo = formatTimeAgo(entry.createdAt);

  // Раскрываемые типы: ai_chat/book_rag с ответом, research с результатами
  const hasAiResponse = (entry.type === 'ai_chat' || entry.type === 'book_rag') && Boolean(entry.aiResponse);
  const hasSearchResults = entry.type === 'research' && entry.searchResults && entry.searchResults.length > 0;
  const isExpandable = hasAiResponse || hasSearchResults;

  // content открывает drawer
  const hasSearchAction = entry.type === 'content';

  const getButtonTitle = () => {
    if (entry.type === 'content') return 'Повторить поиск';
    return '';
  };

  const handleCopyContent = () => {
    if (entry.aiResponse) {
      const text = `Вы: ${entry.query}\n\nАссистент: ${entry.aiResponse}`;
      navigator.clipboard.writeText(text);
    } else if (entry.searchResults) {
      const text = `Поиск: ${entry.query}\n\nРезультаты:\n${entry.searchResults
        .map((r, i) => `${i + 1}. ${r.title}${r.year ? ` (${r.year})` : ''}${r.url ? `\n   ${r.url}` : ''}`)
        .join('\n\n')}`;
      navigator.clipboard.writeText(text);
    }
  };

  const handleRowClick = () => {
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <li className="bg-gray-50 rounded-lg transition-colors sm:rounded-xl">
      {/* Основная строка */}
      <div
        className={`group flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 ${isExpandable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
        onClick={handleRowClick}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isExpandable && (
              <svg
                className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <p className="text-[13px] text-gray-900 truncate sm:text-sm">{entry.query}</p>
          </div>
          <div className={`mt-0.5 flex items-center gap-2 text-xs text-gray-500 ${isExpandable ? 'ml-5 sm:ml-6' : ''}`}>
            <span>{timeAgo}</span>
            {entry.resultsCount !== undefined && !isExpandable && <span>• {entry.resultsCount} результатов</span>}
            {entry.hasAnswer && !isExpandable && <span>• Ответ получен</span>}
            {isExpandable && <span>• Нажмите, чтобы раскрыть</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
          {/* Кнопка повторить — только для content */}
          {hasSearchAction && (
            <button
              onClick={() => onRepeat(entry)}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-600 transition-all"
              title={getButtonTitle()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}
          {/* Кнопка удалить */}
          <button
            onClick={() => onDelete(entry.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all"
            title="Удалить"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Раскрытый AI ответ */}
      {isExpanded && entry.aiResponse && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-200 mx-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Ответ AI
            </span>
            <button
              onClick={handleCopyContent}
              className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
              title="Скопировать диалог"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Копировать
            </button>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {entry.aiResponse}
          </p>
        </div>
      )}

      {/* Раскрытые результаты поиска */}
      {isExpanded && entry.searchResults && entry.searchResults.length > 0 && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-200 mx-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              Найдено статей: {entry.resultsCount}
            </span>
            <button
              onClick={handleCopyContent}
              className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
              title="Скопировать результаты"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Копировать
            </button>
          </div>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {entry.searchResults.map((result, idx) => (
              <li key={idx} className="text-sm">
                {result.url ? (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline line-clamp-2"
                  >
                    {result.title}
                  </a>
                ) : (
                  <span className="text-gray-700 line-clamp-2">{result.title}</span>
                )}
                <div className="text-xs text-gray-500 mt-0.5">
                  {result.authors && <span>{result.authors}</span>}
                  {result.year && <span> • {result.year}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
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
