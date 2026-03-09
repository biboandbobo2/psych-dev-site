import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthProvider';
import {
  type Note,
  type AgeRange,
  type LectureNoteContext,
  type ManualNoteContext,
  AGE_RANGE_LABELS,
  buildLectureNoteDocumentId,
  buildLectureNoteKey,
  buildNotePeriodKey,
  normalizeAgeRange,
} from '../types/notes';
import { reportAppError } from '../lib/errorHandler';
import { debugLog, debugError } from '../lib/debug';

interface UseNotesOptions {
  subscribe?: boolean;
}

type NoteUpdatePayload = Partial<
  Pick<
    Note,
    | 'title'
    | 'content'
    | 'ageRange'
    | 'periodId'
    | 'periodTitle'
    | 'courseId'
    | 'topicId'
    | 'topicTitle'
    | 'noteScope'
  >
>;

function mapNoteRecord(id: string, data: Record<string, any>): Note {
  const ageRange = normalizeAgeRange(data.ageRange ?? data.periodId);
  const periodId = typeof data.periodId === 'string' ? data.periodId : ageRange;
  const periodTitle = data.periodTitle ?? (ageRange ? AGE_RANGE_LABELS[ageRange] : null);

  return {
    id,
    userId: data.userId || '',
    title: data.title || 'Без названия',
    content: data.content || '',
    ageRange,
    periodId: periodId ?? null,
    periodKey: typeof data.periodKey === 'string' ? data.periodKey : null,
    periodTitle: periodTitle ?? null,
    courseId: typeof data.courseId === 'string' ? data.courseId : null,
    noteScope: data.noteScope === 'lecture' || data.noteScope === 'timeline' ? data.noteScope : 'manual',
    lectureVideoId: typeof data.lectureVideoId === 'string' ? data.lectureVideoId : null,
    lectureKey: typeof data.lectureKey === 'string' ? data.lectureKey : null,
    topicId: data.topicId || null,
    topicTitle: data.topicTitle ?? null,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  } as Note;
}

export function useNotes(periodFilter?: string | null, options: UseNotesOptions = {}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const subscribe = options.subscribe ?? true;

  useEffect(() => {
    if (!subscribe) {
      setNotes([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    let notesQuery;

    if (periodFilter !== undefined && periodFilter !== null) {
      notesQuery = query(
        collection(db, 'notes'),
        where('userId', '==', user.uid),
        where('periodKey', '==', periodFilter)
      );
    } else {
      notesQuery = query(collection(db, 'notes'), where('userId', '==', user.uid));
    }

    debugLog('[useNotes] Starting notes listener for user:', user.uid, 'period:', periodFilter);

    const unsubscribe = onSnapshot(
      notesQuery,
      (snapshot) => {
        debugLog('[useNotes] Received notes snapshot:', snapshot.size, 'documents');

        let notesData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          debugLog('[useNotes] Note document:', docSnap.id, data);
          return mapNoteRecord(docSnap.id, data);
        });

        notesData = notesData.sort((a, b) => {
          const dateA = a.updatedAt?.getTime?.() || 0;
          const dateB = b.updatedAt?.getTime?.() || 0;
          return dateB - dateA;
        });

        debugLog('[useNotes] Sorted notes:', notesData.length, 'total');
        setNotes(notesData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        reportAppError({ message: 'Ошибка загрузки заметок', error: err, context: 'useNotes.listener' });
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      debugLog('[useNotes] Cleaning up notes listener');
      unsubscribe();
    };
  }, [user, periodFilter, subscribe]);

  const createNote = async (
    title: string,
    content: string,
    ageRange: AgeRange | null = null,
    topicId: string | null = null,
    topicTitle: string | null = null
  ) => {
    if (!user) {
      debugError('[useNotes] Cannot create note: user not authenticated');
      throw new Error('User not authenticated');
    }

    try {
      const normalizedAgeRange = normalizeAgeRange(ageRange);
      const derivedPeriodTitle = normalizedAgeRange ? AGE_RANGE_LABELS[normalizedAgeRange] : null;
      const noteData = {
        userId: user.uid,
        title: title || 'Без названия',
        content: content || '',
        ageRange: normalizedAgeRange,
        periodId: normalizedAgeRange ?? null,
        periodKey: normalizedAgeRange ? buildNotePeriodKey('development', normalizedAgeRange) : null,
        periodTitle: derivedPeriodTitle,
        courseId: normalizedAgeRange ? 'development' : null,
        noteScope: 'manual' as const,
        topicId: topicId || null,
        topicTitle: topicTitle || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      debugLog('[useNotes] Creating note:', noteData);
      const docRef = await addDoc(collection(db, 'notes'), noteData);
      debugLog('[useNotes] ✅ Note created successfully with ID:', docRef.id);
      return docRef.id;
      } catch (error) {
        reportAppError({ message: 'Не удалось создать заметку', error, context: 'useNotes.createNote' });
        throw error;
      }
    };

  const upsertLectureNote = useCallback(async (content: string, context: LectureNoteContext) => {
    if (!user) {
      debugError('[useNotes] Cannot upsert lecture note: user not authenticated');
      throw new Error('User not authenticated');
    }

    try {
      const normalizedAgeRange = normalizeAgeRange(context.periodId);
      const lectureDocId = buildLectureNoteDocumentId(user.uid, context);
      const noteRef = doc(db, 'notes', lectureDocId);
      const existingNote = await getDoc(noteRef);
      const payload = {
        userId: user.uid,
        title: context.lectureTitle || 'Без названия',
        content: content || '',
        ageRange: normalizedAgeRange,
        periodId: context.periodId,
        periodKey: buildNotePeriodKey(context.courseId, context.periodId),
        periodTitle: context.periodTitle || (normalizedAgeRange ? AGE_RANGE_LABELS[normalizedAgeRange] : null),
        courseId: context.courseId,
        noteScope: 'lecture' as const,
        lectureVideoId: context.lectureVideoId,
        lectureKey: buildLectureNoteKey(context),
        topicId: null,
        topicTitle: null,
        updatedAt: serverTimestamp(),
      };

      if (existingNote.exists()) {
        await updateDoc(noteRef, payload);
        return lectureDocId;
      }

      await setDoc(noteRef, {
        ...payload,
        createdAt: serverTimestamp(),
      });
      return lectureDocId;
    } catch (error) {
      reportAppError({ message: 'Не удалось сохранить заметку по лекции', error, context: 'useNotes.upsertLectureNote' });
      throw error;
    }
  }, [user]);

  const createManualNote = async (
    title: string,
    content: string,
    context: ManualNoteContext,
    topicId: string | null = null,
    topicTitle: string | null = null
  ) => {
    if (!user) {
      debugError('[useNotes] Cannot create manual note: user not authenticated');
      throw new Error('User not authenticated');
    }

    try {
      const normalizedAgeRange = normalizeAgeRange(context.periodId);
      const noteData = {
        userId: user.uid,
        title: title || 'Без названия',
        content: content || '',
        ageRange: normalizedAgeRange,
        periodId: context.periodId,
        periodKey: buildNotePeriodKey(context.courseId, context.periodId),
        periodTitle: context.periodTitle,
        courseId: context.courseId,
        noteScope: 'manual' as const,
        lectureVideoId: null,
        lectureKey: null,
        topicId: topicId || null,
        topicTitle: topicTitle || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'notes'), noteData);
      return docRef.id;
    } catch (error) {
      reportAppError({ message: 'Не удалось создать заметку', error, context: 'useNotes.createManualNote' });
      throw error;
    }
  };

  const getLectureNote = useCallback(async (context: LectureNoteContext) => {
    if (!user) {
      return null;
    }

    try {
      const lectureDocId = buildLectureNoteDocumentId(user.uid, context);
      const noteRef = doc(db, 'notes', lectureDocId);
      const noteSnap = await getDoc(noteRef);

      if (!noteSnap.exists()) {
        return null;
      }

      return mapNoteRecord(lectureDocId, noteSnap.data());
    } catch (error) {
      reportAppError({ message: 'Не удалось загрузить заметку по лекции', error, context: 'useNotes.getLectureNote' });
      throw error;
    }
  }, [user]);

  const updateNote = async (noteId: string, updates: NoteUpdatePayload) => {
    try {
      const noteRef = doc(db, 'notes', noteId);
      debugLog('[useNotes] Updating note:', noteId, updates);
      const normalizedUpdates: NoteUpdatePayload = {
        ...updates,
      };

      let normalizedAgeRange: AgeRange | null | undefined;
      if ('ageRange' in normalizedUpdates) {
        normalizedAgeRange = normalizeAgeRange(normalizedUpdates.ageRange ?? null);
        normalizedUpdates.ageRange = normalizedAgeRange;
      }

      const payload: Record<string, unknown> = {
        ...normalizedUpdates,
        updatedAt: serverTimestamp(),
      };

      if ('ageRange' in normalizedUpdates) {
        payload.periodId = normalizedAgeRange ?? null;
        payload.periodTitle = normalizedAgeRange ? AGE_RANGE_LABELS[normalizedAgeRange] : null;
      }

      const nextCourseId =
        typeof normalizedUpdates.courseId === 'string' ? normalizedUpdates.courseId :
        typeof updates.courseId === 'string' ? updates.courseId :
        null;
      const nextPeriodId =
        typeof normalizedUpdates.periodId === 'string' ? normalizedUpdates.periodId :
        typeof payload.periodId === 'string' ? (payload.periodId as string) :
        null;

      if (nextCourseId && nextPeriodId) {
        payload.periodKey = buildNotePeriodKey(nextCourseId, nextPeriodId);
      }

      if ('topicId' in normalizedUpdates && !normalizedUpdates.topicId) {
        payload.topicTitle = null;
      } else if ('topicTitle' in normalizedUpdates) {
        payload.topicTitle = normalizedUpdates.topicTitle ?? null;
      }

      await updateDoc(noteRef, payload);
      debugLog('[useNotes] ✅ Note updated successfully');
    } catch (error) {
      reportAppError({ message: 'Не удалось обновить заметку', error, context: 'useNotes.updateNote' });
      throw error;
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      debugLog('[useNotes] Deleting note:', noteId);
      await deleteDoc(doc(db, 'notes', noteId));
      debugLog('[useNotes] ✅ Note deleted successfully');
    } catch (error) {
      reportAppError({ message: 'Не удалось удалить заметку', error, context: 'useNotes.deleteNote' });
      throw error;
    }
  };

  return {
    notes,
    loading,
    error,
    createNote,
    createManualNote,
    getLectureNote,
    upsertLectureNote,
    updateNote,
    deleteNote,
  };
}
