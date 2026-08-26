import { CityConfig, GRANT_ITEMS, GRANT_TEXT } from '../data';
import { PANEL, SECTION_PAD, SectionHeading } from '../ui';

export function PriceSection({ cfg }: { cfg: CityConfig }) {
  return (
    <section className={`${PANEL} ${SECTION_PAD} bg-pastel-ochre`}>
      <SectionHeading eyebrow="Стоимость" title="Два года обучения с возможностью поэтапной оплаты" />
      <div className="grid grid-cols-[1.15fr_0.85fr] items-start gap-[clamp(1.6rem,4vw,2.75rem)] max-[820px]:grid-cols-1">
        <div className="overflow-hidden rounded-[20px] border border-ink/[0.14] bg-white/[0.72]">
          {cfg.prices.map((price) => (
            <article
              key={price.amount}
              className="grid grid-cols-[7.5rem_1fr] items-baseline gap-3 border-b border-ink/[0.1] px-[1.2rem] py-[0.95rem] last:border-b-0 max-[520px]:grid-cols-1 max-[520px]:gap-1"
            >
              <div>
                <b className="block font-display text-[1.3rem] font-medium leading-none">
                  {price.amount}
                </b>
                {price.hint ? (
                  <small className="text-[0.66rem] text-ink-faint">{price.hint}</small>
                ) : null}
              </div>
              <p className="text-[0.78rem] leading-[1.5] text-ink-soft">{price.note}</p>
            </article>
          ))}
          <p className="border-t border-ink/[0.1] bg-white/[0.5] px-[1.2rem] py-[0.85rem] text-[0.72rem] leading-[1.5] text-ink-faint">
            {cfg.paymentNote} Никаких скрытых обязательных доплат в ходе обучения быть не должно.
          </p>
        </div>
        <div className="rounded-[20px] border border-accent/40 bg-accent-100 p-[1.35rem]">
          <b className="mb-2 block text-[0.68rem] uppercase tracking-[0.08em] text-accent-deep">
            Льготное место
          </b>
          <h3 className="mb-3 font-display text-[clamp(1.2rem,2.8vw,1.5rem)] font-medium leading-[1.15]">
            Один грант со скидкой 50%
          </h3>
          <p className="mb-3 text-[0.78rem] leading-[1.55] text-ink-soft">{GRANT_TEXT}</p>
          <b className="mb-2 block text-[0.72rem] text-ink">Для участия нужно рассказать:</b>
          <ul className="grid gap-[0.35rem]">
            {GRANT_ITEMS.map((item) => (
              <li
                key={item}
                className="grid grid-cols-[1.1rem_1fr] gap-2 text-[0.76rem] leading-[1.5] text-ink-soft"
              >
                <span className="font-bold text-accent" aria-hidden="true">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
