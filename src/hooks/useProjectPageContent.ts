import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError, debugLog } from '../lib/debug';
import { getProjectFallback } from '../pages/projects/projectFallbacks';
import type { ProjectPageDocument } from '../types/pageContent';

export { getProjectFallback };

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
