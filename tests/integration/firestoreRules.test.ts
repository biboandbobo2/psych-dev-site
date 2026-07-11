/**
 * Регрессионные проверки прод-`firestore.rules`.
 *
 * Цель: ловить классы ошибок, аналогичные MR-8 — когда правка catch-all
 * или другой match-блок ломает list/get для коллекций фронта, либо открывает
 * server-only коллекции авторизованным клиентам.
 *
 * Запускается на эмуляторе Firestore с **прод**-rules
 * (через `@firebase/rules-unit-testing`, отдельный projectId), независимо
 * от других интеграционных тестов с их open-all `tests/integration/firestore.rules`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

const PROJECT_ID = 'firestore-rules-regression';
const RULES_PATH = resolve(process.cwd(), 'firestore.rules');

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await Promise.all([
      setDoc(doc(db, 'tests', 't1'), {
        title: 'Published Test',
        status: 'published',
        rubric: 'full-course',
        course: 'development',
        updatedAt: serverTimestamp(),
      }),
      setDoc(doc(db, 'books', 'b1'), { title: 'Internal Book' }),
      setDoc(doc(db, 'videoTranscripts', 'v1'), { videoId: 'v1' }),
      setDoc(doc(db, 'lecture_chunks', 'c1'), { lectureKey: 'l1' }),
      setDoc(doc(db, 'biographyJobs', 'job-alice'), {
        userId: 'alice',
        status: 'completed',
      }),
      setDoc(doc(db, 'pages', 'home'), { content: 'home' }),
      setDoc(doc(db, 'homeFeed', 'shared'), { announcements: [] }),
      setDoc(doc(db, 'aiUsageDaily', 'alice_2026-01-01'), { uid: 'alice', count: 1 }),
      setDoc(doc(db, 'groups', 'g1'), {
        name: 'Первый поток',
        memberIds: ['alice', 'bob'],
        announcementAdminIds: [],
      }),
      setDoc(doc(db, 'lectureQuestions', 'q-group'), {
        authorUid: 'alice',
        authorName: 'Alice',
        courseId: 'development',
        periodId: 'prenatal',
        text: 'Вопрос группе про матрицы Грофа',
        visibility: 'group',
        groupId: 'g1',
        startMs: 120000,
        createdAt: serverTimestamp(),
      }),
      setDoc(doc(db, 'lectureQuestions', 'q-private'), {
        authorUid: 'alice',
        authorName: 'Alice',
        courseId: 'development',
        periodId: 'prenatal',
        text: 'Личный вопрос только лектору',
        visibility: 'lecturers',
        groupId: null,
        startMs: null,
        createdAt: serverTimestamp(),
      }),
    ]);
  });
});

describe('tests коллекция (та самая регрессия MR-8)', () => {
  it('аноним: get tests/<id> → success', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'tests', 't1')));
  });

  it('аноним: list tests where status=published → success', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      getDocs(query(collection(db, 'tests'), where('status', '==', 'published')))
    );
  });

  it('обычный авторизованный: list всех tests → success', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDocs(collection(db, 'tests')));
  });

  it('обычный пользователь: write tests/<id> → denied', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'tests', 't1'), { title: 'hack', status: 'published' }));
  });

  it('admin (custom claim role=admin): write tests/<id> → success', async () => {
    const db = testEnv
      .authenticatedContext('admin-uid', { role: 'admin' })
      .firestore();
    await assertSucceeds(
      setDoc(doc(db, 'tests', 't1'), { title: 'edited by admin', status: 'published' })
    );
  });

  it('super-admin (email): write tests/<new> → success', async () => {
    const db = testEnv
      .authenticatedContext('super-uid', { email: SUPER_ADMIN_EMAIL })
      .firestore();
    await assertSucceeds(
      setDoc(doc(db, 'tests', 't-new'), { title: 'new', status: 'draft' })
    );
  });
});

describe('server-only коллекции не утекают клиенту', () => {
  it('обычный авторизованный: list books → denied', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDocs(collection(db, 'books')));
  });

  it('обычный авторизованный: get videoTranscripts/<id> → denied', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(db, 'videoTranscripts', 'v1')));
  });

  it('обычный авторизованный: list lecture_chunks → denied', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDocs(collection(db, 'lecture_chunks')));
  });

  it('super-admin: client write в books → denied (Admin SDK only)', async () => {
    const db = testEnv
      .authenticatedContext('super-uid', { email: SUPER_ADMIN_EMAIL })
      .firestore();
    await assertFails(setDoc(doc(db, 'books', 'b2'), { title: 'x' }));
  });
});

describe('per-uid ограничения уважаются (без catch-all override)', () => {
  it('owner: get свой biographyJobs/<job> → success', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'biographyJobs', 'job-alice')));
  });

  it('не-owner: get чужой biographyJobs/<job> → denied', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(getDoc(doc(db, 'biographyJobs', 'job-alice')));
  });

  it('обычный пользователь: get свой aiUsageDaily → success', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'aiUsageDaily', 'alice_2026-01-01')));
  });

  it('другой пользователь: get чужой aiUsageDaily → denied', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(getDoc(doc(db, 'aiUsageDaily', 'alice_2026-01-01')));
  });
});

describe('публичные коллекции остаются публичными', () => {
  it('аноним: get pages/<id> → success', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'pages', 'home')));
  });

  it('аноним: get homeFeed/<id> → success', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'homeFeed', 'shared')));
  });
});

describe('lectureQuestions: вопросы студентов по занятиям', () => {
  const lecturerCtx = () =>
    testEnv
      .authenticatedContext('lecturer-uid', {
        role: 'admin',
        editableCourses: ['development'],
      })
      .firestore();
  const foreignLecturerCtx = () =>
    testEnv
      .authenticatedContext('other-lecturer', {
        role: 'admin',
        editableCourses: ['clinical'],
      })
      .firestore();

  it('автор: get своего private-вопроса → success', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'lectureQuestions', 'q-private')));
  });

  it('одногруппник: get группового вопроса → success', async () => {
    const db = testEnv.authenticatedContext('bob').firestore();
    await assertSucceeds(getDoc(doc(db, 'lectureQuestions', 'q-group')));
  });

  it('одногруппник: get вопроса «только лектору» → denied', async () => {
    const db = testEnv.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(db, 'lectureQuestions', 'q-private')));
  });

  it('посторонний: get группового вопроса → denied', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(getDoc(doc(db, 'lectureQuestions', 'q-group')));
  });

  it('лектор курса (editableCourses содержит courseId): get обоих вопросов → success', async () => {
    const db = lecturerCtx();
    await assertSucceeds(getDoc(doc(db, 'lectureQuestions', 'q-group')));
    await assertSucceeds(getDoc(doc(db, 'lectureQuestions', 'q-private')));
  });

  it('админ чужого курса: get вопроса → denied', async () => {
    const db = foreignLecturerCtx();
    await assertFails(getDoc(doc(db, 'lectureQuestions', 'q-private')));
  });

  it('лектор курса: list по courseId → success', async () => {
    const db = lecturerCtx();
    await assertSucceeds(
      getDocs(
        query(collection(db, 'lectureQuestions'), where('courseId', '==', 'development'))
      )
    );
  });

  it('одногруппник: list по groupId+visibility → success', async () => {
    const db = testEnv.authenticatedContext('bob').firestore();
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'lectureQuestions'),
          where('groupId', '==', 'g1'),
          where('visibility', '==', 'group')
        )
      )
    );
  });

  it('одногруппник: широкий list без фильтров → denied', async () => {
    const db = testEnv.authenticatedContext('bob').firestore();
    await assertFails(getDocs(collection(db, 'lectureQuestions')));
  });

  it('участник группы: create вопроса от своего имени → success', async () => {
    const db = testEnv.authenticatedContext('bob').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'lectureQuestions', 'q-new'), {
        authorUid: 'bob',
        authorName: 'Bob',
        courseId: 'development',
        periodId: 'prenatal',
        text: 'Новый вопрос',
        visibility: 'group',
        groupId: 'g1',
        startMs: null,
        createdAt: serverTimestamp(),
      })
    );
  });

  it('create с чужим authorUid → denied', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(
      setDoc(doc(db, 'lectureQuestions', 'q-forged'), {
        authorUid: 'alice',
        courseId: 'development',
        periodId: 'prenatal',
        text: 'Подделка',
        visibility: 'lecturers',
        createdAt: serverTimestamp(),
      })
    );
  });

  it('create в группу без членства → denied', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(
      setDoc(doc(db, 'lectureQuestions', 'q-outsider'), {
        authorUid: 'mallory',
        courseId: 'development',
        periodId: 'prenatal',
        text: 'Я не из этой группы',
        visibility: 'group',
        groupId: 'g1',
        createdAt: serverTimestamp(),
      })
    );
  });

  it('update вопроса запрещён даже автору', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(db, 'lectureQuestions', 'q-group'), { text: 'правка' }, { merge: true })
    );
  });

  it('delete: автор → success, одногруппник → denied, лектор курса → success', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore();
    await assertFails(deleteDoc(doc(bob, 'lectureQuestions', 'q-group')));

    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(deleteDoc(doc(alice, 'lectureQuestions', 'q-group')));

    const lecturer = lecturerCtx();
    await assertSucceeds(deleteDoc(doc(lecturer, 'lectureQuestions', 'q-private')));
  });
});

describe('default-deny для новых неизвестных коллекций', () => {
  it('обычный авторизованный: write в произвольную новую коллекцию → denied', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'random_new_collection', 'doc1'), { x: 1 }));
  });

  it('super-admin: write в произвольную новую коллекцию → denied', async () => {
    const db = testEnv
      .authenticatedContext('super-uid', { email: SUPER_ADMIN_EMAIL })
      .firestore();
    await assertFails(setDoc(doc(db, 'random_new_collection', 'doc1'), { x: 1 }));
  });

  it('обычный авторизованный: list произвольной новой коллекции → denied', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDocs(collection(db, 'random_new_collection')));
  });
});
