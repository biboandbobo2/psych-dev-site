import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { debugError } from '../../../lib/debug';

export interface ProjectListItem {
  slug: string;
  title: string;
}

export function useProjectsList() {
  const [items, setItems] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDocs(query(collection(db, 'projectPages'), orderBy('title', 'asc')))
      .then((snap) => {
        if (cancelled) return;
        const next = snap.docs.map((d) => {
          const data = d.data() as { title?: string };
          return { slug: d.id, title: data.title?.trim() || d.id };
        });
        setItems(next);
      })
      .catch((err) => {
        debugError('useProjectsList: load failed', err);
        if (!cancelled) setError('Не удалось загрузить список проектов.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return { items, loading, error, reload: () => setReloadKey((k) => k + 1) };
}
