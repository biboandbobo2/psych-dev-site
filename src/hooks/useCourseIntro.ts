import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';
import type { CourseIntro, CourseIntroAuthor, CourseIntroAuthorLink } from '../types/courseIntro';

function normalizeLink(raw: unknown): CourseIntroAuthorLink | null {
  if (!raw || typeof raw !== 'object') return null;
  const { label, url } = raw as Record<string, unknown>;
  if (typeof label !== 'string' || typeof url !== 'string') return null;
  const trimmedLabel = label.trim();
  const trimmedUrl = url.trim();
  if (!trimmedLabel || !trimmedUrl) return null;
  return { label: trimmedLabel, url: trimmedUrl };
}

function normalizeAuthor(raw: unknown): CourseIntroAuthor | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const id = typeof data.id === 'string' && data.id.trim() ? data.id.trim() : null;
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!id || !name) return null;
  const author: CourseIntroAuthor = { id, name };
  if (typeof data.role === 'string' && data.role.trim()) author.role = data.role.trim();
  if (typeof data.bio === 'string' && data.bio.trim()) author.bio = data.bio;
  if (typeof data.photoUrl === 'string' && data.photoUrl.trim()) author.photoUrl = data.photoUrl.trim();
  if (Array.isArray(data.links)) {
    const links = data.links.map(normalizeLink).filter((link): link is CourseIntroAuthorLink => link !== null);
    if (links.length > 0) author.links = links;
  }
  return author;
}

export function normalizeCourseIntro(raw: unknown): CourseIntro | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const intro: CourseIntro = {};
  if (typeof data.idea === 'string' && data.idea.trim()) intro.idea = data.idea;
  if (typeof data.program === 'string' && data.program.trim()) intro.program = data.program;
  if (Array.isArray(data.authors)) {
    const authors = data.authors.map(normalizeAuthor).filter((author): author is CourseIntroAuthor => author !== null);
    if (authors.length > 0) intro.authors = authors;
  }
  if (typeof data.updatedAt === 'number') intro.updatedAt = data.updatedAt;
  if (typeof data.updatedBy === 'string' && data.updatedBy.trim()) intro.updatedBy = data.updatedBy.trim();
  if (!intro.idea && !intro.program && !intro.authors) return null;
  return intro;
}

export function useCourseIntro(courseId: string) {
  const [intro, setIntro] = useState<CourseIntro | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDoc(doc(db, 'courses', courseId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setIntro(null);
          return;
        }
        const raw = snap.data()?.intro;
        setIntro(normalizeCourseIntro(raw));
      })
      .catch((err) => {
        debugError('useCourseIntro: failed to load', err);
        if (!cancelled) setIntro(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return { intro, loading };
}
