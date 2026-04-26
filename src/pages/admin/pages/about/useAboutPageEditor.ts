import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { debugError } from '../../../../lib/debug';
import { ABOUT_TABS, type AboutTab } from '../../../about/aboutContent';
import { PARTNERS, type Partner } from '../../../about/partnersContent';
import type { AboutPageDocument } from '../../../../types/pageContent';

export interface AboutFormState {
  tabs: AboutTab[];
  partners: Partner[];
}

const FALLBACK_FORM: AboutFormState = {
  tabs: ABOUT_TABS,
  partners: PARTNERS,
};

function cloneForm(form: AboutFormState): AboutFormState {
  return JSON.parse(JSON.stringify(form)) as AboutFormState;
}

export function useAboutPageEditor() {
  const [form, setForm] = useState<AboutFormState>(() => cloneForm(FALLBACK_FORM));
  const [initialForm, setInitialForm] = useState<AboutFormState>(() => cloneForm(FALLBACK_FORM));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDoc(doc(db, 'pages', 'about'))
      .then((snap) => {
        if (cancelled) return;
        const next = snap.exists()
          ? (() => {
              const data = snap.data() as Partial<AboutPageDocument>;
              return {
                tabs:
                  Array.isArray(data.tabs) && data.tabs.length > 0
                    ? (data.tabs as AboutTab[])
                    : ABOUT_TABS,
                partners: Array.isArray(data.partners)
                  ? (data.partners as Partner[])
                  : PARTNERS,
              };
            })()
          : cloneForm(FALLBACK_FORM);
        setForm(cloneForm(next));
        setInitialForm(cloneForm(next));
      })
      .catch((err) => {
        debugError('useAboutPageEditor: load failed', err);
        if (!cancelled) setError('Не удалось загрузить страницу.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await setDoc(
        doc(db, 'pages', 'about'),
        {
          version: 1,
          lastModified: new Date().toISOString(),
          tabs: form.tabs,
          partners: form.partners,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setInitialForm(cloneForm(form));
      return true;
    } catch (err) {
      debugError('useAboutPageEditor: save failed', err);
      setError('Не удалось сохранить. Попробуйте ещё раз.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [form]);

  const reset = useCallback(() => {
    setForm(cloneForm(initialForm));
    setError(null);
  }, [initialForm]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const updateTab = useCallback((index: number, patch: Partial<AboutTab>) => {
    setForm((prev) => {
      const next = [...prev.tabs];
      next[index] = { ...next[index], ...patch } as AboutTab;
      return { ...prev, tabs: next };
    });
  }, []);

  const setPartners = useCallback((partners: Partner[]) => {
    setForm((prev) => ({ ...prev, partners }));
  }, []);

  return {
    form,
    loading,
    saving,
    error,
    dirty,
    save,
    reset,
    updateTab,
    setPartners,
  };
}
