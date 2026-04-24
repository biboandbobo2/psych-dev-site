import type { GroupAnnouncement, PlatformNewsType } from '../../types/groupFeed';

interface PlatformNewsSectionProps {
  items: GroupAnnouncement[];
  loading: boolean;
  /** Компактный вариант (меньше отступы, короче заголовок). */
  compact?: boolean;
  /** Кол-во новостей, которые показываются в ленте. По умолчанию 5. */
  limit?: number;
  className?: string;
}

/**
 * Секция «Новости платформы» на /home — показывает объявления системной
 * broadcast-группы «Все» с разным фоном для tech/content новостей.
 * Если новостей с проставленным `newsType` нет — секция не рендерится.
 */
export function PlatformNewsSection({
  items,
  loading,
  compact,
  limit = 5,
  className = '',
}: PlatformNewsSectionProps) {
  if (loading) return null;
  const visible = items.filter((item) => !!item.newsType).slice(0, limit);
  if (visible.length === 0) return null;

  return (
    <section
      className={`rounded-2xl border border-border bg-card shadow-brand ${
        compact ? 'p-4' : 'p-5'
      } ${className}`.trim()}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          className={`font-bold text-fg ${compact ? 'text-lg' : 'text-xl'}`}
        >
          Новости платформы и контента
        </h2>
        <span className="hidden text-xs text-muted sm:inline">
          Платформа и новый материал
        </span>
      </div>
      <ul className="space-y-2">
        {visible.map((item) => (
          <PlatformNewsCard key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function PlatformNewsCard({ item }: { item: GroupAnnouncement }) {
  const type = item.newsType as PlatformNewsType;
  // Два явно различимых фона на watercolor-палитре:
  // - tech     → голубой accent-100 (фиолетово-голубой)
  // - content  → жёлтый mark
  const styles =
    type === 'tech'
      ? {
          container:
            'border-accent/30 bg-accent-100/70 hover:bg-accent-100 text-fg',
          badge: 'bg-accent-100 text-accent border border-accent/30',
          label: 'Платформа',
          icon: '⚙️',
        }
      : {
          container:
            'border-[#E8D880] bg-mark hover:bg-[#FFE98C] text-[#5a4b00]',
          badge: 'bg-[#FFF3BF] text-[#5a4b00] border border-[#E8D880]',
          label: 'Новый материал',
          icon: '🆕',
        };

  return (
    <li
      className={`rounded-xl border px-3 py-2 text-sm transition ${styles.container}`}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles.badge}`}
        >
          <span aria-hidden>{styles.icon}</span>
          {styles.label}
        </span>
        {item.createdAt?.toDate ? (
          <span className="text-[11px] text-muted">
            {formatRelativeDate(item.createdAt.toDate())}
          </span>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap leading-relaxed">{item.text}</p>
    </li>
  );
}

function formatRelativeDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
