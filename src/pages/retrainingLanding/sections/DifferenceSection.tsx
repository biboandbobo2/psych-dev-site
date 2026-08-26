import { CityConfig, DIFFERENCES } from '../data';
import { PANEL, SECTION_PAD, SectionHeading } from '../ui';

export function DifferenceSection({ cfg }: { cfg: CityConfig }) {
  const items = DIFFERENCES.map((item) =>
    item.text ? item : { ...item, text: cfg.offlineDifferenceText },
  );

  return (
    <section className={`${PANEL} ${SECTION_PAD} bg-[#FBFCFA]`}>
      <SectionHeading eyebrow="Подход" title="Что отличает программу DOM Academy" />
      <div className="grid gap-3">
        {items.map((item, index) => (
          <article
            key={item.title}
            className="grid grid-cols-[3rem_1fr] items-start gap-4 rounded-[20px] border border-border-cool bg-white p-[clamp(1.1rem,2.6vw,1.5rem)] max-[520px]:grid-cols-1"
          >
            <span className="grid h-[2.4rem] w-[2.4rem] place-items-center rounded-full border border-accent-muted font-display text-[0.7rem] text-accent-muted">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <h3 className="mb-[0.35rem] font-display text-[clamp(1.15rem,2.6vw,1.45rem)] font-medium leading-[1.15]">
                {item.title}
              </h3>
              <p className="max-w-[46rem] text-[0.8rem] leading-[1.58] text-ink-soft">{item.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
