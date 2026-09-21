/**
 * Ответ callable-функции `getCourseStudents` — единственный способ для админа
 * курса (внешнего автора) увидеть своих студентов: коллекция `users/*` ему
 * больше не читается, а функция отдаёт только публичный минимум полей.
 */
export interface CourseStudent {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  /** ISO-строка последнего входа. */
  lastLoginAt: string | null;
  /** Приглашён массово (pending_*), но ещё не зарегистрировался. */
  pendingRegistration: boolean;
  disabled: boolean;
}

export interface CourseStudentsGroup {
  id: string;
  name: string;
  students: CourseStudent[];
}

export interface CourseStudentsResponse {
  courseId: string;
  /** Несистемные группы, у которых `grantedCourses` содержит курс. */
  groups: CourseStudentsGroup[];
  /** Студенты с индивидуальным `courseAccess[courseId]`, вне групп выше. */
  individual: CourseStudent[];
}

/** Как показывать студента в списках: имя → почта → uid. */
export function courseStudentLabel(student: CourseStudent): string {
  return student.displayName?.trim() || student.email || student.uid;
}
