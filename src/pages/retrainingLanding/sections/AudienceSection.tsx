import { AUDIENCE, CityConfig, NOT_FOR_SHARED } from '../data';
import { PANEL, SECTION_PAD, SectionHeading } from '../ui';

const CARD_TONES = ['bg-pastel-cream', 'bg-pastel-blue', 'bg-pastel-terracotta', 'bg-pastel-lilac'];

export function AudienceSection({ cfg }: { cfg: CityConfig }) {
  const notFor = [NOT_FOR_SHARED[0], cfg.notForOffline, ...NOT_FOR_SHARED.slice(1)];

  return (
    <section className={`${PANEL} ${SECTION_PAD} bg-white`}>
      <SectionHeading eyebrow="Аудитория" title="Для кого эта программа" />
      <div className="grid grid-cols-2 gap-[0.9rem] max-[720px]:grid-cols-1">
        {AUDIENCE.map((card, index) => (
          <article
            key={card.title}
            className={`rounded-[20px] border border-border-cool p-[1.35rem] ${CARD_TONES[index]}`}
          >
            <h3 className="mb-[0.55rem] font-display text-[clamp(1.15rem,2.6vw,1.45rem)] font-medium leading-[1.15]">
              {card.title}
            </h3>
            <p className="text-[0.78rem] leading-[1.55] text-ink-soft">{card.text}</p>
          </article>
        ))}
      </div>
      <div className="mt-8 rounded-[20px] border border-border-cool bg-[#FBFCFA] p-[clamp(1.2rem,3vw,1.8rem)]">
        <h3 className="mb-3 font-display text-[clamp(1.2rem,2.8vw,1.55rem)] font-medium">
          Кому программа не подойдёт
        </h3>
        <ul className="grid gap-[0.45rem]">
          {notFor.map((item) => (
            <li
              key={item}
              className="grid grid-cols-[1.1rem_1fr] gap-2 text-[0.78rem] leading-[1.55] text-ink-soft"
            >
              <span className="font-bold text-ink-faint" aria-hidden="true">
                —
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
