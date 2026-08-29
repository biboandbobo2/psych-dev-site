/**
 * Сид ролей и контента для Firebase-эмуляторов (стенд ролевого смоука, HP-2).
 *
 * Источник истины по ролям и контенту — `tests/e2e/fixtures/roles.ts`.
 * Скрипт работает ТОЛЬКО с эмулятором: хосты выставляются жёстко,
 * credentials не нужны и не читаются.
 *
 * Устройство изоляции:
 *  - Auth-эмулятор роутит все клиентские запросы в default-проект, поэтому
 *    пользователи всегда создаются в `SMOKE_AUTH_PROJECT` (demo-smoke);
 *  - Firestore-данные пишутся в песочницу `--project` (суффикс `a` →
 *    `demo-smoke-a`), что позволяет гонять роли параллельно.
 *
 * Запуск:
 *   npx tsx scripts/seedEmulatorRoles.ts                    # песочница demo-smoke
 *   npx tsx scripts/seedEmulatorRoles.ts --project a        # песочница demo-smoke-a
 *   npx tsx scripts/seedEmulatorRoles.ts --project a --reset # с очисткой песочницы
 */
import { initializeApp, deleteApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';

import {
  SMOKE_AUTH_PROJECT,
  SMOKE_CORE_LESSONS,
  SMOKE_COURSES,
  SMOKE_FEATURE_EVENTS,
  SMOKE_GROUP,
  SMOKE_LECTURE_QUESTIONS,
  SMOKE_PASSWORD,
  SMOKE_ROLE_LIST,
  sandboxProjectId,
} from '../tests/e2e/fixtures/roles';

const TAG = '[seed-roles]';
const AUTH_HOST = '127.0.0.1:9099';
const FIRESTORE_HOST = '127.0.0.1:8080';
const FUNCTIONS_HOST = '127.0.0.1:5001';
/** Потолок ожидания gen1-триггера onUserCreate (обычно отрабатывает за ~300 мс). */
const TRIGGER_WAIT_MS = 6000;

// Только эмулятор: admin SDK читает эти переменные при первом обращении,
// поэтому выставляем их до любого initializeApp (он живёт в main()).
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_HOST;
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_HOST;
// Защита от прода: ключ сервис-аккаунта не должен участвовать вообще.
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log(`${TAG} GOOGLE_APPLICATION_CREDENTIALS обнулён — сид работает только с эмулятором`);
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

/** Коллекции занятий core-курсов (динамические курсы держат их в `lessons`). */
const CORE_LESSON_COLLECTIONS = {
  development: 'periods',
  clinical: 'clinical-topics',
} as const;

interface SeedArgs {
  /** Полный projectId песочницы Firestore. */
  sandbox: string;
  reset: boolean;
}

function parseArgs(): SeedArgs {
  const argv = process.argv.slice(2);
  const projectIdx = argv.indexOf('--project');
  let suffix: string | undefined;

  if (projectIdx !== -1) {
    suffix = argv[projectIdx + 1];
    if (!suffix || suffix.startsWith('--')) {
      throw new Error('--project требует значение, например: --project a');
    }
  }

  return { sandbox: sandboxProjectId(suffix), reset: argv.includes('--reset') };
}

/** Падаем понятной ошибкой, если эмулятор не поднят. */
async function assertEmulatorUp(host: string, label: string): Promise<void> {
  try {
    const res = await fetch(`http://${host}/`, { signal: AbortSignal.timeout(3000) });
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `${label}-эмулятор не запущен на ${host} (${reason}). Подними его: npm run firebase:emulators:start`
    );
  }
}

/** Стенд поднят с --with-functions → на createUser сработает onUserCreate. */
async function isFunctionsEmulatorUp(): Promise<boolean> {
  try {
    const res = await fetch(`http://${FUNCTIONS_HOST}/`, { signal: AbortSignal.timeout(1000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

/**
 * gen1-триггер onUserCreate перезаписывает users/{uid} и claims ролью guest,
 * поэтому при живом functions-эмуляторе сид сначала даёт ему отработать по всем
 * созданным пользователям и только потом пишет свои claims и доки. Признак
 * завершения — claim `role`, который триггер выставляет последним шагом.
 */
async function waitForUserCreateTrigger(auth: ReturnType<typeof getAuth>, uids: string[]): Promise<void> {
  const deadline = Date.now() + TRIGGER_WAIT_MS;
  const pending = new Set(uids);
  while (pending.size && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    for (const uid of [...pending]) {
      const record = await auth.getUser(uid).catch(() => null);
      if (record?.customClaims?.role) pending.delete(uid);
    }
  }
  console.log(
    pending.size
      ? `${TAG} onUserCreate не отметился у ${pending.size} польз. за ${TRIGGER_WAIT_MS} мс — иду дальше`
      : `${TAG} onUserCreate отработал по ${uids.length} новым пользователям`
  );
}

/** Чистит Firestore-песочницу целиком (auth-пользователи не трогаются). */
async function resetSandbox(projectId: string): Promise<void> {
  const url = `http://${FIRESTORE_HOST}/emulator/v1/projects/${projectId}/databases/(default)/documents`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(`Не удалось очистить песочницу ${projectId}: HTTP ${res.status}`);
  }
  console.log(`${TAG} песочница ${projectId} очищена`);
}

/**
 * Создаёт auth-пользователей всех ролей. uid фиксированы, поэтому повторный
 * запуск идемпотентен. Существующего пользователя НЕ трогаем без расхождений:
 * updateUser({password}) ревокает живые сессии, и параллельный прогон в
 * соседней песочнице вылетает на /login (auth-проект у прогонов общий).
 */
async function seedAuthUsers(app: App): Promise<number> {
  const auth = getAuth(app);
  let created = 0;
  let updated = 0;
  let untouched = 0;
  /** uid'ы, созданные этим прогоном: по ним мог отработать onUserCreate. */
  const createdUids: string[] = [];
  const claimsBefore = new Map<string, Record<string, unknown>>();

  for (const role of SMOKE_ROLE_LIST) {
    let existing = await auth.getUser(role.uid).catch((err: unknown) => {
      if ((err as { code?: string }).code === 'auth/user-not-found') return null;
      throw err;
    });

    if (!existing) {
      try {
        await auth.createUser({
          uid: role.uid,
          email: role.email,
          password: SMOKE_PASSWORD,
          displayName: role.displayName,
          emailVerified: true,
        });
        created++;
      } catch (err) {
        // Гонка с параллельным сидом: юзера успел создать сосед — это ок.
        if ((err as { code?: string }).code !== 'auth/uid-already-exists') throw err;
        existing = await auth.getUser(role.uid);
      }
    }

    if (existing) {
      // Пароль не сравнить и не перевыставить без ревокации сессий; он
      // константа SMOKE_PASSWORD и задаётся при создании. Обновляем только
      // реально разъехавшиеся профильные поля (фикстуры поменялись).
      if (existing.email !== role.email || existing.displayName !== role.displayName) {
        await auth.updateUser(role.uid, { email: role.email, displayName: role.displayName });
        updated++;
      } else {
        untouched++;
      }
    }

    if (existing) claimsBefore.set(role.uid, existing.customClaims ?? {});
    else createdUids.push(role.uid);
    console.log(`${TAG}   ${role.key} → ${role.email} (${existing ? 'на месте' : 'создан'})`);
  }

  // Claims ставим вторым проходом: у новых пользователей их перед этим успевает
  // перезаписать onUserCreate (только при живом functions-эмуляторе).
  if (createdUids.length && (await isFunctionsEmulatorUp())) {
    await waitForUserCreateTrigger(auth, createdUids);
  }
  for (const role of SMOKE_ROLE_LIST) {
    const wantedClaims = role.claims ?? {};
    const currentClaims = claimsBefore.get(role.uid);
    // Для только что созданных актуальные claims неизвестны — пишем всегда.
    if (!currentClaims || JSON.stringify(currentClaims) !== JSON.stringify(wantedClaims)) {
      await auth.setCustomUserClaims(role.uid, wantedClaims);
    }
  }

  console.log(`${TAG} auth: создано ${created}, обновлено ${updated}, не тронуто ${untouched}`);
  return created + updated + untouched;
}

/** users/{uid}: зеркало роли + базовые профильные поля. */
async function seedUserDocs(db: Firestore, now: Timestamp): Promise<number> {
  let count = 0;
  for (const role of SMOKE_ROLE_LIST) {
    if (!role.userDoc) continue;
    await db.doc(`users/${role.uid}`).set({
      ...role.userDoc,
      uid: role.uid,
      email: role.email,
      displayName: role.displayName,
      createdAt: now,
      lastLoginAt: now,
    });
    count++;
  }
  return count;
}

/**
 * courses/{id} + courses/{id}/lessons/{lessonId}. Занятия, которых нет в
 * фикстурах, удаляются: сценарии умеют создавать занятия через UI, и без
 * уборки повторный прогон падал бы на «занятие с таким ID уже существует».
 */
async function seedCourses(db: Firestore): Promise<number> {
  let count = 0;
  for (const course of Object.values(SMOKE_COURSES)) {
    await db.doc(`courses/${course.id}`).set({ ...course.doc });
    count++;
    const wanted = new Set<string>();
    for (const lesson of course.lessons) {
      await db.doc(`courses/${course.id}/lessons/${lesson.id}`).set({
        title: lesson.title,
        order: lesson.order,
        published: lesson.published,
      });
      wanted.add(lesson.id);
      count++;
    }
    const existing = await db.collection(`courses/${course.id}/lessons`).get();
    for (const doc of existing.docs) {
      if (wanted.has(doc.id)) continue;
      await doc.ref.delete();
      console.log(`${TAG} удалено лишнее занятие courses/${course.id}/lessons/${doc.id}`);
    }
  }
  return count;
}

/** Занятия core-курсов: development → periods, clinical → clinical-topics. */
async function seedCoreLessons(db: Firestore): Promise<number> {
  let count = 0;
  for (const [courseId, lessons] of Object.entries(SMOKE_CORE_LESSONS)) {
    const collection = CORE_LESSON_COLLECTIONS[courseId as keyof typeof CORE_LESSON_COLLECTIONS];
    for (const lesson of lessons) {
      await db.doc(`${collection}/${lesson.id}`).set({
        title: lesson.title,
        order: lesson.order,
        published: lesson.published,
      });
      count++;
    }
  }
  return count;
}

/** Группа: все пять полей обязательны — rules читают их без guard'ов. */
async function seedGroup(db: Firestore): Promise<number> {
  await db.doc(`groups/${SMOKE_GROUP.id}`).set({
    id: SMOKE_GROUP.id,
    name: SMOKE_GROUP.name,
    memberIds: [...SMOKE_GROUP.memberIds],
    grantedCourses: [...SMOKE_GROUP.grantedCourses],
    announcementAdminIds: [...SMOKE_GROUP.announcementAdminIds],
  });
  return 1;
}

async function seedLectureQuestions(db: Firestore, now: Timestamp): Promise<number> {
  let count = 0;
  for (const question of SMOKE_LECTURE_QUESTIONS) {
    const { id, ...fields } = question;
    await db.doc(`lectureQuestions/${id}`).set({
      ...fields,
      createdAt: now,
      startMs: 0,
      videoId: 'smoke-video',
    });
    count++;
  }
  return count;
}

/** feature_events: createdAt смещается на daysAgo, само поле daysAgo не пишем. */
async function seedFeatureEvents(db: Firestore, nowMs: number): Promise<number> {
  let count = 0;
  for (const event of SMOKE_FEATURE_EVENTS) {
    const doc: Record<string, unknown> = {
      hashedUid: event.hashedUid,
      event: event.event,
      platform: event.platform,
      createdAt: Timestamp.fromDate(new Date(nowMs - event.daysAgo * 86_400_000)),
    };
    // У smoke-ev-6 courseId нет — undefined в Firestore писать нельзя.
    if ('courseId' in event) doc.courseId = event.courseId;
    await db.doc(`feature_events/${event.id}`).set(doc);
    count++;
  }
  return count;
}

async function main() {
  const { sandbox, reset } = parseArgs();

  await assertEmulatorUp(FIRESTORE_HOST, 'Firestore');
  await assertEmulatorUp(AUTH_HOST, 'Auth');

  console.log(`${TAG} auth-проект: ${SMOKE_AUTH_PROJECT}, песочница Firestore: ${sandbox}`);
  if (reset) await resetSandbox(sandbox);

  const authApp = initializeApp({ projectId: SMOKE_AUTH_PROJECT }, 'smoke-auth');
  const dataApp = initializeApp({ projectId: sandbox }, 'smoke-data');
  const db = getFirestore(dataApp);

  try {
    const users = await seedAuthUsers(authApp);

    const now = Timestamp.now();
    const nowMs = now.toMillis();
    const userDocs = await seedUserDocs(db, now);
    const courseDocs = await seedCourses(db);
    const coreDocs = await seedCoreLessons(db);
    const groupDocs = await seedGroup(db);
    const questionDocs = await seedLectureQuestions(db, now);
    const eventDocs = await seedFeatureEvents(db, nowMs);
    const total = userDocs + courseDocs + coreDocs + groupDocs + questionDocs + eventDocs;

    console.log(`\n${TAG} Итого:`);
    console.log(`  auth-пользователей (${SMOKE_AUTH_PROJECT}): ${users}`);
    console.log(`  users/: ${userDocs}`);
    console.log(`  courses/ + lessons: ${courseDocs}`);
    console.log(`  periods/ + clinical-topics/: ${coreDocs}`);
    console.log(`  groups/: ${groupDocs}`);
    console.log(`  lectureQuestions/: ${questionDocs}`);
    console.log(`  feature_events/: ${eventDocs}`);
    console.log(`\n✅ Firestore-доков ${total} записано в проект ${sandbox}.`);
  } finally {
    await deleteApp(dataApp);
    await deleteApp(authApp);
  }
}

main().catch((err) => {
  console.error(`${TAG} Ошибка:`, err instanceof Error ? err.message : err);
  process.exit(1);
});
