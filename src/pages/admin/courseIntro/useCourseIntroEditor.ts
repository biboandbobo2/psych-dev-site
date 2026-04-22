import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { debugError } from '../../../lib/debug';
import { normalizeCourseIntro } from '../../../hooks/useCourseIntro';
import type { CourseIntro, CourseIntroAuthor, CourseIntroAuthorLink } from '../../../types/courseIntro';

export interface AuthorFormState {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
  links: CourseIntroAuthorLink[];
}

export interface CourseIntroFormState {
  idea: string;
  program: string;
  authors: AuthorFormState[];
}

const EMPTY_FORM: CourseIntroFormState = {
  idea: '',
  program: '',
  authors: [],
};

function createAuthorId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `author-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function authorFromIntro(author: CourseIntroAuthor): AuthorFormState {
  return {
    id: author.id,
    name: author.name,
    role: author.role ?? '',
    bio: author.bio ?? '',
    photoUrl: author.photoUrl ?? '',
    links: author.links?.map((link) => ({ ...link })) ?? [],
  };
}

function introToForm(intro: CourseIntro | null): CourseIntroFormState {
  if (!intro) return EMPTY_FORM;
  return {
    idea: intro.idea ?? '',
    program: intro.program ?? '',
    authors: (intro.authors ?? []).map(authorFromIntro),
  };
}

function buildAuthorPayload(author: AuthorFormState): CourseIntroAuthor | null {
  const name = author.name.trim();
  if (!name) return null;
  const payload: CourseIntroAuthor = { id: author.id, name };
  const role = author.role.trim();
  if (role) payload.role = role;
  const bio = author.bio.trim();
  if (bio) payload.bio = author.bio;
  const photoUrl = author.photoUrl.trim();
  if (photoUrl) payload.photoUrl = photoUrl;
  const links = author.links
    .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
    .filter((link) => link.label && link.url);
  if (links.length > 0) payload.links = links;
  return payload;
}

export function buildIntroPayload(form: CourseIntroFormState, userId: string | null) {
  const idea = form.idea.trim();
  const program = form.program.trim();
  const authors = form.authors
    .map(buildAuthorPayload)
    .filter((author): author is CourseIntroAuthor => author !== null);

  const payload: Record<string, unknown> = {};
  if (idea) payload.idea = form.idea;
  if (program) payload.program = form.program;
  if (authors.length > 0) payload.authors = authors;
  payload.updatedAt = Date.now();
  if (userId) payload.updatedBy = userId;
  return payload;
}

export function useCourseIntroEditor(courseId: string) {
  const [form, setForm] = useState<CourseIntroFormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<CourseIntroFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseExists, setCourseExists] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDoc(doc(db, 'courses', courseId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setCourseExists(false);
          setForm(EMPTY_FORM);
          setInitialForm(EMPTY_FORM);
          return;
        }
        setCourseExists(true);
        const intro = normalizeCourseIntro(snap.data()?.intro);
        const loadedForm = introToForm(intro);
        setForm(loadedForm);
        setInitialForm(loadedForm);
      })
      .catch((err) => {
        debugError('useCourseIntroEditor: load failed', err);
        if (!cancelled) setError('Не удалось загрузить курс.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const save = useCallback(
    async (userId: string | null) => {
      setSaving(true);
      setError(null);
      try {
        const payload = buildIntroPayload(form, userId);
        await updateDoc(doc(db, 'courses', courseId), {
          intro: payload,
          updatedAt: serverTimestamp(),
        });
        setInitialForm(form);
        return true;
      } catch (err) {
        debugError('useCourseIntroEditor: save failed', err);
        setError('Не удалось сохранить. Попробуйте ещё раз.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [courseId, form]
  );

  const reset = useCallback(() => {
    setForm(initialForm);
    setError(null);
  }, [initialForm]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const addAuthor = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      authors: [
        ...prev.authors,
        { id: createAuthorId(), name: '', role: '', bio: '', photoUrl: '', links: [] },
      ],
    }));
  }, []);

  const removeAuthor = useCallback((id: string) => {
    setForm((prev) => ({ ...prev, authors: prev.authors.filter((a) => a.id !== id) }));
  }, []);

  const updateAuthor = useCallback((id: string, patch: Partial<AuthorFormState>) => {
    setForm((prev) => ({
      ...prev,
      authors: prev.authors.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }, []);

  const moveAuthor = useCallback((id: string, direction: 'up' | 'down') => {
    setForm((prev) => {
      const idx = prev.authors.findIndex((a) => a.id === id);
      if (idx === -1) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.authors.length) return prev;
      const next = [...prev.authors];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, authors: next };
    });
  }, []);

  return {
    form,
    setForm,
    loading,
    saving,
    error,
    dirty,
    courseExists,
    save,
    reset,
    addAuthor,
    removeAuthor,
    updateAuthor,
    moveAuthor,
  };
}
