import { useEffect, useState } from 'react';
import { getIntro } from './firestoreHelpers';

const trim = (value) => (typeof value === 'string' ? value.trim() : '');

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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadIntro() {
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
    }

    setLoading(true);
    setError(null);
    setData(null);

    loadIntro();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
