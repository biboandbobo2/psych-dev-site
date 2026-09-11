import { useRef, useState } from 'react';
import type { IconSummary, ImageDetail } from '../types';
import { imageUrl } from '../lib/catalog';

/** Ниже этой ширины исходник растягивать нельзя: увеличение даёт мыло, а не детали. */
const SMALL_SOURCE_WIDTH = 400;

export function Artwork({ icon, priority = false, alt, zoom = false, detail, sizes = '(max-width: 640px) 90vw, (max-width: 1000px) 50vw, 600px' }: {
  icon: IconSummary; priority?: boolean; alt?: string; zoom?: boolean; detail?: ImageDetail; sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [scale, setScale] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pan = useRef<HTMLDivElement>(null);
  const changeScale = (next: number) => {
    setScale(next);
    requestAnimationFrame(() => {
      const pane = pan.current;
      if (pane) pane.scrollTo((pane.scrollWidth - pane.clientWidth) / 2, (pane.scrollHeight - pane.clientHeight) / 2);
    });
  };
  const description = alt ?? icon.title;
  const widths = icon.image.widths;
  const largest = widths.at(-1)!;
  const small = icon.image.width < SMALL_SOURCE_WIDTH;
  const picture = <span className="ico-artwork-plane" style={small ? { maxWidth: `${icon.image.width}px` } : undefined}>
    <img src={imageUrl(icon.id, widths[1] ?? widths[0])}
      srcSet={widths.map((w) => `${imageUrl(icon.id, w)} ${w}w`).join(', ')}
      sizes={sizes}
      width={icon.image.width} height={icon.image.height} alt={description}
      loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'}
      decoding="async" onError={() => setFailed(true)} />
    {detail && <svg className="ico-detail-mark" viewBox={`0 0 ${icon.image.width} ${icon.image.height}`} role="img" aria-label={detail.label}>
      <rect x={detail.x * icon.image.width} y={detail.y * icon.image.height} width={detail.width * icon.image.width} height={detail.height * icon.image.height} rx="12" />
    </svg>}
  </span>;
  const artworkClass = `ico-artwork${small ? ' ico-artwork-small' : ''}`;

  if (failed) return <div className="ico-image-error" role="status">Изображение не загрузилось.
    <button className="ico-link" onClick={() => setFailed(false)}>Повторить загрузку</button></div>;
  return <>
    {zoom ? <button className={`${artworkClass} ico-zoom-trigger`} aria-label="Рассмотреть изображение крупнее"
      onClick={() => { setZoomOpen(true); setScale(1); dialog.current?.showModal(); pan.current?.scrollTo(0, 0); }}>{picture}</button>
      : <div className={artworkClass}>{picture}</div>}
    {/* Подпись только там, где картинка занимает большой слот: в карточках каталога это был бы шум. */}
    {zoom && small && <p className="ico-small ico-artwork-note">Небольшая репродукция: показана в натуральную величину.</p>}
    {zoom && <dialog ref={dialog} onClose={() => setZoomOpen(false)} className="ico-zoom" role="dialog" aria-modal="true"
      aria-label={`Просмотр изображения с увеличением: ${icon.title}`}
      onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <div className="ico-zoom-toolbar">
        <button onClick={() => changeScale(Math.max(1, scale - .5))} disabled={scale === 1} aria-label="Уменьшить">−</button>
        <label>Масштаб <input type="range" min="1" max="4" step="0.5" value={scale} onChange={(e) => changeScale(Number(e.target.value))} /></label>
        <output>{scale * 100}%</output>
        <button onClick={() => changeScale(Math.min(4, scale + .5))} disabled={scale === 4} aria-label="Увеличить">+</button>
        <button onClick={() => dialog.current?.close()} autoFocus>Закрыть ×</button>
      </div>
      {/* Подсказка про Escape — только там, где есть клавиатура: на телефоне она сбивает с толку. */}
      <p className="ico-zoom-help">Прокручивайте изображение пальцем или стрелками.<span className="ico-zoom-keys"> Escape — закрыть.</span></p>
      <div ref={pan} className="ico-zoom-pan" tabIndex={0} role="region" aria-label="Область прокрутки изображения">
        {zoomOpen && <img src={imageUrl(icon.id, largest)} alt={description}
          style={{ width: `${scale * 100}%`, height: `${scale * 100}%`, maxWidth: 'none', maxHeight: 'none' }} />}
      </div>
      <p className="ico-zoom-help">Доступная копия: до {largest} пикселей по ширине. Увеличение не добавляет деталей.</p>
    </dialog>}
  </>;
}
