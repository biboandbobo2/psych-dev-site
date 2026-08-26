import { CtaLink, EYEBROW, PANEL } from '../ui';

export function FinalCtaSection() {
  return (
    <section
      className={`${PANEL} bg-[linear-gradient(135deg,#F7F2DF,#F3F6E8)] p-[clamp(2.3rem,6vw,3.65rem)] text-center max-[420px]:px-4`}
    >
      <p className={EYEBROW}>Первый шаг</p>
      <h2 className="mx-auto mb-4 max-w-[40rem] font-display text-[clamp(1.8rem,4.5vw,2.7rem)] font-medium leading-[1.08]">
        Если вы давно думаете о профессии психолога, начните с разговора
      </h2>
      <p className="mx-auto mb-6 max-w-[36rem] text-[0.85rem] leading-[1.62] text-ink-soft">
        Не обязательно принимать решение о двух годах обучения прямо сейчас. Оставьте заявку,
        получите полную программу и приходите на собеседование. Мы ответим на вопросы и вместе
        посмотрим, соответствует ли программа вашим целям и возможностям.
      </p>
      <CtaLink />
      <p className="mt-3 text-[0.7rem] text-ink-faint">
        Кнопка откроет Telegram: напишите Анастасии — она пришлёт полную программу и договорится
        о времени знакомства.
      </p>
    </section>
  );
}
