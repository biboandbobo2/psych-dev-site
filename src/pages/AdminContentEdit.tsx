import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, deleteField, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { DEFAULT_THEME } from "../theme/periods";
import { ROUTE_BY_PERIOD } from "../routes";
import { normalizeText } from "../utils/contentHelpers";

interface Period {
  period: string;
  title: string;
  subtitle: string;
  published: boolean;
  order: number;
  accent: string;
  accent100: string;
  placeholder_enabled?: boolean;
  [key: string]: any;
}

interface VideoFormEntry {
  id: string;
  title: string;
  url: string;
  deckUrl: string;
  audioUrl: string;
}

interface ListItem {
  title?: string;
  name?: string;
  url?: string;
}

interface EditableListProps {
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  label: string;
  placeholder: string;
  maxItems?: number;
  showUrl?: boolean;
}

function EditableList({ items, onChange, label, placeholder, maxItems = 10, showUrl = true }: EditableListProps) {
  const addItem = () => {
    if (items.length < maxItems) {
      onChange([...items, showUrl ? { title: "", url: "" } : { name: "" }]);
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <label className="text-sm font-medium">{label}</label>
        {items.length < maxItems && (
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Добавить
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500 italic py-2">Нет элементов. Нажмите "+ Добавить"</div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-start">
              <span className="text-gray-400 text-sm font-mono mt-2">{index + 1}.</span>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={item.title ?? item.name ?? ""}
                  onChange={(event) => updateItem(index, item.title !== undefined ? "title" : "name", event.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  style={SELECTABLE_TEXT_STYLE}
                />
                {showUrl && (
                  <input
                    type="url"
                    value={item.url ?? ""}
                    onChange={(event) => updateItem(index, "url", event.target.value)}
                    placeholder="https://... (необязательно)"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    style={SELECTABLE_TEXT_STYLE}
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="mt-2 text-red-600 hover:text-red-700 text-sm"
                title="Удалить"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SimpleListProps {
  items: string[];
  onChange: (items: string[]) => void;
  label: string;
  placeholder: string;
  maxItems?: number;
}

function SimpleList({ items, onChange, label, placeholder, maxItems = 10 }: SimpleListProps) {
  const addItem = () => {
    if (items.length < maxItems) {
      onChange([...items, ""]);
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <label className="text-sm font-medium">{label}</label>
        {items.length < maxItems && (
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Добавить
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500 italic py-2">Нет элементов. Нажмите "+ Добавить"</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-center">
              <span className="text-gray-400 text-sm font-mono">{index + 1}.</span>
              <input
                type="text"
                value={item}
                onChange={(event) => updateItem(index, event.target.value)}
                placeholder={placeholder}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                style={SELECTABLE_TEXT_STYLE}
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-red-600 hover:text-red-700 text-sm"
                title="Удалить"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SELECTABLE_TEXT_STYLE: CSSProperties = {
  WebkitUserSelect: "text",
  MozUserSelect: "text",
  msUserSelect: "text",
  userSelect: "text",
};

function createEmptyVideoEntry(seed: number, defaultTitle: string): VideoFormEntry {
  return {
    id: `video-${seed}-${Date.now()}`,
    title: defaultTitle,
    url: '',
    deckUrl: '',
    audioUrl: '',
  };
}

function createVideoEntryFromSource(
  source: any,
  index: number,
  fallbackTitle: string
): VideoFormEntry {
  const rawTitle =
    (typeof source?.title === 'string' && source.title.trim()) ||
    (typeof source?.label === 'string' && source.label.trim()) ||
    fallbackTitle;
  const rawUrl =
    (typeof source?.url === 'string' && source.url.trim()) ||
    (typeof source?.videoUrl === 'string' && source.videoUrl.trim()) ||
    '';
  const rawDeck =
    (typeof source?.deckUrl === 'string' && source.deckUrl.trim()) ||
    (typeof source?.deck_url === 'string' && source.deck_url.trim()) ||
    '';
  const rawAudio =
    (typeof source?.audioUrl === 'string' && source.audioUrl.trim()) ||
    (typeof source?.audio_url === 'string' && source.audio_url.trim()) ||
    '';

  return {
    id: `video-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: rawTitle,
    url: rawUrl,
    deckUrl: rawDeck,
    audioUrl: rawAudio,
  };
}

function normalizeEmbedUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) return trimmed;
  if (trimmed.includes('embed/')) return trimmed;
  if (trimmed.includes('watch?v=')) return trimmed.replace('watch?v=', 'embed/');
  return trimmed;
}

interface VideoPlaylistEditorProps {
  items: VideoFormEntry[];
  onChange: (items: VideoFormEntry[]) => void;
  defaultTitle: string;
}

function VideoPlaylistEditor({ items, onChange, defaultTitle }: VideoPlaylistEditorProps) {
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
                    <p className="text-xs text-gray-500">Заполните ссылку на YouTube и дополнительные материалы.</p>
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

export default function AdminContentEdit() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const routeConfig = periodId ? ROUTE_BY_PERIOD[periodId] : undefined;
  const placeholderDefaultEnabled = routeConfig?.placeholderDefaultEnabled ?? false;
  const placeholderDisplayText =
    routeConfig?.placeholderText || 'Контент для этого возраста появится в ближайшем обновлении.';

  const normalizedPlaceholderText = normalizeText(placeholderDisplayText);

  const [period, setPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [published, setPublished] = useState(true);
  const [order, setOrder] = useState(0);
  const [accent, setAccent] = useState(DEFAULT_THEME.accent);
  const [accent100, setAccent100] = useState(DEFAULT_THEME.accent100);
  const [placeholderEnabled, setPlaceholderEnabled] = useState(placeholderDefaultEnabled);
  const [videos, setVideos] = useState<VideoFormEntry[]>([]);
  const [concepts, setConcepts] = useState<string[]>([]);
  const [authors, setAuthors] = useState<Array<{ name: string; url?: string }>>([]);
  const [coreLiterature, setCoreLiterature] = useState<Array<{ title: string; url: string }>>([]);
  const [extraLiterature, setExtraLiterature] = useState<Array<{ title: string; url: string }>>([]);
  const [extraVideos, setExtraVideos] = useState<Array<{ title: string; url: string }>>([]);
  const [selfQuestionsUrl, setSelfQuestionsUrl] = useState("");

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Название обязательно!");
      return;
    }

    try {
      setSaving(true);

      const normalizedConcepts = concepts.map((concept) => concept.trim()).filter(Boolean);
      const normalizedAuthors = authors
        .map((author) => {
          const name = author.name?.trim();
          const url = author.url?.trim();
          if (!name) return null;
          return url ? { name, url } : { name };
        })
        .filter((author): author is { name: string; url?: string } => Boolean(author));
      const normalizedCoreLiterature = coreLiterature
        .map((item) => {
          const title = item.title?.trim();
          const url = item.url?.trim();
          if (!title || !url) return null;
          return { title, url };
        })
        .filter((item): item is { title: string; url: string } => Boolean(item));
      const normalizedExtraLiterature = extraLiterature
        .map((item) => {
          const title = item.title?.trim();
          const url = item.url?.trim();
          if (!title || !url) return null;
          return { title, url };
        })
        .filter((item): item is { title: string; url: string } => Boolean(item));
      const normalizedExtraVideos = extraVideos
        .map((item) => {
          const title = item.title?.trim();
          const url = item.url?.trim();
          if (!title || !url) return null;
          return { title, url };
        })
        .filter((item): item is { title: string; url: string } => Boolean(item));

      const trimmedTitle = title.trim();
      const normalizedVideos = videos
        .map((video) => ({
          title: video.title.trim(),
          url: video.url.trim(),
          deckUrl: video.deckUrl.trim(),
          audioUrl: video.audioUrl.trim(),
        }))
        .filter((video) => Boolean(video.url));
      const trimmedSelfQuestionsUrl = selfQuestionsUrl.trim();

      const data: Record<string, unknown> = {
        period: periodId,
        title: trimmedTitle,
        published,
        order,
        accent,
        accent100,
        placeholder_enabled: placeholderEnabled,
        concepts: normalizedConcepts,
        authors: normalizedAuthors,
        core_literature: normalizedCoreLiterature,
        extra_literature: normalizedExtraLiterature,
        extra_videos: normalizedExtraVideos,
        status: published ? 'published' : 'draft',
        updatedAt: serverTimestamp(),
      };

      if (placeholderEnabled && normalizedPlaceholderText.length) {
        data.placeholder = normalizedPlaceholderText;
        data.placeholder_text = normalizedPlaceholderText;
        data.placeholderText = normalizedPlaceholderText;
      } else {
        data.placeholder = deleteField();
        data.placeholder_text = deleteField();
        data.placeholderText = deleteField();
      }

      const primaryVideo = normalizedVideos[0];

      data.video_url = primaryVideo?.url ? primaryVideo.url : deleteField();
      data.deck_url = primaryVideo?.deckUrl ? primaryVideo.deckUrl : deleteField();
      data.audio_url = primaryVideo?.audioUrl ? primaryVideo.audioUrl : deleteField();
      data.self_questions_url = trimmedSelfQuestionsUrl ? trimmedSelfQuestionsUrl : deleteField();

      const trimmedSubtitle = subtitle.trim();
      data.subtitle = trimmedSubtitle ? trimmedSubtitle : deleteField();

      if (normalizedVideos.length) {
        data.video_playlist = normalizedVideos.map((video) => ({
          title: video.title || trimmedTitle || "Видео-лекция",
          url: video.url,
          ...(video.deckUrl ? { deckUrl: video.deckUrl } : {}),
          ...(video.audioUrl ? { audioUrl: video.audioUrl } : {}),
        }));
      } else {
        data.video_playlist = deleteField();
      }

      if (periodId === "intro") {
        const singletonRef = doc(db, "intro", "singleton");
        const singletonSnap = await getDoc(singletonRef);
        if (singletonSnap.exists()) {
          await setDoc(singletonRef, data, { merge: true });
        } else {
          const introCol = collection(db, "intro");
          const introSnap = await getDocs(introCol);
          if (!introSnap.empty) {
            await setDoc(introSnap.docs[0].ref, data, { merge: true });
          } else {
            await setDoc(singletonRef, data, { merge: true });
          }
        }
      } else {
        const docRef = doc(db, "periods", periodId!);
        await setDoc(docRef, data, { merge: true });
      }

      alert("✅ Изменения сохранены!");
      navigate("/admin/content");
    } catch (error: any) {
      console.error("Error saving:", error);
      alert("❌ Ошибка сохранения: " + (error?.message || error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (periodId === "intro") {
      alert("⚠️ Вводное занятие нельзя удалить, только редактировать.");
      return;
    }

    const confirmed = window.confirm(
      `Вы уверены что хотите удалить период "${title}"?\n\n` +
        "Это действие нельзя отменить!"
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      const docRef = doc(db, "periods", periodId!);
      await deleteDoc(docRef);
      alert("🗑️ Период удалён");
      navigate("/admin/content");
    } catch (error: any) {
      console.error("Error deleting:", error);
      alert("❌ Ошибка удаления: " + (error?.message || error));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    async function loadPeriod() {
      if (!periodId) return;

      try {
        setLoading(true);
        let snapshot;

        if (periodId === "intro") {
          const singletonRef = doc(db, "intro", "singleton");
          const singletonSnap = await getDoc(singletonRef);
          if (singletonSnap.exists()) {
            snapshot = singletonSnap;
          } else {
            const introCol = collection(db, "intro");
            const introSnap = await getDocs(introCol);
            if (!introSnap.empty) {
              snapshot = introSnap.docs[0];
            }
          }
        } else {
          snapshot = await getDoc(doc(db, "periods", periodId));
        }

        if (!snapshot || !snapshot.exists()) {
          alert("Период не найден");
          navigate("/admin/content");
          return;
        }

        const data = { ...(snapshot.data() as Period), period: periodId };
        setPeriod(data);

        setTitle(data.title || "");
        setSubtitle(data.subtitle || "");
        setPublished(data.published ?? true);
        setOrder(typeof data.order === "number" ? data.order : 0);
        setAccent(data.accent || DEFAULT_THEME.accent);
        setAccent100(data.accent100 || DEFAULT_THEME.accent100);
        setPlaceholderEnabled(
          typeof data.placeholder_enabled === "boolean"
            ? data.placeholder_enabled
            : placeholderDefaultEnabled
        );
        const playlist = Array.isArray(data.video_playlist) ? data.video_playlist : [];
        if (playlist.length) {
          setVideos(
            playlist.map((entry, index) =>
              createVideoEntryFromSource(entry, index, data.title || placeholderDisplayText)
            )
          );
        } else {
          const fallbackVideoUrl =
            (typeof data.video_url === "string" && data.video_url.trim()) ||
            (typeof (data as any).videoUrl === "string" && (data as any).videoUrl.trim()) ||
            "";

          if (fallbackVideoUrl) {
            setVideos([
              createVideoEntryFromSource(
                {
                  title: data.title,
                  url: fallbackVideoUrl,
                  deckUrl: data.deck_url || (data as any).deckUrl,
                  audioUrl: data.audio_url || (data as any).audioUrl,
                },
                0,
                data.title || placeholderDisplayText
              ),
            ]);
          } else {
            setVideos([createEmptyVideoEntry(0, data.title || placeholderDisplayText)]);
          }
        }
        setConcepts(data.concepts || []);
        setAuthors(data.authors || []);
        setCoreLiterature(data.core_literature || []);
        setExtraLiterature(data.extra_literature || []);
        setExtraVideos(data.extra_videos || []);
        setSelfQuestionsUrl(data.self_questions_url || "");
      } catch (error: any) {
        console.error("Error loading period", error);
        alert("Ошибка загрузки: " + (error?.message || error));
      } finally {
        setLoading(false);
      }
    }

    loadPeriod();
  }, [periodId, navigate, placeholderDefaultEnabled]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p>Период не найден</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/content" className="text-gray-600 hover:text-gray-900 text-2xl">
          ←
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {periodId === "intro" ? "✨ Вводное занятие" : `Редактирование: ${period.title}`}
          </h1>
          <p className="text-gray-600 text-sm mt-1">ID: {periodId}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold">📋 Основная информация</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название *</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={SELECTABLE_TEXT_STYLE}
              placeholder="Пренатальный период"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Подзаголовок</label>
            <input
              type="text"
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={SELECTABLE_TEXT_STYLE}
              placeholder="Дополнительное описание (необязательно)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Порядок отображения</label>
            <input
              type="number"
              value={order}
              min={0}
              onChange={(event) => setOrder(parseInt(event.target.value, 10) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={SELECTABLE_TEXT_STYLE}
            />
            <p className="text-xs text-gray-500 mt-1">Меньшее число — выше в списке</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published"
              checked={published}
              onChange={(event) => setPublished(event.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="published" className="text-sm font-medium cursor-pointer">
              Опубликовано (видно студентам)
            </label>
          </div>
          <p className="text-xs text-gray-500 max-w-prose">
            При отключении период скрывается из меню и недоступен студентам, но вы можете продолжать редактирование. Включите, когда материалы готовы.
          </p>

          {periodId !== "intro" && (
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="placeholderEnabled"
                checked={placeholderEnabled}
                onChange={(event) => setPlaceholderEnabled(event.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <label htmlFor="placeholderEnabled" className="text-sm font-medium cursor-pointer">
                  Показывать заглушку «Скоро обновление»
                </label>
                <p className="text-xs text-gray-500 mt-1 max-w-prose">
                  Когда заглушка включена, пользователи увидят сообщение:
                  {" "}
                  <em>“{placeholderDisplayText}”</em> вместо контента раздела.
                  Отключите, когда материалы готовы к публикации.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold">🎨 Цвета темы</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Основной цвет (accent)</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={accent}
                onChange={(event) => setAccent(event.target.value)}
                className="w-16 h-10 border rounded cursor-pointer"
              />
              <input
                type="text"
                value={accent}
                onChange={(event) => setAccent(event.target.value)}
                className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                style={SELECTABLE_TEXT_STYLE}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Светлый вариант (accent100)</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={accent100}
                onChange={(event) => setAccent100(event.target.value)}
                className="w-16 h-10 border rounded cursor-pointer"
              />
              <input
                type="text"
                value={accent100}
                onChange={(event) => setAccent100(event.target.value)}
                className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                style={SELECTABLE_TEXT_STYLE}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 p-4 rounded" style={{ backgroundColor: accent100 }}>
          <p className="font-medium" style={{ color: accent }}>
            Пример текста с выбранными цветами
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold">🎥 Видео-лекция</h2>
        <VideoPlaylistEditor
          items={videos}
          onChange={setVideos}
          defaultTitle={title.trim() || placeholderDisplayText}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold">💡 Понятия</h2>
        <SimpleList
          items={concepts}
          onChange={setConcepts}
          label="Ключевые понятия периода"
          placeholder="Введите понятие"
          maxItems={10}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-2">
        <h2 className="text-xl font-bold">👤 Ключевые авторы</h2>
        <EditableList
          items={authors}
          onChange={(items) => setAuthors(items as Array<{ name: string; url?: string }>)}
          label="Авторы исследований"
          placeholder="Имя автора"
          maxItems={10}
          showUrl={true}
        />
        <p className="text-xs text-gray-500">URL необязателен — можно указать только имя</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">📚 Основная литература</h2>
        <EditableList
          items={coreLiterature}
          onChange={(items) => setCoreLiterature(items as Array<{ title: string; url: string }>)}
          label="Обязательная литература для периода"
          placeholder="Название книги/статьи"
          maxItems={10}
          showUrl={true}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">📖 Дополнительная литература</h2>
        <EditableList
          items={extraLiterature}
          onChange={(items) => setExtraLiterature(items as Array<{ title: string; url: string }>)}
          label="Дополнительные материалы для изучения"
          placeholder="Название материала"
          maxItems={10}
          showUrl={true}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">🎬 Дополнительные видео</h2>
        <EditableList
          items={extraVideos}
          onChange={(items) => setExtraVideos(items as Array<{ title: string; url: string }>)}
          label="Дополнительные видео-материалы"
          placeholder="Название видео"
          maxItems={10}
          showUrl={true}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-2">
        <h2 className="text-xl font-bold">✏️ Вопросы для самопроверки</h2>
        <label className="block text-sm font-medium mb-2">Ссылка на квиз/рабочую тетрадь</label>
        <input
          type="url"
          value={selfQuestionsUrl}
          onChange={(event) => setSelfQuestionsUrl(event.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          style={SELECTABLE_TEXT_STYLE}
        />
        {selfQuestionsUrl && (
          <a
            href={selfQuestionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm text-blue-600 hover:underline"
          >
            🔗 Открыть материал
          </a>
        )}
      </div>

      <div className="flex justify-between items-center bg-white rounded-lg shadow p-6">
        <div className="flex gap-3">
          <Link
            to="/admin/content"
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            ← Назад
          </Link>
          {periodId !== "intro" && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              🗑️ Удалить период
            </button>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="px-8 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {saving ? "💾 Сохранение..." : "💾 Сохранить изменения"}
        </button>
      </div>

      {periodId === "intro" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ℹ️ <strong>Вводное занятие</strong> нельзя удалить, только редактировать.
          </p>
        </div>
      )}
    </div>
  );
}
