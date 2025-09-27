import { useEffect, useState } from 'react';
import Papa from 'papaparse';

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

export function useIntro() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
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

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
