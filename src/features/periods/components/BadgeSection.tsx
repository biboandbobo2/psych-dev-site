import { Section } from '../../../components/ui/Section';

interface BadgeSectionProps {
  slug: string;
  title: string;
  items: string[];
}

export function BadgeSection({ slug, title, items }: BadgeSectionProps) {
  if (!items.length) return null;

  return (
    <Section key={slug} title={title}>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span
            key={`${slug}-badge-${index}`}
            className="inline-flex items-center rounded-full bg-accent-100 text-accent px-3 py-1 text-sm font-medium"
          >
            {item}
          </span>
        ))}
      </div>
    </Section>
  );
}
