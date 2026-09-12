import { createContext, Fragment, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, MouseEvent, PointerEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { GlossaryTerm } from '../types';
import { loadGlossary } from '../lib/catalog';
import { markTerms } from '../lib/glossary';

interface GlossaryState { terms: GlossaryTerm[]; open: string; setOpen: (id: string) => void }

const GlossaryContext = createContext<GlossaryState>({ terms: [], open: '', setOpen: () => {} });

/** Без провайдера (и без файла терминов) тексты рендерятся как раньше, просто без пояснений. */
export function GlossaryProvider({ children }: { children: ReactNode }) {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [open, setOpen] = useState('');

  useEffect(() => {
    let alive = true;
    loadGlossary().then((list) => { if (alive) setTerms(list); }).catch(() => { /* пояснения необязательны */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(''); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  const value = useMemo(() => ({ terms, open, setOpen }), [terms, open]);
  return <GlossaryContext.Provider value={value}>{children}</GlossaryContext.Provider>;
}

/** Ширина и положение считаются от кнопки: на 390 px подсказка не должна уезжать за край. */
function tipStyle(button: HTMLElement | null): CSSProperties {
  if (!button || typeof window === 'undefined') return {};
  const rect = button.getBoundingClientRect();
  const width = Math.min(320, window.innerWidth - 24);
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), Math.max(12, window.innerWidth - width - 12));
  const above = rect.bottom + 190 > window.innerHeight && rect.top > 190;
  return above
    ? { left, width, top: rect.top - 8, transform: 'translateY(-100%)' }
    : { left, width, top: rect.bottom + 8 };
}

export function Term({ term, children }: { term: GlossaryTerm; children: string }) {
  const { open, setOpen } = useContext(GlossaryContext);
  const id = useId();
  const wrap = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const shown = open === id;
  const [style, setStyle] = useState<CSSProperties>({});

  const place = useCallback(() => setStyle(tipStyle(button.current)), []);

  useLayoutEffect(() => {
    if (!shown) return;
    place();
    // Подсказка позиционируется от окна, поэтому при прокрутке её нужно пересчитать.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [shown, place]);

  const enter = (event: PointerEvent) => { if (event.pointerType === 'mouse') setOpen(id); };
  const leave = (event: PointerEvent) => {
    // На телефоне подсказку закрывает повторный тап, а не увод пальца.
    if (event.pointerType !== 'mouse') return;
    if (wrap.current?.contains(document.activeElement)) return;
    if (shown) setOpen('');
  };
  const blur = (event: FocusEvent) => {
    if (event.relatedTarget instanceof Node && wrap.current?.contains(event.relatedTarget)) return;
    if (shown) setOpen('');
  };
  // Нажатие внутри подсказки не должно уводить фокус с кнопки: иначе она закроется до клика по ссылке.
  const hold = (event: MouseEvent) => event.preventDefault();

  return (
    <span className="ico-term-wrap" ref={wrap} onPointerLeave={leave} onBlur={blur}>
      <button
        type="button"
        ref={button}
        className="ico-term"
        aria-expanded={shown}
        aria-describedby={shown ? `${id}-tip` : undefined}
        onClick={() => setOpen(shown ? '' : id)}
        onFocus={() => setOpen(id)}
        onPointerEnter={enter}
      >{children}</button>
      {shown && (
        <span role="tooltip" id={`${id}-tip`} className="ico-term-tip" style={style} onMouseDown={hold}>
          <b>{term.term}</b>
          {term.definition}
          <Link className="ico-link" to={`/iconography/glossary#${term.id}`}>В глоссарии →</Link>
        </span>
      )}
    </span>
  );
}

/** Текст с пунктирным подчёркиванием терминов глоссария. Оборачивает только строки. */
export function WithGlossary({ text }: { text: string }) {
  const { terms } = useContext(GlossaryContext);
  const segments = useMemo(() => markTerms(text, terms), [text, terms]);
  return (
    <>
      {segments.map((segment, index) => (segment.term
        ? <Term key={index} term={segment.term}>{segment.text}</Term>
        : <Fragment key={index}>{segment.text}</Fragment>))}
    </>
  );
}
