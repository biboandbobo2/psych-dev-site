import { useState, useEffect } from "react";
import type { Period } from "../types/content";
import { getAllPeriods, getPublishedPeriods, getPeriod, getIntro } from "../lib/firestoreHelpers";

type PeriodSection = {
  title: string;
  content: any[];
};

const SECTION_TITLES: Record<string, string> = {
  video: "Видео-лекция",
  concepts: "Понятия",
  authors: "Ключевые авторы",
  core_literature: "Основная литература",
  extra_literature: "Дополнительная литература",
  extra_videos: "Дополнительные видео и лекции",
  leisure: "Досуговое",
  self_questions: "Вопросы для контакта с собой",
};

const trim = (value?: string | null) => (typeof value === "string" ? value.trim() : "");

function mapVideoEntries(period: Period, fallbackTitle: string, fallbackDeckUrl: string) {
  const playlist = Array.isArray(period.video_playlist) ? period.video_playlist : [];
  const entries = playlist
    .map((item, index) => {
      if (!item) return null;
      if (typeof item === "string") {
        const url = trim(item);
        if (!url) return null;
        return {
          key: `video-${index}`,
          title: fallbackTitle,
          url,
          deckUrl: fallbackDeckUrl,
          audioUrl: "",
        };
      }
      const url = trim(
        (item as any).url ?? (item as any).videoUrl ?? (item as any).src ?? (item as any).embedUrl
      );
      if (!url) return null;
      const title = trim((item as any).title ?? (item as any).label) || fallbackTitle;
      const deckUrl = trim((item as any).deckUrl ?? (item as any).deck_url) || fallbackDeckUrl;
      const audioUrl = trim((item as any).audioUrl ?? (item as any).audio_url);
      return {
        key: `video-${index}`,
        title,
        url,
        deckUrl,
        audioUrl,
      };
    })
    .filter(Boolean) as Array<{ title: string; url: string; deckUrl?: string; audioUrl?: string }>;

  if (entries.length) return entries;

  const fallbackUrl = trim(period.video_url);
  if (!fallbackUrl) return [];

  return [
    {
      title: fallbackTitle,
      url: fallbackUrl,
      deckUrl: fallbackDeckUrl,
      audioUrl: trim((period as any).audio_url),
    },
  ];
}

function buildSections(period: Period, label: string, deckUrl: string) {
  const sections: Record<string, PeriodSection> = {};
  const videoEntries = mapVideoEntries(period, label || "Видео-лекция", deckUrl);
  if (videoEntries.length) {
    sections.video = { title: SECTION_TITLES.video, content: videoEntries };
  }
  if (Array.isArray(period.concepts) && period.concepts.length) {
    sections.concepts = { title: SECTION_TITLES.concepts, content: period.concepts.slice() };
  }
  if (Array.isArray(period.authors) && period.authors.length) {
    sections.authors = { title: SECTION_TITLES.authors, content: period.authors.slice() };
  }
  if (Array.isArray(period.core_literature) && period.core_literature.length) {
    sections.core_literature = {
      title: SECTION_TITLES.core_literature,
      content: period.core_literature.slice(),
    };
  }
  if (Array.isArray(period.extra_literature) && period.extra_literature.length) {
    sections.extra_literature = {
      title: SECTION_TITLES.extra_literature,
      content: period.extra_literature.slice(),
    };
  }
  if (Array.isArray(period.extra_videos) && period.extra_videos.length) {
    sections.extra_videos = {
      title: SECTION_TITLES.extra_videos,
      content: period.extra_videos.slice(),
    };
  }
  if (Array.isArray(period.leisure) && period.leisure.length) {
    sections.leisure = {
      title: SECTION_TITLES.leisure,
      content: period.leisure.slice(),
    };
  }
  const selfQuestionsUrl = trim(period.self_questions_url);
  if (selfQuestionsUrl) {
    sections.self_questions = {
      title: SECTION_TITLES.self_questions,
      content: [selfQuestionsUrl],
    };
  }
  return sections;
}

function mapFirestorePeriod(period: Period): Period {
  const label = trim(period.title) || period.period;
  const deckUrl = trim(period.deck_url);
  const placeholderText =
    trim((period as any).placeholder_text) || trim(period.placeholderText) || undefined;

  return {
    ...period,
    label,
    deckUrl,
    selfQuestionsUrl: trim(period.self_questions_url),
    placeholderEnabled:
      typeof period.placeholder_enabled === "boolean" ? period.placeholder_enabled : undefined,
    placeholderText,
    sections: buildSections(period, label, deckUrl),
  };
}

export function usePeriods(publishedOnly: boolean = false) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPeriods = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = publishedOnly ? await getPublishedPeriods() : await getAllPeriods();
        const mapped = data.map(mapFirestorePeriod);

        if (!mapped.some((item) => item.period === 'intro')) {
          const introData = await getIntro();
          if (introData) {
            mapped.unshift(
              mapFirestorePeriod({
                ...(introData as Period),
                period: 'intro',
                order: Number.MIN_SAFE_INTEGER,
              })
            );
          }
        }

        setPeriods(mapped);
      } catch (err: any) {
        console.error("Error loading periods:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPeriods();
  }, [publishedOnly]);

  return { periods, loading, error, refresh: () => {} };
}
