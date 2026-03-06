import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  type CollectionReference,
  type DocumentReference,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Period } from '../types/content';
import { CORE_COURSE_META, isCoreCourse } from '../constants/courses';
import { canonicalizePeriodId } from './firestoreHelpers';

const normalizeLessonId = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export function getCourseLessonsCollectionRef(courseId: string): CollectionReference<Period> {
  if (isCoreCourse(courseId)) {
    return collection(db, CORE_COURSE_META[courseId].collection) as CollectionReference<Period>;
  }
  return collection(db, 'courses', courseId, 'lessons') as CollectionReference<Period>;
}

export function getCourseLessonDocRef(courseId: string, periodId: string): DocumentReference<Period> {
  if (isCoreCourse(courseId)) {
    const lessonId = courseId === 'development' ? canonicalizePeriodId(periodId) : periodId;
    return doc(db, CORE_COURSE_META[courseId].collection, lessonId) as DocumentReference<Period>;
  }
  return doc(db, 'courses', courseId, 'lessons', periodId) as DocumentReference<Period>;
}

export function getCanonicalCourseLessonId(
  courseId: string,
  docId: string,
  data?: Partial<Period> | null
): string {
  const storedLessonId = normalizeLessonId(data?.period);
  const fallbackLessonId = normalizeLessonId(docId);
  const resolvedLessonId = storedLessonId || fallbackLessonId;

  return courseId === 'development'
    ? canonicalizePeriodId(resolvedLessonId)
    : resolvedLessonId;
}

export async function findCourseLessonDoc(
  courseId: string,
  lessonId: string
): Promise<{ ref: DocumentReference<Period>; snapshot: DocumentSnapshot<Period> } | null> {
  const directRef = getCourseLessonDocRef(courseId, lessonId);
  const directSnapshot = await getDoc(directRef);

  if (directSnapshot.exists()) {
    return { ref: directRef, snapshot: directSnapshot };
  }

  if (!isCoreCourse(courseId)) {
    return null;
  }

  const normalizedLessonId = normalizeLessonId(lessonId);
  if (!normalizedLessonId) {
    return null;
  }

  const lessonsRef = getCourseLessonsCollectionRef(courseId);
  const snapshot = await getDocs(
    query(lessonsRef, where('period', '==', normalizedLessonId), limit(1))
  );

  if (snapshot.empty) {
    return null;
  }

  const matchedDoc = snapshot.docs[0];
  return {
    ref: matchedDoc.ref as DocumentReference<Period>,
    snapshot: matchedDoc,
  };
}
