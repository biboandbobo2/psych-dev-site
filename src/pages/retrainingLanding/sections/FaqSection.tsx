import { buildFaq, CityConfig } from '../data';
import { PANEL, SECTION_PAD, SectionHeading } from '../ui';

export function FaqSection({ cfg }: { cfg: CityConfig }) {
  return (
    <section className={`${PANEL} ${SECTION_PAD} bg-white`}>
      <SectionHeading eyebrow="FAQ" title="Частые вопросы" />
      <div className="grid max-w-[52rem] gap-2">
        {buildFaq(cfg).map((item) => (
          <details
            key={item.question}
            className="group rounded-[15px] border border-border-cool bg-card px-[1.1rem] py-[0.85rem] open:bg-[#FBFCFA]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[0.85rem] font-bold text-ink [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                className="text-[1rem] text-accent-muted transition group-open:rotate-45"
                aria-hidden="true"
              >
                +
              </span>
            </summary>
            <p className="mt-2 max-w-[44rem] text-[0.8rem] leading-[1.58] text-ink-soft">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
