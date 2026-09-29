import { isUrlString } from '../utils/media';

interface VideoResourceLinksProps {
  audioUrl: string;
  deckUrl: string;
  originalUrl: string;
  isYoutube: boolean;
  className?: string;
  deckLinkClassName?: string;
  audioLinkClassName?: string;
  sourceTextClassName?: string;
  sourceLinkClassName?: string;
  /** Клик по ссылке на источник не-YouTube видео — студент смотрит его вне сайта. */
  onSourceLinkClick?: () => void;
}

export function VideoResourceLinks({
  audioUrl,
  deckUrl,
  originalUrl,
  isYoutube,
  className = '',
  deckLinkClassName = '',
  audioLinkClassName = '',
  sourceTextClassName = '',
  sourceLinkClassName = '',
  onSourceLinkClick,
}: VideoResourceLinksProps) {
  if (!deckUrl && !audioUrl && (isYoutube || !isUrlString(originalUrl))) {
    return null;
  }

  return (
    <div className={className}>
      {deckUrl ? (
        <a
          className={deckLinkClassName}
          href={deckUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Скачать презентацию
        </a>
      ) : null}
      {audioUrl ? (
        <a
          className={audioLinkClassName}
          href={audioUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Слушать аудио
        </a>
      ) : null}
      {!isYoutube && isUrlString(originalUrl) ? (
        <p className={sourceTextClassName}>
          Ссылка не похожа на YouTube. Проверить источник:{' '}
          <a
            className={sourceLinkClassName}
            href={originalUrl}
            target="_blank"
            rel="noreferrer"
            onClick={onSourceLinkClick}
          >
            {originalUrl}
          </a>
        </p>
      ) : null}
    </div>
  );
}
