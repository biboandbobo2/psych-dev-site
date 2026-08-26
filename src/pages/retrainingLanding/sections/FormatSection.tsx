import { CityConfig, FORMAT_EXTRAS, FORMAT_ONLINE, SEMESTERS } from '../data';
import { PANEL, SECTION_PAD, SectionHeading } from '../ui';

export function FormatSection({ cfg }: { cfg: CityConfig }) {
  const mainBlocks = [FORMAT_ONLINE, { title: cfg.onsiteTitle, text: cfg.onsiteText }];

  return (
    <section className={`${PANEL} ${SECTION_PAD} bg-pastel-blue`}>
      <SectionHeading eyebrow="Формат" title="Как устроено обучение" />
      <div className="grid grid-cols-2 gap-[0.9rem] max-[720px]:grid-cols-1">
        {mainBlocks.map((block) => (
          <article
            key={block.title}
            className="rounded-[20px] border border-[#ACBCC7] bg-white/[0.72] p-[1.35rem]"
          >
            <h3 className="mb-[0.55rem] font-display text-[clamp(1.15rem,2.6vw,1.45rem)] font-medium leading-[1.15]">
              {block.title}
            </h3>
            <p className="text-[0.78rem] leading-[1.55] text-ink-soft">{block.text}</p>
          </article>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-[0.9rem] max-[820px]:grid-cols-1">
        {FORMAT_EXTRAS.map((block) => (
          <article
            key={block.title}
            className="rounded-[20px] border border-[#ACBCC7] bg-white/[0.55] p-[1.2rem]"
          >
            <h3 className="mb-[0.45rem] font-display text-[1.1rem] font-medium leading-[1.15]">
              {block.title}
            </h3>
            <p className="text-[0.74rem] leading-[1.55] text-ink-soft">{block.text}</p>
          </article>
        ))}
      </div>
      <div className="mt-8">
        <h3 className="mb-2 font-display text-[clamp(1.2rem,2.8vw,1.55rem)] font-medium">
          Перерывы внутри цикла
        </h3>
        <p className="mb-4 max-w-[46rem] text-[0.8rem] leading-[1.58] text-ink-soft">
          Программа рассчитана на четыре учебных семестра с летними и зимними перерывами. Такой
          ритм позволяет совмещать обучение с работой и семьёй, не превращая два года в
          непрерывный марафон.
        </p>
        <ol className="grid grid-cols-4 gap-[0.6rem] max-[720px]:grid-cols-2 max-[420px]:grid-cols-1">
          {SEMESTERS.map((semester, index) => (
            <li
              key={semester}
              className="rounded-[14px] border border-[#ACBCC7] bg-white/[0.72] px-[0.9rem] py-[0.75rem]"
            >
              <b className="block font-display text-[0.68rem] text-pastel-blue-deep">
                Семестр {index + 1}
              </b>
              <span className="text-[0.78rem] text-ink-soft">{semester}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[0.7rem] leading-[1.5] text-ink-faint">
          Точные даты занятий и итоговой аттестации появятся в учебном календаре до заключения
          договора.
        </p>
      </div>
    </section>
  );
}
