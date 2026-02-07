import { Section } from '../../../components/ui/Section';
import { ensureUrl } from '../utils/media';

type BadgeItem = string | { name: string; url?: string };

interface BadgeSectionProps {
  slug: string;
  title: string;
  items: BadgeItem[];
}

export function BadgeSection({ slug, title, items }: BadgeSectionProps) {
  if (!items.length) return null;

  return (
    <Section key={slug} title={title}>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => {
          const label = typeof item === 'string' ? item : item.name;
          const rawUrl = typeof item === 'object' ? item.url?.trim() : undefined;
          const parsedUrl = rawUrl ? ensureUrl(rawUrl) : null;

          const badgeClass =
            'inline-flex items-center rounded-full bg-accent-100 text-accent px-3 py-1 text-sm font-medium';

          if (parsedUrl) {
            return (
              <a
                key={`${slug}-badge-${index}`}
                href={parsedUrl.toString()}
                target="_blank"
                rel="noreferrer"
                className={`${badgeClass} no-underline hover:no-underline focus-visible:no-underline hover:opacity-80 transition-opacity`}
              >
                {label}
              </a>
            );
          }

          return (
            <span
              key={`${slug}-badge-${index}`}
              className={badgeClass}
            >
              {label}
            </span>
          );
        })}
      </div>
    </Section>
  );
}
