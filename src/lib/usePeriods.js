import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';

import { useDataSource } from '../hooks/useDataSource';
import { getPublishedPeriods } from './firestoreHelpers';

const CSV_URL = '/content/periods.csv';

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const trim = (value) => (typeof value === 'string' ? value.trim() : '');

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('Failed to parse JSON payload from CSV row', value, error);
    return value;
  }
};

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
  return {
    id: period.period,
    label,
    sections,
    deckUrl: period.deck_url || '',
    placeholderEnabled:
      typeof period.placeholder_enabled === 'boolean'
        ? period.placeholder_enabled
        : undefined,
    order: typeof period.order === 'number' ? period.order : Number.MAX_SAFE_INTEGER,
  };
};

export function usePeriods() {
  const dataSource = useDataSource();
  const [rawRows, setRawRows] = useState([]);
  const [firestoreDocs, setFirestoreDocs] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCsv() {
      try {
        const response = await fetch(CSV_URL);
        if (!response.ok) {
          throw new Error(`Не удалось загрузить periods.csv (${response.status})`);
        }

        const text = await response.text();
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        });

        if (parsed.errors?.length) {
          console.warn('Papaparse detected issues', parsed.errors);
        }

        if (!cancelled) {
          setRawRows(parsed.data ?? []);
          setFirestoreDocs([]);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    }

    async function loadFirestore() {
      try {
        const docs = await getPublishedPeriods();
        if (!cancelled) {
          setFirestoreDocs(docs);
          setRawRows([]);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    }

    setLoading(true);
    setError(null);

    if (dataSource === 'firestore') {
      loadFirestore();
    } else {
      loadCsv();
    }

    return () => {
      cancelled = true;
    };
  }, [dataSource]);

  const periods = useMemo(() => {
    if (dataSource === 'firestore') {
      if (!firestoreDocs.length) return [];
      return firestoreDocs
        .map(mapFirestorePeriod)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(({ order, ...rest }) => rest);
    }

    if (!rawRows.length) return [];

    const periodMap = new Map();

    for (const row of rawRows) {
      const periodId = trim(row.period_id);
      const sectionId = trim(row.section_id);
      const deckUrl = trim(row.deck_url);

      if (!periodId || !sectionId) continue;

      const period = (() => {
        if (!periodMap.has(periodId)) {
          periodMap.set(periodId, {
            id: periodId,
            label: trim(row.period_label) || periodId,
            order: toNumber(row.period_order),
            sections: new Map(),
            deckUrl: deckUrl,
          });
        }
        const stored = periodMap.get(periodId);
        if (!stored.deckUrl && deckUrl) {
          stored.deckUrl = deckUrl;
        }
        return stored;
      })();

      const section = (() => {
        const key = sectionId;
        if (!period.sections.has(key)) {
          period.sections.set(key, {
            key,
            title: trim(row.section_title) || key,
            order: toNumber(row.section_order),
            items: [],
          });
        }
        return period.sections.get(key);
      })();

      if (row.content_type === 'object') {
        section.items.push({
          order: toNumber(row.item_order),
          value: safeParse(row.content_value ?? '{}'),
        });
      } else if (row.content_type === 'string') {
        section.items.push({
          order: toNumber(row.item_order),
          value: row.content_value ?? '',
        });
      } else {
        section.items.push({
          order: toNumber(row.item_order),
          value: row.content_value,
        });
      }
    }

    return Array.from(periodMap.values())
      .sort((a, b) => a.order - b.order)
      .map((period) => ({
        id: period.id,
        label: period.label,
        sections: Array.from(period.sections.values())
          .sort((a, b) => a.order - b.order)
          .reduce((acc, section) => {
            acc[section.key] = {
              title: section.title,
              content: section.items
                .sort((a, b) => a.order - b.order)
                .map((item) => item.value),
            };
            return acc;
          }, {}),
        deckUrl: period.deckUrl ? period.deckUrl : '',
      }));
  }, [dataSource, firestoreDocs, rawRows]);

  return { periods, loading, error };
}
