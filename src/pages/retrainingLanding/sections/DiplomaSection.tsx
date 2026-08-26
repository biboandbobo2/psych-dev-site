import { DIPLOMA_INTRO, DIPLOMA_NOTES } from '../data';
import { BODY_TEXT, PANEL, SECTION_PAD, SectionHeading } from '../ui';

export function DiplomaSection() {
  return (
    <section className={`${PANEL} ${SECTION_PAD} bg-pastel-lilac`}>
      <SectionHeading eyebrow="Документ" title="Документ об образовании" />
      <div className="grid grid-cols-[1.05fr_0.95fr] gap-[clamp(1.6rem,4vw,2.75rem)] max-[820px]:grid-cols-1">
        <div>
          {DIPLOMA_INTRO.map((paragraph) => (
            <p key={paragraph} className={`mb-3 max-w-[34rem] ${BODY_TEXT}`}>
              {paragraph}
            </p>
          ))}
        </div>
        <div className="rounded-[20px] border border-ink/[0.14] bg-white/[0.65] p-[1.35rem]">
          <b className="mb-3 block text-[0.68rem] uppercase tracking-[0.08em] text-accent-deep">
            Важно понимать
          </b>
          <ul className="grid gap-[0.45rem]">
            {DIPLOMA_NOTES.map((note) => (
              <li
                key={note}
                className="grid grid-cols-[1.1rem_1fr] gap-2 text-[0.78rem] leading-[1.55] text-ink-soft"
              >
                <span className="font-bold text-ink-faint" aria-hidden="true">
                  —
                </span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
