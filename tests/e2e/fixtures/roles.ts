/**
 * Фикстуры ролевого e2e-стенда (HP-2): единый источник истины для
 * scripts/seedEmulatorRoles.ts, setup-логина и ролевых спеков.
 * Роли — из таблицы docs/plans/role-smoke-harness.md.
 *
 * Устройство изоляции (проверено эмпирически 2026-08-29):
 * - Auth-эмулятор роутит ВСЕ клиентские запросы в default-проект
 *   (`getProjectIdByApiKey` в firebase-tools игнорирует API-ключ),
 *   поэтому auth-пользователи всегда живут в SMOKE_AUTH_PROJECT;
 * - Firestore-эмулятор держит несколько проектов одновременно и принимает
 *   idToken чужого проекта (aud не сверяется) — данные сидятся в песочницы;
 * - префикс demo-* гарантирует полностью оффлайновый режим эмулятора.
 */

/** Default-проект эмулятора: auth-пользователи + базовая песочница Firestore. */
export const SMOKE_AUTH_PROJECT = "demo-smoke";

/** Порт dev-сервера стенда (vite с VITE_USE_FIREBASE_EMULATORS=true). */
export const SMOKE_DEV_PORT = 4180;

/** Единый пароль всех ролей (только эмулятор, в проде не существует). */
export const SMOKE_PASSWORD = "smoke-pass-1";

/** Полный id песочницы Firestore из суффикса (`a` → `demo-smoke-a`). */
export function sandboxProjectId(suffix?: string): string {
  if (!suffix || suffix === SMOKE_AUTH_PROJECT) return SMOKE_AUTH_PROJECT;
  return suffix.startsWith("demo-") ? suffix : `${SMOKE_AUTH_PROJECT}-${suffix}`;
}

export interface SmokeRole {
  /** Ключ роли: имя playwright-проекта smoke:<key> и файла спека. */
  key: string;
  uid: string;
  email: string;
  displayName: string;
  /** Custom claims (источник истины для firestore.rules); null — без claims. */
  claims: Record<string, unknown> | null;
  /** Поля users/{uid} в Firestore-песочнице; null — док не создаётся. */
  userDoc: Record<string, unknown> | null;
}

/**
 * Гость в списке отсутствует — это отсутствие авторизации
 * (покрыт tests/e2e/production-smoke.spec.ts).
 */
export const SMOKE_ROLES = {
  /** Студент без доступа: auth-юзер + users-док без courseAccess. */
  studentNoAccess: {
    key: "student-no-access",
    uid: "smoke-student-no-access",
    email: "student-no-access@smoke.test",
    displayName: "Студент Без Доступа",
    claims: null,
    userDoc: {},
  },
  /** Студент курса: индивидуальный courseAccess.development. */
  studentCourse: {
    key: "student-course",
    uid: "smoke-student-course",
    email: "student-course@smoke.test",
    displayName: "Студент Курса",
    claims: null,
    userDoc: { courseAccess: { development: true } },
  },
  /** Студент группы: доступ к clinical только через groups.grantedCourses. */
  studentGroup: {
    key: "student-group",
    uid: "smoke-student-group",
    email: "student-group@smoke.test",
    displayName: "Студент Группы",
    claims: null,
    userDoc: {},
  },
  /**
   * Студент внешнего курса «лично»: courseAccess.external-x и ни одного потока.
   * Секция «Индивидуально» на /admin/students.
   */
  studentExternal: {
    key: "student-external",
    uid: "smoke-student-external",
    email: "student-external@smoke.test",
    displayName: "Студент Внешнего Курса",
    claims: null,
    userDoc: { courseAccess: { "external-x": true } },
  },
  /**
   * Студент потока внешнего курса: доступ только через SMOKE_EXTERNAL_GROUP.
   * Секция потока на /admin/students.
   */
  studentExternalStream: {
    key: "student-external-stream",
    uid: "smoke-student-external-stream",
    email: "student-external-stream@smoke.test",
    displayName: "Студент Потока Икс",
    claims: null,
    userDoc: {},
  },
  /** Админ курса external-x (кабинет автора): claim + зеркало обязательны оба. */
  author: {
    key: "author",
    uid: "smoke-author",
    email: "author@smoke.test",
    displayName: "Автор Внешнего Курса",
    claims: { role: "admin", editableCourses: ["external-x"] },
    userDoc: { role: "admin", adminEditableCourses: ["external-x"] },
  },
  /** Админ без курсов: роль есть, editableCourses пуст. */
  adminEmpty: {
    key: "admin-empty",
    uid: "smoke-admin-empty",
    email: "admin-empty@smoke.test",
    displayName: "Админ Без Курсов",
    claims: { role: "admin", editableCourses: [] },
    userDoc: { role: "admin", adminEditableCourses: [] },
  },
  /** Co-admin страниц DOM Academy: параллельный флаг, не role. */
  coAdmin: {
    key: "coadmin",
    uid: "smoke-coadmin",
    email: "coadmin@smoke.test",
    displayName: "Ко-Админ Страниц",
    claims: { coAdmin: true },
    userDoc: { coAdmin: true },
  },
  /**
   * Кандидат в авторы: обычный пользователь без ролей. Сценарии
   * `tests/e2e/roles/functions-admin.spec.ts` повышают его через реальные
   * Cloud Functions и снимают права обратно; сид возвращает его в это
   * исходное состояние на каждом прогоне.
   */
  promotee: {
    key: "promotee",
    uid: "smoke-promotee",
    email: "promotee@smoke.test",
    displayName: "Кандидат В Авторы",
    claims: null,
    userDoc: {},
  },
  /** Super-admin распознаётся по email (src/constants/superAdmin.ts и rules). */
  superAdmin: {
    key: "superadmin",
    uid: "smoke-superadmin",
    email: "biboandbobo2@gmail.com",
    displayName: "Супер Админ",
    claims: null,
    userDoc: { role: "super-admin" },
  },
} satisfies Record<string, SmokeRole>;

export const SMOKE_ROLE_LIST: SmokeRole[] = Object.values(SMOKE_ROLES);

/** Динамические курсы стенда (core development/clinical синтезируются сами). */
export const SMOKE_COURSES = {
  /**
   * Core-курсы закреплены фикстурами с каноническими именами: в режиме
   * --prod-data «фикстура побеждает прод», и сценарии не зависят от того,
   * как курс сейчас называется в проде (например, clinical там переименован).
   */
  development: {
    id: "development",
    doc: { name: "Психология развития", icon: "🧠", order: 0, published: true },
    lessons: [],
  },
  clinical: {
    id: "clinical",
    doc: { name: "Клиническая психология", icon: "🩺", order: 1, published: true },
    lessons: [],
  },
  general: {
    id: "general",
    doc: { name: "Общая психология", icon: "📚", order: 2, published: true },
    lessons: [],
  },
  externalX: {
    id: "external-x",
    doc: { name: "Внешний курс X", icon: "🧪", order: 110, published: true },
    /** courses/external-x/lessons/{id} */
    lessons: [
      { id: "ext-x-lesson-1", title: "Занятие 1. Введение", order: 1, published: true },
      { id: "ext-x-lesson-2", title: "Занятие 2. Практика", order: 2, published: true },
      { id: "ext-x-lesson-3", title: "Занятие 3. Черновик", order: 3, published: false },
    ],
  },
  externalHidden: {
    id: "external-hidden",
    doc: { name: "Скрытый курс", icon: "🕳️", order: 120, published: false },
    lessons: [
      { id: "ext-h-lesson-1", title: "Скрытое занятие 1", order: 1, published: true },
      { id: "ext-h-lesson-2", title: "Скрытое занятие 2", order: 2, published: false },
    ],
  },
} as const;

/** Занятия core-курсов: development → periods, clinical → clinical-topics. */
export const SMOKE_CORE_LESSONS = {
  development: [
    { id: "smoke-dev-1", title: "Младенчество (смоук)", order: 1, published: true },
    { id: "smoke-dev-2", title: "Раннее детство (смоук)", order: 2, published: true },
  ],
  clinical: [
    {
      id: "smoke-clin-1",
      title: "Неврозы (смоук)",
      order: 1,
      published: true,
      // Видео нужно ролевому e2e: PaywallGuard рендерится только вокруг него
      // (регрессия «замок после F5»).
      sections: {
        video_section: {
          title: "Видео-лекция",
          content: [{ title: "Лекция (смоук)", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }],
        },
      },
    },
    { id: "smoke-clin-2", title: "ПРЛ (смоук)", order: 2, published: true },
  ],
} as const;

/** Группа, открывающая студенту группы курс clinical. */
export const SMOKE_GROUP = {
  id: "smoke-group",
  name: "Смоук-группа",
  memberIds: [SMOKE_ROLES.studentGroup.uid],
  grantedCourses: ["clinical"],
  announcementAdminIds: [] as string[],
} as const;

/**
 * Поток внешнего курса: даёт external-x своим участникам и виден автору курса
 * на /admin/students. Автор в announcementAdminIds — чтобы в шапке потока
 * рендерилась кнопка «Объявление потоку».
 */
export const SMOKE_EXTERNAL_GROUP = {
  id: "smoke-external-group",
  name: "Поток внешнего курса",
  memberIds: [SMOKE_ROLES.studentExternalStream.uid],
  grantedCourses: ["external-x"],
  announcementAdminIds: [SMOKE_ROLES.author.uid],
} as const;

/** Все несистемные группы стенда. */
export const SMOKE_GROUPS = [SMOKE_GROUP, SMOKE_EXTERNAL_GROUP] as const;

/**
 * Прогресс просмотра: users/{uid}/courseProgress/{courseId}. У external-x
 * опубликованы 2 занятия из 3, поэтому потоковый студент даёт «2 / 2»,
 * индивидуальный — «1 / 2».
 */
export const SMOKE_COURSE_PROGRESS = [
  {
    uid: SMOKE_ROLES.studentExternalStream.uid,
    courseId: "external-x",
    watchedLessonIds: ["ext-x-lesson-1", "ext-x-lesson-2"],
  },
  {
    uid: SMOKE_ROLES.studentExternal.uid,
    courseId: "external-x",
    watchedLessonIds: ["ext-x-lesson-1"],
  },
] as const;

/** lectureQuestions: по вопросу на external-x и development. */
export const SMOKE_LECTURE_QUESTIONS = [
  {
    id: "smoke-q-ext",
    courseId: "external-x",
    periodId: "ext-x-lesson-1",
    periodTitle: "Занятие 1. Введение",
    lectureTitle: "Введение",
    text: "Вопрос студента по внешнему курсу X",
    authorUid: SMOKE_ROLES.studentGroup.uid,
    authorName: SMOKE_ROLES.studentGroup.displayName,
    visibility: "lecturers",
  },
  {
    id: "smoke-q-dev",
    courseId: "development",
    periodId: "smoke-dev-1",
    periodTitle: "Младенчество (смоук)",
    lectureTitle: "Младенчество",
    text: "Вопрос студента по dev-курсу",
    authorUid: SMOKE_ROLES.studentCourse.uid,
    authorName: SMOKE_ROLES.studentCourse.displayName,
    visibility: "lecturers",
  },
] as const;

/**
 * feature_events для проверки сводки телеметрии: события external-x должны
 * быть видны автору, события development и без courseId — только супер-админу.
 * daysAgo — смещение от момента сида (все внутри окна 4 недель).
 */
export const SMOKE_FEATURE_EVENTS = [
  { id: "smoke-ev-1", event: "test_started", courseId: "external-x", hashedUid: "smoke-hash-s1", platform: "desktop", daysAgo: 2 },
  { id: "smoke-ev-2", event: "test_completed", courseId: "external-x", hashedUid: "smoke-hash-s1", platform: "desktop", daysAgo: 2 },
  { id: "smoke-ev-3", event: "study_mode_opened", courseId: "external-x", hashedUid: "smoke-hash-s2", platform: "mobile", daysAgo: 6 },
  { id: "smoke-ev-4", event: "test_started", courseId: "development", hashedUid: "smoke-hash-s3", platform: "desktop", daysAgo: 3 },
  { id: "smoke-ev-5", event: "transcript_opened", courseId: "clinical", hashedUid: "smoke-hash-s4", platform: "mobile", daysAgo: 5 },
  { id: "smoke-ev-6", event: "research_search", hashedUid: "smoke-hash-s5", platform: "desktop", daysAgo: 1 },
] as const;
