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
      // Живые открытые конспекты (этап C): private / group / lecturers +
      // manual-заметка с «подделанной» видимостью (не должна открыться).
      setDoc(doc(db, 'notes', 'note-private'), {
        userId: 'alice',
        title: 'Приватный конспект',
        content: 'секрет',
        noteScope: 'lecture',
        courseId: 'development',
        periodId: 'prenatal',
        visibility: 'private',
        groupId: null,
        updatedAt: serverTimestamp(),
      }),
      setDoc(doc(db, 'notes', 'note-open-group'), {
        userId: 'alice',
        authorName: 'Alice',
        title: 'Открытый конспект',
        content: 'тезисы',
        noteScope: 'lecture',
        courseId: 'development',
        periodId: 'prenatal',
        visibility: 'group',
        groupId: 'g1',
        lectureSegments: [{ id: 's1', startMs: 1000, text: 'тезисы' }],
        updatedAt: serverTimestamp(),
      }),
      setDoc(doc(db, 'notes', 'note-open-lecturers'), {
        userId: 'alice',
        authorName: 'Alice',
        title: 'Конспект лекторам',
        content: 'тезисы лекторам',
        noteScope: 'lecture',
        courseId: 'development',
        periodId: 'prenatal',
        visibility: 'lecturers',
        groupId: null,
        updatedAt: serverTimestamp(),
      }),
      setDoc(doc(db, 'notes', 'note-manual-forged'), {
        userId: 'alice',
        title: 'Ручная заметка',
        content: 'личное',
        noteScope: 'manual',
        courseId: 'development',
        periodId: 'prenatal',
        visibility: 'group',
        groupId: 'g1',
        updatedAt: serverTimestamp(),
      }),
      setDoc(doc(db, 'notes', 'note-legacy'), {
        userId: 'alice',
        title: 'Старая lecture-заметка без visibility',
        content: 'легаси',
        noteScope: 'lecture',
        courseId: 'development',
        periodId: 'prenatal',
        updatedAt: serverTimestamp(),
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

  // videoTranscripts — метаданные намеренно публичны (payload-файлы публичны
  // в Storage, клиентский useVideoTranscript читает их напрямую, см. rules);
  // server-only остаётся только write.
  it('videoTranscripts: get → success (метаданные публичны), write → denied', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'videoTranscripts', 'v1')));
    await assertFails(setDoc(doc(db, 'videoTranscripts', 'v1'), { videoId: 'hacked' }));
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

describe('notes: живой открытый конспект (этап C редизайна)', () => {
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

  it('владелец: get всех своих заметок → success', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'notes', 'note-private')));
    await assertSucceeds(getDoc(doc(db, 'notes', 'note-open-group')));
    await assertSucceeds(getDoc(doc(db, 'notes', 'note-legacy')));
  });

  it('одногруппник: get открытого group-конспекта → success', async () => {
    const db = testEnv.authenticatedContext('bob').firestore();
    await assertSucceeds(getDoc(doc(db, 'notes', 'note-open-group')));
  });

  // getLectureNote читает детерминированный id lecture__{uid}__… до первого
  // сохранения — get несуществующего документа по своему префиксу разрешён.
  it('get несуществующей заметки: свой lecture-префикс → success, чужой → denied', async () => {
    const db = testEnv.authenticatedContext('bob').firestore();
    await assertSucceeds(getDoc(doc(db, 'notes', 'lecture__bob__clinical%3A%3Ac1%3A%3Av1')));
    await assertFails(getDoc(doc(db, 'notes', 'lecture__alice__clinical%3A%3Ac1%3A%3Av1')));
    await assertFails(getDoc(doc(db, 'notes', 'random-nonexistent-id')));
  });

  it('одногруппник: приватный, lecturers и легаси-конспект → denied', async () => {
    const db = testEnv.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(db, 'notes', 'note-private')));
    await assertFails(getDoc(doc(db, 'notes', 'note-open-lecturers')));
    await assertFails(getDoc(doc(db, 'notes', 'note-legacy')));
  });

  it('manual-заметка с «подделанной» visibility=group не открывается никому', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(bob, 'notes', 'note-manual-forged')));
    const lecturer = lecturerCtx();
    await assertFails(getDoc(doc(lecturer, 'notes', 'note-manual-forged')));
  });

  it('посторонний (не в группе): get открытого group-конспекта → denied', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(getDoc(doc(db, 'notes', 'note-open-group')));
  });

  it('одногруппник: list конспектов группы (контур чата) → success', async () => {
    const db = testEnv.authenticatedContext('bob').firestore();
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'notes'),
          where('courseId', '==', 'development'),
          where('periodId', '==', 'prenatal'),
          where('noteScope', '==', 'lecture'),
          where('visibility', '==', 'group'),
          where('groupId', '==', 'g1')
        )
      )
    );
  });

  it('посторонний: тот же list-запрос конспектов чужой группы → denied', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(
      getDocs(
        query(
          collection(db, 'notes'),
          where('courseId', '==', 'development'),
          where('periodId', '==', 'prenatal'),
          where('noteScope', '==', 'lecture'),
          where('visibility', '==', 'group'),
          where('groupId', '==', 'g1')
        )
      )
    );
  });

  it('одногруппник: list без visibility-фильтра → denied (приватное не утекает)', async () => {
    const db = testEnv.authenticatedContext('bob').firestore();
    await assertFails(
      getDocs(
        query(
          collection(db, 'notes'),
          where('courseId', '==', 'development'),
          where('periodId', '==', 'prenatal'),
          where('noteScope', '==', 'lecture'),
          where('groupId', '==', 'g1')
        )
      )
    );
  });

  it('лектор курса: get и list открытых конспектов (group и lecturers) → success', async () => {
    const db = lecturerCtx();
    await assertSucceeds(getDoc(doc(db, 'notes', 'note-open-group')));
    await assertSucceeds(getDoc(doc(db, 'notes', 'note-open-lecturers')));
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'notes'),
          where('courseId', '==', 'development'),
          where('periodId', '==', 'prenatal'),
          where('noteScope', '==', 'lecture'),
          where('visibility', '==', 'lecturers')
        )
      )
    );
  });

  it('лектор курса: приватный конспект → denied', async () => {
    const db = lecturerCtx();
    await assertFails(getDoc(doc(db, 'notes', 'note-private')));
  });

  // Фиксация сужения этапа C: широкий `|| isAdmin()` из notes read убран —
  // приватные заметки через клиент не читает даже супер-админ.
  it('супер-админ: приватный и manual → denied, открытый group-конспект → success', async () => {
    const db = testEnv
      .authenticatedContext('super-uid', { email: SUPER_ADMIN_EMAIL })
      .firestore();
    await assertFails(getDoc(doc(db, 'notes', 'note-private')));
    await assertFails(getDoc(doc(db, 'notes', 'note-manual-forged')));
    await assertSucceeds(getDoc(doc(db, 'notes', 'note-open-group')));
  });

  it('лектор чужого курса: открытый конспект → denied', async () => {
    const db = foreignLecturerCtx();
    await assertFails(getDoc(doc(db, 'notes', 'note-open-group')));
    await assertFails(getDoc(doc(db, 'notes', 'note-open-lecturers')));
  });

  it('одногруппник: update чужого открытого конспекта → denied', async () => {
    const db = testEnv.authenticatedContext('bob').firestore();
    await assertFails(
      setDoc(doc(db, 'notes', 'note-open-group'), { content: 'правка' }, { merge: true })
    );
  });

  it('владелец: update видимости своей заметки → success', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'notes', 'note-private'),
        { visibility: 'group', groupId: 'g1' },
        { merge: true }
      )
    );
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

  // Реальный flow импорта биографии: клиент подписывается на
  // biographyJobs/{jobId} ДО того, как CF создаст документ. Чтение
  // несуществующего документа должно быть разрешено, иначе listener
  // получает permission-denied и навсегда закрывается (модалка виснет).
  it('authenticated: get несуществующей biographyJobs/<job> (подписка до создания) → success', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'biographyJobs', 'job-not-created-yet')));
  });

  it('unauthenticated: get несуществующей biographyJobs/<job> → denied', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'biographyJobs', 'job-not-created-yet')));
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

describe('sharedLectureNotes: расшаренные фрагменты конспекта', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'sharedLectureNotes', 's-group'), {
        authorUid: 'alice',
        authorName: 'Alice',
        courseId: 'development',
        periodId: 'prenatal',
        segments: [{ id: 'seg-1', startMs: 60000, text: 'Конспект про матрицы' }],
        visibility: 'group',
        groupId: 'g1',
        createdAt: serverTimestamp(),
      });
    });
  });

  it('одногруппник читает групповой шеринг, посторонний — нет', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore();
    await assertSucceeds(getDoc(doc(bob, 'sharedLectureNotes', 's-group')));

    const mallory = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(getDoc(doc(mallory, 'sharedLectureNotes', 's-group')));
  });

  it('лектор курса читает, админ чужого курса — нет', async () => {
    const lecturer = testEnv
      .authenticatedContext('lecturer-uid', { role: 'admin', editableCourses: ['development'] })
      .firestore();
    await assertSucceeds(getDoc(doc(lecturer, 'sharedLectureNotes', 's-group')));

    const foreign = testEnv
      .authenticatedContext('other-lecturer', { role: 'admin', editableCourses: ['clinical'] })
      .firestore();
    await assertFails(getDoc(doc(foreign, 'sharedLectureNotes', 's-group')));
  });

  it('участник группы создаёт шеринг от своего имени, с пустыми сегментами — нет', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore();
    await assertSucceeds(
      setDoc(doc(bob, 'sharedLectureNotes', 's-new'), {
        authorUid: 'bob',
        courseId: 'development',
        periodId: 'prenatal',
        segments: [{ id: 'seg-1', startMs: null, text: 'Мой конспект' }],
        visibility: 'group',
        groupId: 'g1',
        createdAt: serverTimestamp(),
      })
    );
    await assertFails(
      setDoc(doc(bob, 'sharedLectureNotes', 's-empty'), {
        authorUid: 'bob',
        courseId: 'development',
        periodId: 'prenatal',
        segments: [],
        visibility: 'group',
        groupId: 'g1',
        createdAt: serverTimestamp(),
      })
    );
  });

  it('delete: одногруппник — нет, автор — да', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore();
    await assertFails(deleteDoc(doc(bob, 'sharedLectureNotes', 's-group')));

    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(deleteDoc(doc(alice, 'sharedLectureNotes', 's-group')));
  });
});

describe('courseProgress: прогресс просмотров для лекторов курса', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users', 'alice', 'courseProgress', 'development'), {
        watchedLessonIds: ['prenatal'],
      });
      await setDoc(doc(db, 'users', 'alice', 'courseProgress', 'clinical'), {
        watchedLessonIds: [],
      });
    });
  });

  it('владелец читает свой прогресс', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(alice, 'users', 'alice', 'courseProgress', 'development')));
  });

  it('лектор курса читает прогресс студента по своему курсу, по чужому — нет', async () => {
    const lecturer = testEnv
      .authenticatedContext('lecturer-uid', { role: 'admin', editableCourses: ['development'] })
      .firestore();
    await assertSucceeds(getDoc(doc(lecturer, 'users', 'alice', 'courseProgress', 'development')));
    await assertFails(getDoc(doc(lecturer, 'users', 'alice', 'courseProgress', 'clinical')));
  });

  it('обычный пользователь не читает чужой прогресс и не пишет его', async () => {
    const mallory = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(getDoc(doc(mallory, 'users', 'alice', 'courseProgress', 'development')));

    const lecturer = testEnv
      .authenticatedContext('lecturer-uid', { role: 'admin', editableCourses: ['development'] })
      .firestore();
    await assertFails(
      setDoc(doc(lecturer, 'users', 'alice', 'courseProgress', 'development'), {
        watchedLessonIds: ['prenatal', 'infancy'],
      })
    );
  });
});

describe('courses: canEditCourse для динамических курсов', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await Promise.all([
        setDoc(doc(db, 'courses', 'demo-course'), {
          name: 'Демо-курс',
          published: true,
          order: 10,
        }),
        setDoc(doc(db, 'courses', 'demo-course', 'lessons', 'lesson-1'), {
          period: 'lesson-1',
          title: 'Первое занятие',
          published: true,
          order: 0,
        }),
        setDoc(doc(db, 'courses', 'other-course'), {
          name: 'Чужой курс',
          published: true,
          order: 11,
        }),
      ]);
    });
  });

  it('аноним: list курсов и get занятия → success (публичное чтение)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDocs(collection(db, 'courses')));
    await assertSucceeds(getDoc(doc(db, 'courses', 'demo-course', 'lessons', 'lesson-1')));
  });

  it('студент без admin-роли: write в курс и занятие → denied', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'courses', 'demo-course'), { name: 'x' }, { merge: true }));
    await assertFails(
      setDoc(doc(db, 'courses', 'demo-course', 'lessons', 'lesson-1'), { title: 'x' }, { merge: true })
    );
  });

  it('админ своего курса: update курса (published), create/delete занятий → success', async () => {
    const db = testEnv
      .authenticatedContext('lecturer-uid', { role: 'admin', editableCourses: ['demo-course'] })
      .firestore();
    await assertSucceeds(
      setDoc(doc(db, 'courses', 'demo-course'), { published: false }, { merge: true })
    );
    await assertSucceeds(
      setDoc(doc(db, 'courses', 'demo-course', 'lessons', 'lesson-2'), {
        period: 'lesson-2',
        title: 'Новое занятие',
        published: false,
        order: 1,
      })
    );
    await assertSucceeds(deleteDoc(doc(db, 'courses', 'demo-course', 'lessons', 'lesson-1')));
  });

  it('админ чужого курса: write в demo-course и его занятия → denied', async () => {
    const db = testEnv
      .authenticatedContext('other-lecturer', { role: 'admin', editableCourses: ['other-course'] })
      .firestore();
    await assertFails(
      setDoc(doc(db, 'courses', 'demo-course'), { published: false }, { merge: true })
    );
    await assertFails(
      setDoc(doc(db, 'courses', 'demo-course', 'lessons', 'lesson-1'), { title: 'x' }, { merge: true })
    );
  });

  it('обычный админ: создание НОВОГО курса → denied (id ещё не в editableCourses)', async () => {
    const db = testEnv
      .authenticatedContext('lecturer-uid', { role: 'admin', editableCourses: ['demo-course'] })
      .firestore();
    await assertFails(
      setDoc(doc(db, 'courses', 'brand-new-course'), { name: 'Новый', published: true, order: 12 })
    );
  });

  it('super-admin: создание нового курса и удаление курса с занятием → success', async () => {
    const db = testEnv
      .authenticatedContext('super-uid', { email: SUPER_ADMIN_EMAIL })
      .firestore();
    await assertSucceeds(
      setDoc(doc(db, 'courses', 'brand-new-course'), { name: 'Новый', published: true, order: 12 })
    );
    await assertSucceeds(deleteDoc(doc(db, 'courses', 'demo-course', 'lessons', 'lesson-1')));
    await assertSucceeds(deleteDoc(doc(db, 'courses', 'demo-course')));
  });
});

describe('courseNavIndex: nav-индекс курса (LS-3)', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'courseNavIndex', 'demo-course'), {
        v: 1,
        updatedAt: '2026-08-23T00:00:00.000Z',
        items: [{ id: 'lesson-1', title: 'Первое занятие', order: 0 }],
      });
    });
  });

  it('аноним: get courseNavIndex/<courseId> → success (публичное чтение)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'courseNavIndex', 'demo-course')));
  });

  it('студент без admin-роли: write индекса → denied', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(db, 'courseNavIndex', 'demo-course'), { v: 1, updatedAt: 'x', items: [] })
    );
  });

  it('лектор своего курса: rewrite индекса → success', async () => {
    const db = testEnv
      .authenticatedContext('lecturer-uid', { role: 'admin', editableCourses: ['demo-course'] })
      .firestore();
    await assertSucceeds(
      setDoc(doc(db, 'courseNavIndex', 'demo-course'), { v: 1, updatedAt: 'x', items: [] })
    );
  });

  it('лектор чужого курса: write индекса demo-course → denied', async () => {
    const db = testEnv
      .authenticatedContext('other-lecturer', { role: 'admin', editableCourses: ['other-course'] })
      .firestore();
    await assertFails(
      setDoc(doc(db, 'courseNavIndex', 'demo-course'), { v: 1, updatedAt: 'x', items: [] })
    );
  });
});

describe('feature_events: продуктовая телеметрия (PT-1)', () => {
  const validEvent = () => ({
    hashedUid: 'a1b2c3d4e5f60718',
    event: 'research_search',
    platform: 'desktop',
    createdAt: serverTimestamp(),
  });

  it('аноним: create события → denied', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'feature_events', 'e1'), validEvent()));
  });

  it('авторизованный: create валидного события → success', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'feature_events', 'e1'), validEvent()));
  });

  it('авторизованный: create с courseId/periodId → success', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'feature_events', 'e2'), {
        ...validEvent(),
        event: 'study_mode_opened',
        courseId: 'development',
        periodId: 'infancy',
      })
    );
  });

  it('авторизованный: create с лишним полем (текст запроса) → denied', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(db, 'feature_events', 'e3'), { ...validEvent(), query: 'секретный текст' })
    );
  });

  it('авторизованный: create с клиентским createdAt (не serverTimestamp) → denied', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(db, 'feature_events', 'e4'), { ...validEvent(), createdAt: 'x' })
    );
  });

  it('авторизованный: create с platform вне словаря → denied', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(db, 'feature_events', 'e5'), { ...validEvent(), platform: 'tablet' })
    );
  });

  it('авторизованный: create с event длиннее 64 символов → denied', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(db, 'feature_events', 'e6'), { ...validEvent(), event: 'x'.repeat(65) })
    );
  });

  it('авторизованный (не админ): get/list событий → denied', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'feature_events', 'seeded'), {
        hashedUid: 'a1b2c3d4e5f60718',
        event: 'research_search',
        platform: 'desktop',
        createdAt: serverTimestamp(),
      });
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(db, 'feature_events', 'seeded')));
    await assertFails(getDocs(collection(db, 'feature_events')));
  });

  it('авторизованный: update/delete события → denied', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'feature_events', 'seeded'), {
        hashedUid: 'a1b2c3d4e5f60718',
        event: 'research_search',
        platform: 'desktop',
        createdAt: serverTimestamp(),
      });
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(db, 'feature_events', 'seeded'), { ...validEvent(), event: 'other' })
    );
    await assertFails(deleteDoc(doc(db, 'feature_events', 'seeded')));
  });

  it('супер-админ: list событий → success', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'feature_events', 'seeded'), {
        hashedUid: 'a1b2c3d4e5f60718',
        event: 'research_search',
        platform: 'desktop',
        createdAt: serverTimestamp(),
      });
    });
    const db = testEnv
      .authenticatedContext('super-uid', { email: SUPER_ADMIN_EMAIL })
      .firestore();
    await assertSucceeds(getDocs(collection(db, 'feature_events')));
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
