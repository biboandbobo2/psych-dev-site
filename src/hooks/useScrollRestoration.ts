import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export function useScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positionsRef = useRef(new Map<string, number>());

  // Keep browser auto-restoration out of the way so the app controls SPA scroll consistently.
  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return;

    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const key = location.key || location.pathname;
    const positions = positionsRef.current;
    return () => {
      positions.set(key, window.scrollY);
    };
  }, [location]);

  useLayoutEffect(() => {
    const key = location.key || location.pathname;
    const stored = positionsRef.current.get(key);
    if (navigationType === 'POP' && typeof stored === 'number') {
      window.scrollTo(0, stored);
      return;
    }
    // Якорная навигация: ведём к элементу, а не к верху страницы.
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location, navigationType]);
}
