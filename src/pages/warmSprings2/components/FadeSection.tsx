import { useEffect, useRef } from 'react';

interface FadeSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * Секция лендинга, появляющаяся через IntersectionObserver
 * (CSS-классы ws2-fade / ws2-visible переключаются автоматически).
 *
 * При создании нового лендинга стоит вынести IntersectionObserver
 * в общий хук и сделать класс параметром.
 */
export function FadeSection({ children, className = '', id }: FadeSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('ws2-visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} id={id} className={`ws2-fade ${className}`}>
      {children}
    </div>
  );
}
