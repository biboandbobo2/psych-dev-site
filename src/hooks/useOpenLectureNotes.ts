import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where, type QueryConstraint } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { debugError } from '../lib/debug';
import {
  normalizeLectureNoteSegments,
  type LectureNoteSegment,
} from '../types/notes';

/** Живой открытый lecture-конспект (visibility='group'|'lecturers') в чате занятия. */
export interface OpenLectureNote {
  id: string;
  userId: string;
  authorName: string | null;
  lectureVideoId: string | null;
  visibility: 'group' | 'lecturers';
  segments: LectureNoteSegment[];
  updatedAt: Date;
}

function mapOpenLectureNote(id: string, data: Record<string, unknown>): OpenLectureNote {
  return {
    id,
    userId: typeof data.userId === 'string' ? data.userId : '',
    authorName: typeof data.authorName === 'string' ? data.authorName : null,
    lectureVideoId: typeof data.lectureVideoId === 'string' ? data.lectureVideoId : null,
    visibility: data.visibility === 'lecturers' ? 'lecturers' : 'group',
    segments: normalizeLectureNoteSegments(
      data.lectureSegments,
      typeof data.content === 'string' ? data.content : ''
    ),
    updatedAt:
      (data.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
  };
}

/**
 * Живая подписка на открытые конспекты занятия из коллекции `notes`.
 * Каждый источник — набор equality-фильтров, провабельных для list-правил
 * (noteScope='lecture' + visibility + groupId — как в lectureQuestions).
 */
function useOpenNotesQueries(sources: Array<{ key: string; constraints: QueryConstraint[] }>) {
  const [bySource, setBySource] = useState<Record<string, OpenLectureNote[]>>({});
  const sourcesKey = sources.map((source) => source.key).join(',');

  useEffect(() => {
    setBySource({});

    if (sources.length === 0) {
      return undefined;
    }

    const unsubscribes = sources.map(({ key, constraints }) =>
      onSnapshot(
        query(collection(db, 'notes'), ...constraints),
        (snap) => {
          setBySource((current) => ({
            ...current,
            [key]: snap.docs.map((d) => mapOpenLectureNote(d.id, d.data())),
          }));
        },
        (err) => {
          debugError('[useOpenLectureNotes] snapshot error', key, err);
        }
      )
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
    // Источники пересобираются только при смене их ключей (см. sourcesKey).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcesKey]);

  return useMemo(() => {
    const seen = new Set<string>();
    const merged: OpenLectureNote[] = [];
    for (const list of Object.values(bySource)) {
      for (const note of list) {
        if (!seen.has(note.id)) {
          seen.add(note.id);
          merged.push(note);
        }
      }
    }
    return merged;
  }, [bySource]);
}

/**
 * Студент: открытые конспекты одногруппников по занятию (свой конспект в чат
 * попадает из локального draft, поэтому свои документы отфильтровываются).
 */
export function useLessonGroupOpenNotes(
  courseId: string | null,
  periodId: string | null,
  groupIds: string[]
) {
  const user = useAuthStore((s) => s.user);
  const sources = useMemo(() => {
    if (!courseId || !periodId || !user) {
      return [];
    }

    return groupIds.map((groupId) => ({
      key: `group:${courseId}:${periodId}:${groupId}`,
      constraints: [
        where('courseId', '==', courseId),
        where('periodId', '==', periodId),
        where('noteScope', '==', 'lecture'),
        where('visibility', '==', 'group'),
        where('groupId', '==', groupId),
      ],
    }));
  }, [courseId, periodId, groupIds, user]);

  const notes = useOpenNotesQueries(sources);
  return useMemo(
    () => notes.filter((note) => note.userId !== user?.uid),
    [notes, user?.uid]
  );
}

/**
 * Лектор (canEditCourse): все открытые конспекты занятия — group и lecturers.
 * Два equality-запроса вместо `in`, чтобы правила были провабельны.
 */
export function useLessonAllOpenNotes(courseId: string | null, periodId: string | null) {
  const sources = useMemo(() => {
    if (!courseId || !periodId) {
      return [];
    }

    return (['group', 'lecturers'] as const).map((visibility) => ({
      key: `all:${courseId}:${periodId}:${visibility}`,
      constraints: [
        where('courseId', '==', courseId),
        where('periodId', '==', periodId),
        where('noteScope', '==', 'lecture'),
        where('visibility', '==', visibility),
      ],
    }));
  }, [courseId, periodId]);

  return useOpenNotesQueries(sources);
}
