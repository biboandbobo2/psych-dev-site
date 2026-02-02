import { collection, doc, type CollectionReference, type DocumentReference } from 'firebase/firestore';
import { db } from './firebase';
import type { Period } from '../types/content';
import { CORE_COURSE_META, isCoreCourse } from '../constants/courses';

export function getCourseLessonsCollectionRef(courseId: string): CollectionReference<Period> {
  if (isCoreCourse(courseId)) {
    return collection(db, CORE_COURSE_META[courseId].collection) as CollectionReference<Period>;
  }
  return collection(db, 'courses', courseId, 'lessons') as CollectionReference<Period>;
}

export function getCourseLessonDocRef(courseId: string, periodId: string): DocumentReference<Period> {
  if (isCoreCourse(courseId)) {
    return doc(db, CORE_COURSE_META[courseId].collection, periodId) as DocumentReference<Period>;
  }
  return doc(db, 'courses', courseId, 'lessons', periodId) as DocumentReference<Period>;
}
