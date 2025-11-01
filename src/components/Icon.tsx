import { EVENT_ICON_MAP, EVENT_ICONS, type EventIconId } from '../data/eventIcons';

const ICON_BASE_PATH = '/icons/events/';

type IconProps = {
  name: EventIconId;
  size?: number;
  className?: string;
  title?: string;
};

export function Icon({ name, size = 48, className, title }: IconProps) {
  const icon = EVENT_ICON_MAP[name];

  if (!icon) {
    if (import.meta.env.DEV) {
      console.warn(`Icon "${name}" not found. Available icons: ${EVENT_ICONS.map((i) => i.id).join(', ')}`);
    }
    return null;
  }

  const dimension = Math.max(size, 1);
  const ariaLabel = title ?? icon.name;

  return (
    <span
      className={`inline-flex items-center justify-center${className ? ` ${className}` : ''}`}
      style={{ width: dimension, height: dimension }}
      aria-label={ariaLabel}
      role="img"
    >
      <img
        src={`${ICON_BASE_PATH}${icon.filename}`}
        alt={ariaLabel}
        width={dimension}
        height={dimension}
        loading="lazy"
        className="pointer-events-none select-none"
        style={{ width: '100%', height: '100%' }}
      />
    </span>
  );
}

export type { EventIconId };
