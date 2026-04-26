import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError, debugLog } from '../lib/debug';
import { ABOUT_TABS } from '../pages/about/aboutContent';
import { PARTNERS } from '../pages/about/partnersContent';
import type { AboutPageDocument } from '../types/pageContent';

const DEFAULT_ABOUT_CONTENT: AboutPageDocument = {
  version: 1,
  tabs: ABOUT_TABS,
  partners: PARTNERS,
};

export function useAboutPageContent() {
  const [content, setContent] = useState<AboutPageDocument>(DEFAULT_ABOUT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDoc(doc(db, 'pages', 'about'))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as Partial<AboutPageDocument>;
          setContent({
            version: data.version ?? 1,
            lastModified: data.lastModified,
            tabs: Array.isArray(data.tabs) && data.tabs.length > 0 ? data.tabs : ABOUT_TABS,
            partners: Array.isArray(data.partners) ? data.partners : PARTNERS,
          });
          debugLog('About page content loaded from Firestore');
        } else {
          debugLog('About page content not found, using fallback');
          setContent(DEFAULT_ABOUT_CONTENT);
        }
      })
      .catch((err) => {
        debugError('useAboutPageContent: load failed', err);
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setContent(DEFAULT_ABOUT_CONTENT);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { content, loading, error };
}
