import { useEffect, useMemo, useState } from 'react';
import { getPublishedPeriods } from './firestoreHelpers';

const trim = (value) => (typeof value === 'string' ? value.trim() : '');

const mapFirestoreAuthors = (authors = []) =>
  authors
    .map((author) => {
      if (!author) return null;
      if (typeof author === 'string') {
        return { label: author, url: '' };
      }
      const label = author.name?.trim() || author.title?.trim();
      if (!label) return null;
      return { label, url: author.url?.trim() || '' };
    })
    .filter(Boolean);

const mapFirestoreLinks = (links = []) =>
  links
    .map((link) => {
      if (!link) return null;
      if (typeof link === 'string') {
        const trimmed = link.trim();
        return trimmed ? { title: trimmed, url: '' } : null;
      }
      const title = link.title?.trim();
      if (!title) return null;
      return { title, url: link.url?.trim() || '' };
    })
    .filter(Boolean);

const mapFirestoreVideoEntries = (period = {}) => {
  const playlist = Array.isArray(period.video_playlist) ? period.video_playlist : [];

  const normalized = playlist
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        const url = item.trim();
        return url ? { title: period.title || 'Видео-лекция', url, deckUrl: '', audioUrl: '' } : null;
      }
      const title = (item.title ?? item.label ?? period.title ?? '').trim();
      const url = (item.url ?? item.videoUrl ?? item.src ?? '').trim();
      if (!url) return null;
      const deckUrl = (item.deckUrl ?? item.deck_url ?? '').trim();
      const audioUrl = (item.audioUrl ?? item.audio_url ?? '').trim();
      return {
        title: title || period.title || 'Видео-лекция',
        url,
        deckUrl,
        audioUrl,
      };
    })
    .filter(Boolean);

  if (normalized.length) {
    return normalized;
  }

  const fallbackUrl = (period.video_url ?? period.videoUrl ?? '').trim();
  if (!fallbackUrl) return [];
  return [
    {
      title: period.title || 'Видео-лекция',
      url: fallbackUrl,
      deckUrl: (period.deck_url ?? period.deckUrl ?? '').trim(),
      audioUrl: (period.audio_url ?? period.audioUrl ?? '').trim(),
    },
  ];
};

const mapFirestoreLeisure = (items = []) =>
  items
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        const title = item.trim();
        return title ? { title } : null;
      }
      const title = (item.title ?? item.name ?? '').trim();
      if (!title) return null;
      const url = item.url?.trim() || '';
      const type = item.type?.trim() || '';
      const year = item.year ? String(item.year).trim() : '';
      return {
        title,
        ...(url ? { url } : {}),
        ...(type ? { type } : {}),
        ...(year ? { year } : {}),
      };
    })
    .filter(Boolean);

const buildFirestoreSections = (period) => {
  const sections = {};

  const videoEntries = mapFirestoreVideoEntries(period);
  if (videoEntries.length) {
    sections.video = {
      title: 'Видео-лекция',
      content: videoEntries,
    };
  }

  if (Array.isArray(period.concepts) && period.concepts.length) {
    sections.concepts = {
      title: 'Понятия',
      content: period.concepts.slice(),
    };
  }

  if (Array.isArray(period.authors) && period.authors.length) {
    sections.authors = {
      title: 'Ключевые авторы',
      content: mapFirestoreAuthors(period.authors),
    };
  }

  if (Array.isArray(period.core_literature) && period.core_literature.length) {
    sections.core_literature = {
      title: 'Основная литература',
      content: mapFirestoreLinks(period.core_literature),
    };
  }

  if (Array.isArray(period.extra_literature) && period.extra_literature.length) {
    sections.extra_literature = {
      title: 'Дополнительная литература',
      content: mapFirestoreLinks(period.extra_literature),
    };
  }

  if (Array.isArray(period.extra_videos) && period.extra_videos.length) {
    sections.extra_videos = {
      title: 'Дополнительные видео и лекции',
      content: mapFirestoreLinks(period.extra_videos),
    };
  }

  if (Array.isArray(period.leisure) && period.leisure.length) {
    sections.leisure = {
      title: 'Досуговое',
      content: mapFirestoreLeisure(period.leisure),
    };
  }

  if (period.self_questions_url) {
    sections.self_questions = {
      title: 'Вопросы для контакта с собой',
      content: [period.self_questions_url],
    };
  }

  return sections;
};

const mapFirestorePeriod = (period) => {
  const label = period.title || period.period;
  const sections = buildFirestoreSections(period);
  const placeholderTextRaw = trim(
    period.placeholderText ?? period.placeholder_text ?? period.placeholder ?? ''
  );
  return {
    id: period.period,
    label,
    sections,
    deckUrl: period.deck_url || '',
    placeholderEnabled:
      typeof period.placeholder_enabled === 'boolean'
        ? period.placeholder_enabled
        : undefined,
    ...(placeholderTextRaw ? { placeholderText: placeholderTextRaw } : {}),
    order: typeof period.order === 'number' ? period.order : Number.MAX_SAFE_INTEGER,
  };
};

export function usePeriods() {
  const [firestoreDocs, setFirestoreDocs] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFirestore() {
      try {
        const docs = await getPublishedPeriods();
        if (!cancelled) {
          setFirestoreDocs(docs);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    setError(null);

    loadFirestore();

    return () => {
      cancelled = true;
    };
  }, []);

  const periods = useMemo(() => {
    if (!firestoreDocs.length) return [];
    return firestoreDocs
      .map(mapFirestorePeriod)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(({ order, ...rest }) => rest);
  }, [firestoreDocs]);

  return { periods, loading, error };
}
