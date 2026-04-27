/**
 * Заглушка на будущее. Сейчас источника публичных событий нет — секция
 * пустая. Останется в этом виде до появления feed-источника аналога
 * MyGroupsFeedSection для всех пользователей.
 */
export function GeneralEventsSection() {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-brand">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-fg">Общие события</h3>
      </div>
      <p className="text-xs text-muted">
        Тут появятся события, доступные всем — новости и встречи вне курсов.
      </p>
    </section>
  );
}
