import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthProvider';
import { type AgeRange, type Topic, type TopicInput } from '../types/notes';

export function useTopics(ageRangeFilter?: AgeRange | null) {
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalizedRange = ageRangeFilter === 'early-childhood' ? 'infancy' : ageRangeFilter;
    let topicsQuery;

    if (normalizedRange) {
      topicsQuery = query(collection(db, 'topics'), where('ageRange', '==', normalizedRange));
    } else {
      topicsQuery = query(collection(db, 'topics'));
    }

    const unsubscribe = onSnapshot(
      topicsQuery,
      (snapshot) => {
        let nextTopics: Topic[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ageRange: data.ageRange,
            text: data.text ?? '',
            order: data.order ?? 0,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            createdBy: data.createdBy,
          };
        });

        nextTopics = nextTopics.sort((a, b) => a.order - b.order);
        setTopics(nextTopics);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error loading topics:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ageRangeFilter]);

  const createTopic = async (topic: TopicInput) => {
    if (!user) throw new Error('User not authenticated');

    const docData = {
      ageRange: topic.ageRange,
      text: topic.text,
      order: topic.order,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
    };

    const docRef = await addDoc(collection(db, 'topics'), docData);
    console.log('✅ Topic created with ID:', docRef.id);
    return docRef.id;
  };

  const createTopicsBulk = async (topicsInput: TopicInput[]) => {
    if (!user) throw new Error('User not authenticated');

    const batch = writeBatch(db);

    topicsInput.forEach((topic) => {
      const docRef = doc(collection(db, 'topics'));
      batch.set(docRef, {
        ageRange: topic.ageRange,
        text: topic.text,
        order: topic.order,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
    });

    await batch.commit();
    console.log('✅ Created', topicsInput.length, 'topics');
  };

  const updateTopic = async (
    topicId: string,
    updates: Partial<Pick<Topic, 'text' | 'order' | 'ageRange'>>
  ) => {
    const topicRef = doc(db, 'topics', topicId);
    await updateDoc(topicRef, updates);
    console.log('✅ Topic updated');
  };

  const deleteTopic = async (topicId: string) => {
    await deleteDoc(doc(db, 'topics', topicId));
    console.log('✅ Topic deleted');
  };

  return {
    topics,
    loading,
    error,
    createTopic,
    createTopicsBulk,
    updateTopic,
    deleteTopic,
  };
}
