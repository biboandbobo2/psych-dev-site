import { CTA_TEXT, TG_LINK } from '../data';

interface CtaButtonProps {
  className?: string;
}

export function CtaButton({ className = '' }: CtaButtonProps) {
  return (
    <a
      href={TG_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className={`ws2-btn ${className}`}
    >
      {CTA_TEXT}
    </a>
  );
}
