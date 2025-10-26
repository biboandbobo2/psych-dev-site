import { useEffect, useMemo, useState } from 'react';
import { useNotes } from '../hooks/useNotes';
import { AGE_RANGE_LABELS, AGE_RANGE_ORDER, type AgeRange, type Note } from '../types/notes';
import { NoteModal } from '../components/NoteModal';
import { ExportNotesButton } from '../components/ExportNotesButton';
import { PERIOD_CONFIG, PERIOD_FILTER_GROUPS } from '../utils/periodConfig';
import { sortNotes, type SortOption } from '../utils/sortNotes';

const SORT_STORAGE_KEY = 'notesSortPreference';

const PERIOD_ORDER_INDEX = AGE_RANGE_ORDER.reduce<Record<string, number>>((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {});


export default function Notes() {
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | AgeRange>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window === 'undefined') return 'date-new';
    const saved = window.localStorage.getItem(SORT_STORAGE_KEY) as SortOption | null;
    return saved ?? 'date-new';
  });
  const [showStats, setShowStats] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SORT_STORAGE_KEY, sortBy);
  }, [sortBy]);

  const activeAgeRange = selectedPeriod === 'all' ? null : selectedPeriod;
  const { notes, loading, error, createNote, updateNote, deleteNote } = useNotes(activeAgeRange);

  const sortedNotes = useMemo(() => sortNotes(notes, sortBy), [notes, sortBy]);

  const displayNotes = useMemo(() => {
    if (!searchQuery.trim()) return sortedNotes;
    const term = searchQuery.trim().toLowerCase();
    return sortedNotes.filter((note) => {
      const haystack = [note.title, note.content, note.periodTitle, note.topicTitle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [sortedNotes, searchQuery]);

  const totalNotes = notes.length;
  const studiedPeriods = useMemo(() => {
    const set = new Set(
      notes
        .map((note) => note.periodId ?? note.ageRange ?? null)
        .filter(Boolean) as string[]
    );
    return set.size;
  }, [notes]);

  const createdToday = useMemo(() => {
    const today = new Date();
    return notes.filter((note) => isSameDay(note.createdAt, today)).length;
  }, [notes]);

  const createdThisWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return notes.filter((note) => getNoteDate(note.createdAt) >= weekAgo).length;
  }, [notes]);

  const handleCreateNote = () => {
    setEditingNote(null);
    setIsModalOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsModalOpen(true);
  };

  const handleSaveNote = async (data: {
    title: string;
    content: string;
    ageRange: AgeRange | null;
    topicId: string | null;
    topicTitle: string | null;
  }) => {
    try {
      if (editingNote) {
        await updateNote(editingNote.id, data);
      } else {
        await createNote(data.title, data.content, data.ageRange, data.topicId, data.topicTitle);
      }
    } catch (err) {
      console.error('Error saving note', err);
      alert('Ошибка при сохранении заметки');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Удалить заметку?')) return;
    try {
      await deleteNote(noteId);
    } catch (err) {
      console.error(err);
      alert('Ошибка при удалении заметки');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
        <p className="text-muted">Загрузка заметок...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="mb-2 text-xl font-semibold text-red-900">❌ Ошибка загрузки заметок</h2>
          <p className="mb-4 text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-fg">📝 Мои заметки</h1>
        <button
          onClick={handleCreateNote}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 sm:w-64"
        >
          <span className="text-lg">＋</span>
          <span>Новая заметка</span>
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select
          value={selectedPeriod}
          onChange={(event) => setSelectedPeriod(event.target.value as 'all' | AgeRange)}
          className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm text-fg shadow-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30 sm:flex-1"
        >
          <option value="all">Все возрастные периоды</option>
          <option value="intro">📖 Вводное занятие</option>
          {PERIOD_FILTER_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortOption)}
          className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm text-fg shadow-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30 sm:w-64"
        >
          <option value="date-new">Сначала новые</option>
          <option value="date-old">Сначала старые</option>
          <option value="period">По периодам</option>
        </select>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-1 sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Поиск по заметкам..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-border bg-card px-4 py-2 pl-10 text-sm text-fg shadow-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              🔍
            </span>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-fg"
                aria-label="Очистить поиск"
              >
                ✕
              </button>
            ) : null}
          </div>
          <button
            onClick={() => setShowStats((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-fg shadow-sm transition hover:bg-card2"
          >
            <span>📊</span>
            <span className="hidden sm:inline">Статистика</span>
            <span className="text-xs">{showStats ? '▲' : '▼'}</span>
          </button>
        </div>
        <div className="w-full sm:w-64">
          <ExportNotesButton notes={displayNotes} />
        </div>
      </div>

      {showStats ? (
        <StatsPanel total={totalNotes} periods={studiedPeriods} today={createdToday} week={createdThisWeek} />
      ) : null}

      {displayNotes.length === 0 ? (
        <EmptyState
          hasQuery={Boolean(searchQuery.trim())}
          query={searchQuery}
          onResetSearch={() => setSearchQuery('')}
          onCreate={handleCreateNote}
        />
      ) : (
        <div className="space-y-2">
          {displayNotes.map((note) => (
            <NoteListItem key={note.id} note={note} onEdit={handleEditNote} onDelete={handleDeleteNote} />
          ))}
        </div>
      )}

      <NoteModal
        isOpen={isModalOpen}
        noteId={editingNote?.id}
        initialTitle={editingNote?.title}
        initialContent={editingNote?.content}
        initialAgeRange={editingNote?.ageRange ?? activeAgeRange}
        initialTopicId={editingNote?.topicId}
        initialTopicTitle={editingNote?.topicTitle ?? null}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNote}
      />
    </div>
  );
}

function NoteListItem({
  note,
  onEdit,
  onDelete,
}: {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}) {
  const metaKey = (note.periodId ?? note.ageRange ?? 'other') as keyof typeof PERIOD_CONFIG;
  const meta = PERIOD_CONFIG[metaKey] ?? PERIOD_CONFIG.other;
  const periodLabel = note.periodTitle ?? (note.ageRange ? AGE_RANGE_LABELS[note.ageRange] : null);

  return (
    <div
      onClick={() => onEdit(note)}
      className={`group cursor-pointer rounded-lg border border-border border-l-4 bg-card p-4 transition hover:bg-card2 hover:shadow ${meta.colorClass}`}
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <h3 className="flex-1 text-lg font-semibold text-fg group-hover:text-accent">
          {note.title || 'Без названия'}
        </h3>
        <span className="whitespace-nowrap text-sm text-muted">{formatDate(note.createdAt)}</span>
      </div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="flex-1 text-sm text-muted line-clamp-1">
          {note.content || '💭 Описание не добавлено'}
        </p>
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onEdit(note);
            }}
            className="rounded-md p-1.5 text-muted transition hover:bg-white hover:text-accent hover:shadow"
            title="Редактировать"
          >
            ✏️
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(note.id);
            }}
            className="rounded-md p-1.5 text-muted transition hover:bg-white hover:text-red-600 hover:shadow"
            title="Удалить"
          >
            🗑️
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-fg/80">
        {periodLabel ? (
          <span>
            {meta.icon} {periodLabel}
          </span>
        ) : null}
        {note.topicTitle ? <span>• 📚 {note.topicTitle}</span> : null}
      </div>
    </div>
  );
}

function StatsPanel({
  total,
  periods,
  today,
  week,
}: {
  total: number;
  periods: number;
  today: number;
  week: number;
}) {
  const stats = [
    { label: 'Всего заметок', value: total },
    { label: 'Периодов изучено', value: periods },
    { label: 'Создано сегодня', value: today },
    { label: 'На этой неделе', value: week },
  ];

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-lg bg-white px-4 py-3 shadow-sm">
            <div className="text-2xl font-bold text-fg">{item.value}</div>
            <div className="text-sm text-muted">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  hasQuery,
  query,
  onResetSearch,
  onCreate,
}: {
  hasQuery: boolean;
  query: string;
  onResetSearch: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-lg border-2 border-dashed border-border/80 bg-card2 px-6 py-16 text-center">
      <div className="mb-4 text-6xl opacity-60">{hasQuery ? '🔍' : '📝'}</div>
      <h3 className="mb-2 text-2xl font-semibold text-fg">
        {hasQuery ? 'Ничего не найдено' : 'Пока нет заметок'}
      </h3>
      <p className="mx-auto mb-6 max-w-lg text-muted">
        {hasQuery
          ? `По запросу "${query}" заметок не найдено. Попробуйте изменить поисковый запрос.`
          : 'Начните вести заметки во время изучения материалов — так информация запоминается лучше.'}
      </p>
      {hasQuery ? (
        <button
          onClick={onResetSearch}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
        >
          Очистить поиск
        </button>
      ) : (
        <button
          onClick={onCreate}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
        >
          Создать заметку
        </button>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  const value = getNoteDate(date);
  const now = new Date();
  const diffMs = now.getTime() - value.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  if (days === 0) {
    return `Сегодня в ${value.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (days === 1) return 'Вчера';
  if (days < 7) return `${days} ${getDaysWord(days)} назад`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${getWeeksWord(weeks)} назад`;
  }

  return value.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: value.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getDaysWord(days: number): string {
  if (days === 1) return 'день';
  if (days >= 2 && days <= 4) return 'дня';
  return 'дней';
}

function getWeeksWord(weeks: number): string {
  if (weeks === 1) return 'неделю';
  if (weeks >= 2 && weeks <= 4) return 'недели';
  return 'недель';
}

function getNoteDate(date: Date | string): Date {
  return date instanceof Date ? date : new Date(date);
}

function isSameDay(dateA: Date | string, dateB: Date): boolean {
  const a = getNoteDate(dateA);
  return (
    a.getFullYear() === dateB.getFullYear() &&
    a.getMonth() === dateB.getMonth() &&
    a.getDate() === dateB.getDate()
  );
}
