import type { ReactNode } from 'react';
import { CTA_TEXT, TG_LINK } from './data';

export const PANEL =
  'overflow-hidden rounded-[26px] border border-border-cool max-[420px]:rounded-[20px]';
export const EYEBROW =
  'mb-3 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-accent-muted';
export const SECTION_PAD = 'px-[clamp(1.2rem,5vw,3.15rem)] py-[clamp(2.1rem,6vw,3.9rem)] max-[420px]:px-4';
export const H2 = 'font-display text-[clamp(1.9rem,4.6vw,2.8rem)] font-medium leading-[1.05]';
export const BODY_TEXT = 'text-[0.85rem] leading-[1.62] text-ink-soft';

const BUTTON =
  'inline-flex min-h-[44px] items-center justify-center rounded-[11px] px-[1.3rem] py-[0.7rem] text-[0.8rem] font-bold transition hover:-translate-y-px';

export function CtaLink({ children, secondary }: { children?: ReactNode; secondary?: boolean }) {
  return (
    <a
      href={TG_LINK}
      target="_blank"
      rel="noopener noreferrer"
      data-track-click="cta-telegram"
      className={
        secondary
          ? `${BUTTON} border border-accent/40 bg-white text-accent`
          : `${BUTTON} bg-accent text-white shadow-[0_8px_20px_rgb(46_125_50/0.14)]`
      }
    >
      {children ?? CTA_TEXT}
    </a>
  );
}

export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 className={H2}>{title}</h2>
    </div>
  );
}
