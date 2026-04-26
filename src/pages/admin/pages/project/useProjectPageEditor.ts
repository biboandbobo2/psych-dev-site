import { useCallback, useEffect, useState } from 'react';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { debugError } from '../../../../lib/debug';
import { getProjectFallback } from '../../../../hooks/useProjectPageContent';
import type { ProjectPageDocument } from '../../../../types/pageContent';
import type { ProjectImage, ProjectCta } from '../../../projects/ProjectPage';

export interface ProjectFormState {
  title: string;
  subtitle: string;
  intro: string;
  paragraphs: string[];
  images: ProjectImage[];
  cta: ProjectCta | null;
}

const EMPTY_FORM: ProjectFormState = {
  title: '',
  subtitle: '',
  intro: '',
  paragraphs: [],
  images: [],
  cta: null,
};

function clone(form: ProjectFormState): ProjectFormState {
  return JSON.parse(JSON.stringify(form)) as ProjectFormState;
}

function docToForm(data: Partial<ProjectPageDocument>): ProjectFormState {
  return {
    title: data.title ?? '',
    subtitle: data.subtitle ?? '',
    intro: data.intro ?? '',
    paragraphs: Array.isArray(data.paragraphs) ? data.paragraphs : [],
    images: Array.isArray(data.images) ? data.images : [],
    cta: data.cta ?? null,
  };
}

export function useProjectPageEditor(slug: string) {
  const [form, setForm] = useState<ProjectFormState>(() => clone(EMPTY_FORM));
  const [initialForm, setInitialForm] = useState<ProjectFormState>(() => clone(EMPTY_FORM));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);
    getDoc(doc(db, 'projectPages', slug))
      .then((snap) => {
        if (cancelled) return;
        let next: ProjectFormState;
        if (snap.exists()) {
          next = docToForm(snap.data() as Partial<ProjectPageDocument>);
        } else {
          const fallback = getProjectFallback(slug);
          if (fallback) {
            next = docToForm(fallback);
          } else {
            setNotFound(true);
            next = clone(EMPTY_FORM);
          }
        }
        setForm(clone(next));
        setInitialForm(clone(next));
      })
      .catch((err) => {
        debugError('useProjectPageEditor: load failed', err);
        if (!cancelled) setError('Не удалось загрузить страницу проекта.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: ProjectPageDocument & { updatedAt: ReturnType<typeof serverTimestamp> } = {
        version: 1,
        lastModified: new Date().toISOString(),
        title: form.title.trim(),
        intro: form.intro.trim(),
        updatedAt: serverTimestamp(),
      };
      const subtitle = form.subtitle.trim();
      if (subtitle) payload.subtitle = subtitle;
      const paragraphs = form.paragraphs.map((p) => p.trim()).filter(Boolean);
      if (paragraphs.length > 0) payload.paragraphs = paragraphs;
      const images = form.images.filter((img) => img.src.trim() && img.alt.trim());
      if (images.length > 0) payload.images = images;
      if (form.cta && form.cta.label.trim() && (form.cta.to || form.cta.href)) {
        payload.cta = form.cta;
      }
      await setDoc(doc(db, 'projectPages', slug), payload, { merge: true });
      setInitialForm(clone(form));
      return true;
    } catch (err) {
      debugError('useProjectPageEditor: save failed', err);
      setError('Не удалось сохранить. Попробуйте ещё раз.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, slug]);

  const remove = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'projectPages', slug));
      return true;
    } catch (err) {
      debugError('useProjectPageEditor: delete failed', err);
      setError('Не удалось удалить страницу.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [slug]);

  const reset = useCallback(() => {
    setForm(clone(initialForm));
    setError(null);
  }, [initialForm]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  return {
    form,
    setForm,
    loading,
    saving,
    error,
    dirty,
    notFound,
    save,
    remove,
    reset,
  };
}
