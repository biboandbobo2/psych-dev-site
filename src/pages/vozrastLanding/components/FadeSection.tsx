import { useEffect, useRef } from 'react';

interface FadeSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * Секция, появляющаяся при прокрутке.
 * Progressive enhancement: контент видим по умолчанию; скрывающий класс
 * vz-fade-init добавляется только после успешного создания
 * IntersectionObserver и вне prefers-reduced-motion, поэтому при ошибке JS
 * или переходе по якорю секция не остаётся невидимой.
 */
export function FadeSection({ children, className = '', id }: FadeSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove('vz-fade-init');
          el.classList.add('vz-visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );
    el.classList.add('vz-fade-init');
    observer.observe(el);
    return () => {
      observer.disconnect();
      el.classList.remove('vz-fade-init');
    };
  }, []);

  return (
    <div ref={ref} id={id} className={`vz-fade ${className}`}>
      {children}
    </div>
  );
}
