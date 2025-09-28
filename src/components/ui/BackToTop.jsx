import React, { useCallback } from 'react';

export function BackToTop() {
  const handleClick = useCallback((event) => {
    const anchor = document.getElementById('page-top');
    if (anchor) {
      event.preventDefault();
      if (typeof anchor.scrollIntoView === 'function') {
        anchor.scrollIntoView({ behavior: 'auto', block: 'start' });
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      window.scrollTo(0, 0);
    }

    const h1 = document.querySelector('main h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
      window.setTimeout(() => {
        if (h1.getAttribute('tabindex') === '-1') {
          h1.removeAttribute('tabindex');
        }
      }, 1000);
    }
  }, []);

  return (
    <a
      href="#page-top"
      onClick={handleClick}
      className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--accent)] border border-[color:var(--accent)] bg-[color:var(--accent-100)] shadow-sm transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--accent-100)_80%,var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
      aria-label="Наверх"
    >
      <span>наверх</span>
    </a>
  );
}
