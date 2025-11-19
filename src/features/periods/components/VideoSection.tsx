import { Section } from '../../../components/ui/Section';
import { isUrlString, normalizeVideoEntry } from '../utils/media';

interface VideoSectionProps {
  slug: string;
  title: string;
  content: any[];
  deckUrl: string;
  defaultVideoTitle: string;
}

export function VideoSection({ slug, title, content, deckUrl, defaultVideoTitle }: VideoSectionProps) {
  const videos = content.map((entry, index) => {
    const normalized = normalizeVideoEntry(entry);
    const effectiveDeckUrl = normalized.deckUrl || deckUrl;
    return {
      ...normalized,
      deckUrl: effectiveDeckUrl,
      key: `${slug}-video-${index}`,
    };
  });

  const showVideoHeadings =
    videos.length > 1 ||
    videos.some(
      (video) =>
        video.title &&
        video.title.trim().length > 0 &&
        video.title.trim().toLowerCase() !== defaultVideoTitle.toLowerCase()
    );

  if (!videos.length) {
    return null;
  }

  return (
    <Section key={slug} title={title}>
      <div className="space-y-6">
        {videos.map(
          ({ key, title: videoTitle, embedUrl, originalUrl, isYoutube, deckUrl: videoDeckUrl, audioUrl }) => {
            if (!embedUrl) {
              const isPlaylist = isUrlString(originalUrl) && originalUrl.includes('list=');
              return (
                <div key={key} className="space-y-3">
                  <p className="text-lg leading-8 text-muted">
                    {isPlaylist ? (
                      <>
                        Это плейлист YouTube — встраивание недоступно.{' '}
                        <a className="text-accent no-underline hover:no-underline focus-visible:no-underline" href={originalUrl} target="_blank" rel="noreferrer">
                          Открыть плейлист на YouTube
                        </a>
                      </>
                    ) : (
                      <>
                        Видео недоступно для встраивания.{' '}
                        {isUrlString(originalUrl) ? (
                          <a className="text-accent no-underline hover:no-underline focus-visible:no-underline" href={originalUrl} target="_blank" rel="noreferrer">
                            Открыть на YouTube
                          </a>
                        ) : (
                          'Проверьте URL.'
                        )}
                      </>
                    )}
                  </p>
                </div>
              );
            }

            return (
              <div key={key} className="space-y-3">
                {showVideoHeadings && videoTitle ? (
                  <h3 className="text-2xl font-semibold leading-tight text-fg">{videoTitle}</h3>
                ) : null}
                <iframe
                  title={videoTitle}
                  src={embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="w-full aspect-video rounded-2xl border border-border shadow-brand"
                />
                {videoDeckUrl || audioUrl ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {videoDeckUrl ? (
                      <a
                        className="inline-block text-sm font-semibold italic text-[color:var(--accent)] no-underline hover:no-underline focus-visible:no-underline"
                        href={videoDeckUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Скачать презентацию
                      </a>
                    ) : null}
                    {audioUrl ? (
                      <a
                        className="inline-block text-sm font-semibold italic text-[color:var(--accent)] no-underline hover:no-underline focus-visible:no-underline ml-auto"
                        href={audioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Слушать аудио
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {!isYoutube && isUrlString(originalUrl) ? (
                  <p className="text-sm leading-6 text-muted">
                    Ссылка не похожа на YouTube. Проверить источник:{' '}
                    <a className="text-accent no-underline hover:no-underline focus-visible:no-underline" href={originalUrl} target="_blank" rel="noreferrer">
                      {originalUrl}
                    </a>
                  </p>
                ) : null}
              </div>
            );
          }
        )}
      </div>
    </Section>
  );
}
