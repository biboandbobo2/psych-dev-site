import { useEffect, useState } from 'react';
import Papa from 'papaparse';

import { useDataSource } from '../hooks/useDataSource';
import { getIntro } from './firestoreHelpers';

const CSV_URL = '/content/intro.csv';

const trim = (value) => (typeof value === 'string' ? value.trim() : '');

const splitList = (value) => {
  const raw = trim(value);
  if (!raw) return [];
  return raw
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
};

const splitPairs = (value) => {
  return splitList(value)
    .map((item) => {
      const [labelPart, ...urlParts] = item.split('::');
      const label = trim(labelPart);
      const url = trim(urlParts.join('::'));
      if (!label || !url) return null;
      return { label, url };
    })
    .filter(Boolean);
};

const mapRowToIntro = (row) => {
  if (!row) return null;
  const videoUrl = trim(row.video_url);
  const concepts = splitList(row.concepts);
  const authors = splitPairs(row.authors);
  const coreLiterature = splitPairs(row.core_literature);
  const extraLiterature = splitPairs(row.extra_literature);
  const extraVideos = splitPairs(row.extra_videos);
  const selfQuestionsUrl = trim(row.self_questions_url);
  const deckUrl = trim(row.deck_url);

  return {
    videoUrl,
    concepts,
    authors,
    coreLiterature,
    extraLiterature,
    extraVideos,
    selfQuestionsUrl: selfQuestionsUrl || null,
    deckUrl: deckUrl || null,
  };
};

const mapFirestoreAuthors = (authors = []) =>
  authors
    .map((author) => {
      if (!author) return null;
      if (typeof author === 'string') {
        const label = author.trim();
        return label ? { label, url: '' } : null;
      }
      const label = trim(author.name ?? author.title);
      if (!label) return null;
      return { label, url: trim(author.url) };
    })
    .filter(Boolean);

const mapFirestoreLinks = (links = []) =>
  links
    .map((link) => {
      if (!link) return null;
      if (typeof link === 'string') {
        const label = link.trim();
        return label ? { label, url: '' } : null;
      }
      const title = trim(link.title);
      if (!title) return null;
      return { label: title, url: trim(link.url) };
    })
    .filter(Boolean);

const mapFirestoreIntro = (doc) => {
  if (!doc) return null;

  const concepts = Array.isArray(doc.concepts) ? doc.concepts.map(trim).filter(Boolean) : [];
  const authors = mapFirestoreAuthors(doc.authors);
  const coreLiterature = mapFirestoreLinks(doc.core_literature);
  const extraLiterature = mapFirestoreLinks(doc.extra_literature);
  const extraVideos = mapFirestoreLinks(doc.extra_videos);

  const videoUrl = trim(doc.video_url ?? doc.videoUrl);
  const selfQuestionsUrl = trim(doc.self_questions_url ?? doc.selfQuestionsUrl);
  const deckUrl = trim(doc.deck_url ?? doc.deckUrl);

  return {
    videoUrl,
    concepts,
    authors,
    coreLiterature,
    extraLiterature,
    extraVideos,
    selfQuestionsUrl: selfQuestionsUrl || null,
    deckUrl: deckUrl || null,
  };
};

export function useIntro() {
  const dataSource = useDataSource();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadFromCsv = async () => {
      try {
        const response = await fetch(CSV_URL);
        if (!response.ok) {
          throw new Error(`Не удалось загрузить intro.csv (${response.status})`);
        }

        const text = await response.text();
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          delimiter: ';',
        });

        if (parsed.errors?.length) {
          console.warn('Papaparse detected issues in intro.csv', parsed.errors);
        }

        if (!cancelled) {
          setData(mapRowToIntro(parsed.data?.[0]));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    };

    const loadFromFirestore = async () => {
      try {
        const doc = await getIntro();
        if (!cancelled) {
          setData(mapFirestoreIntro(doc));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    };

    setLoading(true);
    setError(null);
    setData(null);

    if (dataSource === 'firestore') {
      loadFromFirestore();
    } else {
      loadFromCsv();
    }

    return () => {
      cancelled = true;
    };
  }, [dataSource]);

  return { data, loading, error };
}
