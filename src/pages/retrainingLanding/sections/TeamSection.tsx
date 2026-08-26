import { TEAM, TEAM_GUESTS } from '../data';
import { BODY_TEXT, PANEL, SECTION_PAD, SectionHeading } from '../ui';

export function TeamSection() {
  return (
    <section className={`${PANEL} ${SECTION_PAD} bg-white`}>
      <SectionHeading eyebrow="Команда" title="Преподаватели и руководители программы" />
      <p className={`mb-6 max-w-[44rem] ${BODY_TEXT}`}>
        В программе участвуют практикующие психологи и психотерапевты разных направлений. Это
        позволяет видеть не одну манеру работы, а профессиональное поле во всём его разнообразии.
      </p>
      <div className="grid grid-cols-3 gap-[0.9rem] max-[820px]:grid-cols-1">
        {TEAM.map((person) => (
          <article
            key={person.name}
            className="overflow-hidden rounded-[20px] border border-border-cool bg-card"
          >
            {/* Заглушка под фото: настоящие портреты добавим в public/images/retraining/ */}
            <div
              className={`grid aspect-[5/3] place-items-center border-b border-border-cool ${person.tone}`}
              aria-hidden="true"
            >
              <span className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full border border-ink/[0.2] bg-white/[0.6] font-display text-[1.3rem] text-ink-soft">
                {person.initials}
              </span>
            </div>
            <div className="p-[1.2rem]">
              <h3 className="mb-[0.45rem] font-display text-[1.2rem] font-medium">{person.name}</h3>
              <p className="text-[0.74rem] leading-[1.55] text-ink-soft">{person.text}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-6 rounded-[20px] border border-border-cool bg-pastel-plain p-[clamp(1.1rem,2.6vw,1.5rem)]">
        <h3 className="mb-[0.35rem] font-display text-[1.1rem] font-medium">
          Приглашённые преподаватели
        </h3>
        <p className="max-w-[46rem] text-[0.78rem] leading-[1.55] text-ink-soft">{TEAM_GUESTS}</p>
      </div>
    </section>
  );
}
