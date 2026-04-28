import type { GroupFeedItem } from '../../../types/groupFeed';
import { isEveryoneGroup } from '../../../../shared/groups/everyoneGroup';

interface MyGroupsFeedSectionProps {
  items: GroupFeedItem[];
  loading: boolean;
  onOpen: (item: GroupFeedItem) => void;
}

export function MyGroupsFeedSection({ items: allItems, loading, onOpen }: MyGroupsFeedSectionProps) {
  // Assignments выведены в свою секцию — здесь только объявления и события.
  // Объявления broadcast-группы «Все» показываются в отдельной секции
  // «Новости платформы», поэтому их тоже исключаем из ленты моих групп.
  const items = allItems.filter(
    (item) => item.kind !== 'assignment' && !isEveryoneGroup(item.groupId),
  );

  if (loading) return null;

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-accent-100/60 p-4">
        <h3 className="mb-1 text-sm font-bold text-fg">Объявления моей группы</h3>
        <p className="text-xs text-muted">На этой неделе нет новых.</p>
      </section>
    );
  }

  const byGroup = new Map<string, typeof items>();
  for (const item of items) {
    const list = byGroup.get(item.groupName) ?? [];
    list.push(item);
    byGroup.set(item.groupName, list);
  }
  // Внутри группы: сначала будущие события по startAt ASC, потом объявления
  // по createdAt DESC. Прошедшие события уходят в конец.
  const nowMs = Date.now();
  for (const [groupName, list] of byGroup) {
    list.sort((a, b) => {
      const aIsEvent = a.kind === 'event';
      const bIsEvent = b.kind === 'event';
      if (aIsEvent && bIsEvent) {
        const aMs = a.startAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
        const bMs = b.startAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
        const aFuture = aMs >= nowMs ? 0 : 1;
        const bFuture = bMs >= nowMs ? 0 : 1;
        if (aFuture !== bFuture) return aFuture - bFuture;
        return aFuture === 0 ? aMs - bMs : bMs - aMs;
      }
      if (aIsEvent) return -1;
      if (bIsEvent) return 1;
      const aMs = a.createdAt?.toMillis?.() ?? 0;
      const bMs = b.createdAt?.toMillis?.() ?? 0;
      return bMs - aMs;
    });
    byGroup.set(groupName, list);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-brand">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-fg">Моя группа</h3>
        <span className="text-xs text-muted">
          {byGroup.size === 1 ? '1 группа' : `${byGroup.size} групп`}
        </span>
      </div>
      <div className="space-y-3">
        {Array.from(byGroup.entries()).map(([groupName, list]) => (
          <div key={groupName} className="rounded-xl border border-border bg-card2 p-3">
            <div className="mb-2 text-sm font-semibold text-fg">👥 {groupName}</div>
            <ul className="space-y-2 text-xs text-muted">
              {list.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    className="-mx-1 w-full rounded-md px-1 py-0.5 text-left transition hover:bg-accent-100/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {item.kind === 'event' && item.dateLabel ? (
                      <span className="mr-1 inline-flex whitespace-nowrap rounded-md bg-mark px-1.5 py-0.5 text-[10px] font-semibold text-[#5a4b00]">
                        {item.dateLabel}
                      </span>
                    ) : (
                      <span className="font-semibold text-fg">Объявление: </span>
                    )}
                    <span>{item.text}</span>
                    {item.zoomLink ? <span className="ml-1 text-accent">· Zoom</span> : null}
                    {item.siteLink ? <span className="ml-1 text-accent">· Подробнее</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
