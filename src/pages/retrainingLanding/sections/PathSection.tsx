import { PATH_ITEMS } from '../data';
import { BODY_TEXT, EYEBROW, H2, PANEL, SECTION_PAD } from '../ui';

export function PathSection() {
  return (
    <section className={`${PANEL} ${SECTION_PAD} bg-pastel-sage`}>
      <div className="grid grid-cols-[1fr_1.1fr] items-start gap-[clamp(1.6rem,4vw,2.75rem)] max-[820px]:grid-cols-1">
        <div>
          <p className={EYEBROW}>О программе</p>
          <h2 className={H2}>Не короткий курс, а постепенный вход в профессию</h2>
          <p className={`mt-4 max-w-[32rem] ${BODY_TEXT}`}>
            Психологическое консультирование невозможно освоить только по книгам, видеолекциям
            или набору техник. Профессия складывается из знаний, практики, способности замечать
            другого человека и готовности исследовать собственные решения.
          </p>
          <p className={`mt-3 max-w-[32rem] ${BODY_TEXT}`}>
            Мы не обещаем превратить человека в психолога за несколько месяцев. Мы предлагаем
            среду, в которой можно последовательно войти в профессию и научиться продолжать
            развиваться в ней самостоятельно.
          </p>
        </div>
        <div>
          <p className={`mb-3 font-display text-[1.05rem] font-medium`}>
            Поэтому мы создали длинную программу. В ней есть время, чтобы:
          </p>
          <ul className="grid gap-[0.45rem]">
            {PATH_ITEMS.map((item) => (
              <li
                key={item}
                className="grid grid-cols-[1.1rem_1fr] gap-2 rounded-[13px] border border-ink/[0.12] bg-white/[0.55] px-[0.85rem] py-[0.65rem] text-[0.78rem] leading-[1.5] text-ink-soft"
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
