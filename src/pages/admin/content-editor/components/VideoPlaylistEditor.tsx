import type { VideoPlaylistEditorProps, VideoFormEntry } from '../types';
import { SELECTABLE_TEXT_STYLE } from '../utils/constants';
import { createEmptyVideoEntry, normalizeEmbedUrl } from '../utils/videoHelpers';

/**
 * Video playlist editor component
 */
export function VideoPlaylistEditor({ items, onChange, defaultTitle }: VideoPlaylistEditorProps) {
  const addVideo = () => {
    onChange([...items, createEmptyVideoEntry(items.length, defaultTitle)]);
  };

  const removeVideo = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const updateVideo = (id: string, field: keyof Omit<VideoFormEntry, 'id'>, value: string) => {
    onChange(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Плейлист видео</h3>
        <button
          type="button"
          onClick={addVideo}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          + Добавить видео
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
          Видео не добавлены. Нажмите «Добавить видео», чтобы указать ссылку.
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item, index) => {
            const embedUrl = normalizeEmbedUrl(item.url);
            const hasEmbed = Boolean(embedUrl);

            return (
              <div key={item.id} className="rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-base font-semibold">Видео {index + 1}</h4>
                    <p className="text-xs text-gray-500">
                      Заполните ссылку на YouTube и дополнительные материалы.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVideo(item.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                    title="Удалить видео"
                  >
                    🗑️ Удалить
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Название (необязательно)</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(event) => updateVideo(item.id, 'title', event.target.value)}
                      placeholder={defaultTitle}
                      className="w-full rounded border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      style={SELECTABLE_TEXT_STYLE}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Ссылка на видео *</label>
                    <input
                      type="url"
                      value={item.url}
                      onChange={(event) => updateVideo(item.id, 'url', event.target.value)}
                      required
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full rounded border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      style={SELECTABLE_TEXT_STYLE}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Ссылка на презентацию</label>
                    <input
                      type="url"
                      value={item.deckUrl}
                      onChange={(event) => updateVideo(item.id, 'deckUrl', event.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full rounded border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      style={SELECTABLE_TEXT_STYLE}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Ссылка на аудио</label>
                    <input
                      type="url"
                      value={item.audioUrl}
                      onChange={(event) => updateVideo(item.id, 'audioUrl', event.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full rounded border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      style={SELECTABLE_TEXT_STYLE}
                    />
                  </div>
                </div>

                {hasEmbed ? (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Предпросмотр</p>
                    <div className="aspect-video overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                      <iframe
                        title={item.title || `Видео ${index + 1}`}
                        src={embedUrl}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
