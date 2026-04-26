import { useState } from 'react';
import type { GroupAnnouncement, PlatformNewsType } from '../../types/groupFeed';

interface PlatformNewsSectionProps {
  items: GroupAnnouncement[];
  loading: boolean;
  /** Компактный вариант (меньше отступы, короче заголовок). */
  compact?: boolean;
  /** Кол-во новостей, которые показываются в ленте. По умолчанию 5. */
  limit?: number;
  /** Показывать секцию даже когда новостей нет (с placeholder). */
  showEmpty?: boolean;
  className?: string;
}

/**
 * Секция «Общие объявления» на /home — объявления системной broadcast-группы
 * «Все» с разным фоном для tech/content новостей. По умолчанию скрывается,
 * если новостей с типом нет. Со `showEmpty` показывает секцию с заглушкой.
 */
export function PlatformNewsSection({
  items,
  loading,
  compact,
  limit = 5,
  showEmpty = false,
  className = '',
}: PlatformNewsSectionProps) {
  const visible = items.filter((item) => !!item.newsType).slice(0, limit);
  if (!showEmpty && !loading && visible.length === 0) return null;

  return (
    <section
      className={`rounded-2xl border border-border bg-card shadow-brand ${
        compact ? 'p-4' : 'p-5'
      } ${className}`.trim()}
    >
      <h2
        className={`mb-3 font-bold text-fg ${compact ? 'text-lg' : 'text-xl'}`}
      >
        Общие объявления
      </h2>
      {loading ? (
        <p className="rounded-xl border border-border bg-card2 px-4 py-3 text-sm text-muted">
          Загрузка новостей…
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-border bg-card2 px-4 py-3 text-sm text-muted">
          Пока ничего нет. Здесь будут общие объявления — технические и о новых материалах.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <PlatformNewsCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

const COLLAPSED_TEXT_LIMIT = 220;

function PlatformNewsCard({ item }: { item: GroupAnnouncement }) {
  const type = item.newsType as PlatformNewsType;
  const styles =
    type === 'tech'
      ? {
          container:
            'border-accent/15 bg-accent-100/25 hover:bg-accent-100/45 text-fg',
          badge: 'bg-accent-100 text-accent border border-accent/30',
          label: 'Платформа',
          icon: '⚙️',
        }
      : {
          container:
            'border-[#E8D880]/40 bg-mark/30 hover:bg-mark/55 text-fg',
          badge: 'bg-[#FFF3BF] text-[#5a4b00] border border-[#E8D880]',
          label: 'Новый материал',
          icon: '🆕',
        };

  const text = item.text ?? '';
  const isLong = text.length > COLLAPSED_TEXT_LIMIT;
  const [expanded, setExpanded] = useState(false);
  const visibleText = !isLong || expanded ? text : `${text.slice(0, COLLAPSED_TEXT_LIMIT).trimEnd()}…`;

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
      <p className="whitespace-pre-wrap leading-relaxed">{visibleText}</p>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 text-xs font-semibold text-accent transition hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? 'Свернуть' : 'Прочитать полностью'}
        </button>
      ) : null}
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
