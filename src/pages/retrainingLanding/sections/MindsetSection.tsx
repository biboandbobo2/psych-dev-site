import { MINDSET_ITEMS, MINDSET_STATS, MINDSET_STATS_NOTE } from '../data';
import { BODY_TEXT, PANEL, SECTION_PAD, SectionHeading } from '../ui';

export function MindsetSection() {
  return (
    <section className={`${PANEL} ${SECTION_PAD} bg-pastel-cream`}>
      <SectionHeading eyebrow="Результат" title="Как меняется профессиональное мышление" />
      <p className={`mb-5 max-w-[44rem] ${BODY_TEXT}`}>
        Студенты первых потоков описывают не столько накопление техник, сколько изменение
        взгляда на профессию:
      </p>
      <ul className="grid max-w-[46rem] gap-[0.45rem]">
        {MINDSET_ITEMS.map((item) => (
          <li
            key={item}
            className="grid grid-cols-[1.1rem_1fr] gap-2 text-[0.8rem] leading-[1.55] text-ink-soft"
          >
            <span className="font-bold text-accent" aria-hidden="true">
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-7 grid grid-cols-3 gap-[0.6rem] max-[720px]:grid-cols-1">
        {MINDSET_STATS.map((stat) => (
          <article
            key={stat.label}
            className="rounded-[15px] border border-ink/[0.14] bg-white/[0.65] px-[1rem] py-[0.9rem]"
          >
            <b className="block font-display text-[1.6rem] font-medium leading-none text-accent-deep">
              {stat.value}
            </b>
            <small className="mt-1 block text-[0.7rem] leading-[1.4] text-ink-faint">
              {stat.label}
            </small>
          </article>
        ))}
      </div>
      <p className="mt-3 text-[0.68rem] text-ink-faint">{MINDSET_STATS_NOTE}</p>
    </section>
  );
}
