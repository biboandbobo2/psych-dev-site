import type { GroupFeedItem } from '../../../types/groupFeed';
import { formatDueDateRu } from '../utils';

interface MyAssignmentsSectionProps {
  items: GroupFeedItem[];
  loading: boolean;
  onOpen: (item: GroupFeedItem) => void;
}

export function MyAssignmentsSection({ items, loading, onOpen }: MyAssignmentsSectionProps) {
  if (loading) return null;
  const assignments = items.filter((item) => item.kind === 'assignment');
  if (assignments.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
      <h3 className="mb-3 text-xl font-bold text-fg">Задания</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {assignments.slice(0, 6).map((item) => (
          <article key={item.id} className="rounded-xl border border-border bg-card2 p-4">
            <p className="text-sm font-semibold text-fg">{item.groupName}</p>
            <p className="mt-2 text-sm text-muted">{item.text}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md bg-mark px-2 py-0.5 font-semibold text-[#5a4b00]">
                Дедлайн: {formatDueDateRu(item.dueDate)}
              </span>
              {item.longText ? (
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className="rounded-md border border-accent/30 bg-accent-100 px-2 py-0.5 font-semibold text-accent transition hover:bg-accent-100/70"
                >
                  Читать полностью
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
