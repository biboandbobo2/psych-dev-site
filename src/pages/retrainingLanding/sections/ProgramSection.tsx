import { PROGRAM_BLOCKS } from '../data';
import { PANEL, SECTION_PAD, SectionHeading } from '../ui';

const BLOCK_TONES = [
  'bg-pastel-sage',
  'bg-pastel-blue',
  'bg-pastel-cream',
  'bg-pastel-terracotta',
  'bg-pastel-lilac',
  'bg-pastel-ochre',
];

export function ProgramSection() {
  return (
    <section className={`${PANEL} ${SECTION_PAD} bg-white`}>
      <SectionHeading eyebrow="Программа" title="Чему вы будете учиться" />
      <div className="grid grid-cols-2 gap-[0.9rem] max-[820px]:grid-cols-1">
        {PROGRAM_BLOCKS.map((block, index) => (
          <article
            key={block.title}
            className={`flex flex-col rounded-[20px] border border-border-cool p-[1.35rem] ${BLOCK_TONES[index]}`}
          >
            <h3 className="mb-[0.55rem] font-display text-[clamp(1.15rem,2.6vw,1.45rem)] font-medium leading-[1.15]">
              {block.title}
            </h3>
            <p className="mb-3 text-[0.78rem] leading-[1.55] text-ink-soft">{block.lead}</p>
            <div className="mt-auto rounded-[14px] border border-ink/[0.12] bg-white/[0.6] p-[0.85rem]">
              <b className="mb-[0.35rem] block text-[0.68rem] uppercase tracking-[0.08em] text-accent-deep">
                {block.itemsTitle}
              </b>
              <ul className="grid gap-[0.2rem]">
                {block.items.map((item) => (
                  <li key={item} className="text-[0.74rem] leading-[1.5] text-ink-soft">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
