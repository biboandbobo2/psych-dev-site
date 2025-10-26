import { useState } from 'react';
import { type SortOption } from '../utils/sortNotes';

interface NotesFilterProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const SORT_OPTIONS: Array<{ value: SortOption; label: string; icon: string }> = [
  { value: 'date-new', label: '📅 Сначала новые', icon: '🔽' },
  { value: 'date-old', label: '📅 Сначала старые', icon: '🔼' },
  { value: 'period', label: '👶 По возрастным периодам', icon: '📊' },
];

export function NotesFilter({ currentSort, onSortChange }: NotesFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentOption = SORT_OPTIONS.find((option) => option.value === currentSort) ?? SORT_OPTIONS[0];

  const handleSelect = (value: SortOption) => {
    onSortChange(value);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg shadow-sm transition hover:bg-card"
      >
        <span>{currentOption.icon}</span>
        <span>{currentOption.label}</span>
        <span className="text-muted">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen ? (
        <>
          <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-border bg-card shadow-2xl">
            <div className="p-3">
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Сортировка
              </div>
              <div className="space-y-1">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                      currentSort === option.value
                        ? 'bg-accent-100 text-accent font-semibold'
                        : 'text-muted hover:bg-card2 hover:text-fg'
                    }`}
                  >
                    <span className="text-base">{option.icon}</span>
                    <span className="flex-1">{option.label}</span>
                    {currentSort === option.value ? <span className="text-accent">✓</span> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />
        </>
      ) : null}
    </div>
  );
}
