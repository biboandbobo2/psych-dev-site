import { CityConfig, HERO_FACTS_SHARED } from '../data';
import { CtaLink, PANEL } from '../ui';

export function HeroSection({ cfg }: { cfg: CityConfig }) {
  const facts = [
    HERO_FACTS_SHARED[0],
    HERO_FACTS_SHARED[1],
    { title: 'Гибридный формат', text: cfg.heroFormatFact },
    HERO_FACTS_SHARED[2],
  ];

  return (
    <section
      className={`${PANEL} bg-[linear-gradient(135deg,var(--accent-100),var(--mark))] px-[clamp(1.5rem,7vw,4.5rem)] py-[clamp(2.75rem,8vw,5rem)] max-[420px]:px-4`}
    >
      <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-accent-deep">
        {cfg.heroKicker}
      </p>
      <h1 className="max-w-[46rem] font-display text-[clamp(2.1rem,6vw,3.6rem)] font-medium leading-[1.06]">
        Профессиональная переподготовка «Психолог-консультант»
      </h1>
      <p className="mt-5 max-w-[40rem] text-[clamp(1rem,2.2vw,1.2rem)] leading-[1.5] text-ink-soft">
        Двухлетний путь в профессию: фундаментальная психология, живая практика, супервизия и
        профессиональное сообщество.
      </p>
      <p className="mt-3 max-w-[40rem] text-[0.85rem] leading-[1.62] text-ink-soft">
        Программа DOM Academy для тех, кто хочет не просто изучать психологию, а постепенно
        учиться работать с людьми — внимательно, ответственно и с пониманием границ собственной
        компетенции.
      </p>
      <div className="mt-7 grid grid-cols-4 gap-[0.6rem] max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
        {facts.map((fact) => (
          <article
            key={fact.title}
            className="rounded-[15px] border border-ink/[0.14] bg-white/[0.6] px-[0.9rem] py-[0.8rem]"
          >
            <b className="block text-[0.78rem] leading-[1.3]">{fact.title}</b>
            <small className="mt-1 block text-[0.68rem] leading-[1.45] text-ink-faint">
              {fact.text}
            </small>
          </article>
        ))}
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-4">
        <CtaLink />
        <p className="max-w-[24rem] text-[0.7rem] leading-[1.5] text-ink-faint">
          Собеседование помогает познакомиться, обсудить ваши цели и понять, подходит ли вам
          программа. Оно ни к чему не обязывает.
        </p>
      </div>
    </section>
  );
}
