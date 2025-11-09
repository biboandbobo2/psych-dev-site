interface NotesEmptyProps {
  hasQuery: boolean;
  query: string;
  onResetSearch: () => void;
  onCreate: () => void;
}

export function NotesEmpty({ hasQuery, query, onResetSearch, onCreate }: NotesEmptyProps) {
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
