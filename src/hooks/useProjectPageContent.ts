import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError, debugLog } from '../lib/debug';
import type { ProjectPageDocument } from '../types/pageContent';

const PROJECT_FALLBACKS: Record<string, ProjectPageDocument> = {
  'dom-academy-overview': {
    version: 1,
    title: 'Это пример страницы проекта',
    subtitle: 'Демонстрация шаблона ProjectPage',
    intro:
      'Это пример страницы проекта в общем стиле сайта. На таких страницах будут жить отдельные проекты Академии — со своим заголовком, кратким описанием и фотографиями.',
    paragraphs: [
      'Шаблон не превращает страницу в отдельный лендинг. Это часть сайта: та же шапка, та же палитра, тот же компактный layout. Меняется только содержимое.',
      'В будущих волнах сюда будут подключаться реальные проекты — с фотографиями, программой, ссылкой на запись или бронирование.',
    ],
    cta: { label: 'На главную', to: '/home' },
  },
};

export function getProjectFallback(slug: string): ProjectPageDocument | null {
  return PROJECT_FALLBACKS[slug] ?? null;
}

export interface UseProjectPageContentResult {
  content: ProjectPageDocument | null;
  loading: boolean;
  notFound: boolean;
  error: Error | null;
}

export function useProjectPageContent(slug: string | undefined): UseProjectPageContentResult {
  const [content, setContent] = useState<ProjectPageDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) {
      setContent(null);
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);
    getDoc(doc(db, 'projectPages', slug))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          setContent(snap.data() as ProjectPageDocument);
          debugLog('Project page loaded from Firestore', slug);
          return;
        }
        const fallback = getProjectFallback(slug);
        if (fallback) {
          setContent(fallback);
          debugLog('Project page using hardcode fallback', slug);
        } else {
          setContent(null);
          setNotFound(true);
        }
      })
      .catch((err) => {
        debugError('useProjectPageContent: load failed', err);
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        const fallback = getProjectFallback(slug);
        if (fallback) {
          setContent(fallback);
        } else {
          setContent(null);
          setNotFound(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { content, loading, notFound, error };
}
