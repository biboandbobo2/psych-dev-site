import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthProvider';
import { type Note, type AgeRange, AGE_RANGE_ORDER, AGE_RANGE_LABELS } from '../types/notes';

const LEGACY_AGE_RANGE_MAP: Record<string, AgeRange> = {
  'early-childhood': 'infancy',
};

const VALID_AGE_RANGES = new Set<AgeRange>(AGE_RANGE_ORDER);

const normalizeAgeRangeValue = (value: unknown): AgeRange | null => {
  if (!value) return null;
  if (typeof value !== 'string') return null;

  const mapped = LEGACY_AGE_RANGE_MAP[value] ?? value;
  if (mapped && VALID_AGE_RANGES.has(mapped as AgeRange)) {
    return mapped as AgeRange;
  }

  return null;
};

export function useNotes(ageRangeFilter?: AgeRange | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    let notesQuery;

    if (ageRangeFilter !== undefined && ageRangeFilter !== null) {
      notesQuery = query(
        collection(db, 'notes'),
        where('userId', '==', user.uid),
        where('ageRange', '==', ageRangeFilter)
      );
    } else {
      notesQuery = query(collection(db, 'notes'), where('userId', '==', user.uid));
    }

    console.log('Starting notes listener for user:', user.uid, 'ageRange:', ageRangeFilter);

    const unsubscribe = onSnapshot(
      notesQuery,
      (snapshot) => {
        console.log('Received notes snapshot:', snapshot.size, 'documents');

        let notesData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          console.log('Note document:', docSnap.id, data);
          const ageRange = normalizeAgeRangeValue(data.ageRange ?? data.periodId);
          const periodId = normalizeAgeRangeValue(data.periodId ?? ageRange);
          const periodTitle = data.periodTitle ?? (periodId ? AGE_RANGE_LABELS[periodId] : null);
          return {
            id: docSnap.id,
            userId: data.userId || '',
            title: data.title || 'Без названия',
            content: data.content || '',
            ageRange,
            periodId: periodId ?? null,
            periodTitle: periodTitle ?? null,
            topicId: data.topicId || null,
            topicTitle: data.topicTitle ?? null,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
          } as Note;
        });

        notesData = notesData.sort((a, b) => {
          const dateA = a.updatedAt?.getTime?.() || 0;
          const dateB = b.updatedAt?.getTime?.() || 0;
          return dateB - dateA;
        });

        console.log('Sorted notes:', notesData.length, 'total');
        setNotes(notesData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error loading notes:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up notes listener');
      unsubscribe();
    };
  }, [user, ageRangeFilter]);

  const createNote = async (
    title: string,
    content: string,
    ageRange: AgeRange | null = null,
    topicId: string | null = null,
    topicTitle: string | null = null
  ) => {
    if (!user) {
      console.error('Cannot create note: user not authenticated');
      throw new Error('User not authenticated');
    }

    try {
      const normalizedAgeRange = normalizeAgeRangeValue(ageRange);
      const derivedPeriodTitle = normalizedAgeRange ? AGE_RANGE_LABELS[normalizedAgeRange] : null;
      const noteData = {
        userId: user.uid,
        title: title || 'Без названия',
        content: content || '',
        ageRange: normalizedAgeRange,
        periodId: normalizedAgeRange ?? null,
        periodTitle: derivedPeriodTitle,
        topicId: topicId || null,
        topicTitle: topicTitle || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('Creating note:', noteData);
      const docRef = await addDoc(collection(db, 'notes'), noteData);
      console.log('✅ Note created successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating note:', error);
      throw error;
    }
  };

  const updateNote = async (
    noteId: string,
    updates: Partial<Pick<Note, 'title' | 'content' | 'ageRange' | 'topicId' | 'topicTitle'>>
  ) => {
    try {
      const noteRef = doc(db, 'notes', noteId);
      console.log('Updating note:', noteId, updates);
      const normalizedUpdates: Partial<Pick<Note, 'title' | 'content' | 'ageRange' | 'topicId' | 'topicTitle'>> = {
        ...updates,
      };

      let normalizedAgeRange: AgeRange | null | undefined;
      if ('ageRange' in normalizedUpdates) {
        normalizedAgeRange = normalizeAgeRangeValue(normalizedUpdates.ageRange ?? null);
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

      if ('topicId' in normalizedUpdates && !normalizedUpdates.topicId) {
        payload.topicTitle = null;
      } else if ('topicTitle' in normalizedUpdates) {
        payload.topicTitle = normalizedUpdates.topicTitle ?? null;
      }

      await updateDoc(noteRef, payload);
      console.log('✅ Note updated successfully');
    } catch (error) {
      console.error('❌ Error updating note:', error);
      throw error;
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      console.log('Deleting note:', noteId);
      await deleteDoc(doc(db, 'notes', noteId));
      console.log('✅ Note deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting note:', error);
      throw error;
    }
  };

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
  };
}
