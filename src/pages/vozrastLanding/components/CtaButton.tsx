import { CTA_TEXT, TG_LINK } from '../data';

interface CtaButtonProps {
  className?: string;
  label?: string;
}

export function CtaButton({ className = '', label = CTA_TEXT }: CtaButtonProps) {
  return (
    <a href={TG_LINK} target="_blank" rel="noopener noreferrer" data-track-click="cta-price" className={`vz-btn ${className}`}>
      {label}
    </a>
  );
}
