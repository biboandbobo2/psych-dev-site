import { useEffect, useRef } from 'react';

interface FadeSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/** Секция, появляющаяся при прокрутке (vz-fade → vz-visible). */
export function FadeSection({ children, className = '', id }: FadeSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('vz-visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} id={id} className={`vz-fade ${className}`}>
      {children}
    </div>
  );
}
