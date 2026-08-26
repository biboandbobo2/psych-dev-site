import { ADMISSION_NOTE, ADMISSION_REQUIREMENTS, ADMISSION_STEPS } from '../data';
import { PANEL, SECTION_PAD, SectionHeading } from '../ui';

export function AdmissionSection() {
  return (
    <section className={`${PANEL} ${SECTION_PAD} bg-white`}>
      <SectionHeading eyebrow="Поступление" title="Кто может поступить и как это проходит" />
      <div className="grid grid-cols-[0.95fr_1.05fr] gap-[clamp(1.6rem,4vw,2.75rem)] max-[820px]:grid-cols-1">
        <div className="rounded-[20px] border border-border-cool bg-[#FBFCFA] p-[1.35rem]">
          <h3 className="mb-3 font-display text-[1.2rem] font-medium">
            К освоению программы допускаются люди, которые:
          </h3>
          <ul className="grid gap-[0.45rem]">
            {ADMISSION_REQUIREMENTS.map((item) => (
              <li
                key={item}
                className="grid grid-cols-[1.1rem_1fr] gap-2 text-[0.78rem] leading-[1.55] text-ink-soft"
              >
                <span className="font-bold text-accent" aria-hidden="true">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-border-cool pt-3 text-[0.72rem] leading-[1.5] text-ink-faint">
            {ADMISSION_NOTE}
          </p>
        </div>
        <ol className="grid gap-3 self-start">
          {ADMISSION_STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-[2.4rem_1fr] items-start gap-4 rounded-[20px] border border-border-cool bg-card p-[1.2rem]"
            >
              <span className="grid h-[2.4rem] w-[2.4rem] place-items-center rounded-full border border-accent-muted font-display text-[0.75rem] text-accent-muted">
                {index + 1}
              </span>
              <div>
                <h3 className="mb-[0.25rem] font-display text-[1.1rem] font-medium">{step.title}</h3>
                <p className="text-[0.76rem] leading-[1.55] text-ink-soft">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
