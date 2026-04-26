export type FeedFilterKind = 'all' | 'event' | 'announcement' | 'assignment';

interface AdminFeedFiltersProps {
  kind: FeedFilterKind;
  onKindChange: (kind: FeedFilterKind) => void;
  searchQuery: string;
  onSearchChange: (next: string) => void;
  totalCount: number;
}

const KIND_LABELS: Record<FeedFilterKind, string> = {
  all: 'Все',
  event: '📅 События',
  announcement: '📢 Объявления',
  assignment: '📋 Задания',
};

const KINDS: FeedFilterKind[] = ['all', 'event', 'announcement', 'assignment'];

export function AdminFeedFilters({
  kind,
  onKindChange,
  searchQuery,
  onSearchChange,
  totalCount,
}: AdminFeedFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-[#8A97AB]">Фильтр</span>
      <div className="flex flex-wrap gap-1 rounded-md bg-gray-50 p-1">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onKindChange(k)}
            className={`rounded px-2.5 py-1 text-xs transition ${
              k === kind ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-white/60'
            }`}
          >
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="🔎 Поиск по тексту"
        className="min-w-[200px] flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
      />
      <span className="text-xs text-gray-500">{totalCount} записей</span>
    </div>
  );
}
