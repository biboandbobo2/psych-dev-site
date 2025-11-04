/**
 * Скрипт миграции legacy тестов "Авторы и теории" в Firestore
 *
 * Запуск: npx tsx scripts/migrateAuthorsTests.ts
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { AUTHORS_TEST_QUESTIONS } from '../src/data/authorsTestData';
import { AUTHORS_TEST_LEVEL2_QUESTIONS } from '../src/data/authorsTestLevel2Data';
import { AUTHORS_TEST_LEVEL3_QUESTIONS } from '../src/data/authorsTestLevel3Data';
import type { TestQuestion, TestResource, TestAppearance } from '../src/types/tests';
import { randomUUID } from 'node:crypto';

// Инициализация Firebase Admin
// Использует application default credentials через gcloud
try {
  initializeApp({
    projectId: 'psych-dev-site-prod',
  });
  console.log('✅ Firebase Admin инициализирован');
} catch (error) {
  console.error('❌ Ошибка инициализации Firebase Admin:', error);
  console.log('💡 Попробуйте: gcloud auth application-default login');
  process.exit(1);
}

const db = getFirestore();

// ID админа (замените на ваш реальный UID)
const ADMIN_UID = 'admin-migration-script';

function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj
      .map((item) => removeUndefined(item))
      .filter((item) => item !== undefined) as unknown as T;
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj as Record<string, any>) {
      const value = (obj as Record<string, any>)[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned;
  }

  return obj;
}

function sanitizeAppearance(appearance?: TestAppearance) {
  if (!appearance) return undefined;
  const bulletPoints = appearance.bulletPoints
    ?.map((item) => item.trim())
    .filter(Boolean);

  return removeUndefined({
    ...appearance,
    bulletPoints: bulletPoints && bulletPoints.length ? bulletPoints : undefined,
  });
}

const AUTHOR_RESOURCES: Record<string, TestResource[]> = {
  'Лев Выготский': [
    {
      title: 'Л. С. Выготский — «Мышление и речь» (1934)',
      url: 'https://historic.ru/books/item/f00/s00/z0000008/index.shtml',
    },
    {
      title: 'Vygotsky, L. S. (1978). Mind in Society',
      url: 'https://www.marxists.org/archive/vygotsky/works/mind/contents.htm',
    },
  ],
  'Джон Боулби': [
    {
      title: 'Bowlby, J. (1969). Attachment and Loss. Vol. 1: Attachment',
      url: 'https://ia803209.us.archive.org/10/items/attachmentandlos013156mbp/attachmentandlos013156mbp.pdf',
    },
  ],
  'Жан Пиаже': [
    {
      title: 'Piaget, J. (1952). The Origins of Intelligence in Children',
      url: 'https://archive.org/details/originofintellig0000piag',
    },
    {
      title: 'Piaget, J. (1964). Development and Learning',
      url: 'https://www.unco.edu/cebs/psychology/kevin_pugh/motivation_project/resources/piaget1964.pdf',
    },
  ],
  'Эрик Эриксон': [
    {
      title: 'Erikson, E. (1950). Childhood and Society',
      url: 'https://archive.org/details/childhoodsociety0000erik',
    },
  ],
  'Мэри Эйнсворт': [
    {
      title: 'Ainsworth, M. et al. (1978). Patterns of Attachment',
      url: 'https://mindsplain.com/wp-content/uploads/2021/01/Ainsworth-Patterns-of-Attachment.pdf',
    },
  ],
  'Лоуренс Кольберг': [
    {
      title: 'Kohlberg, L. (1984). The Psychology of Moral Development',
      url: 'https://archive.org/details/psychologyofmora0000kohl',
    },
  ],
  'Альберт Бандура': [
    {
      title: 'Bandura, A. (1977). Self-Efficacy: Toward a Unifying Theory',
      url: 'https://www.uky.edu/~eushe2/Bandura/Bandura1977PR.pdf',
    },
  ],
  'Урие Бронфенбреннер': [
    {
      title: 'Bronfenbrenner, U. (1979). The Ecology of Human Development',
      url: 'https://www.uwlax.edu/globalassets/offices-services/childrens-museum/pdfs/bronfenbrenner.pdf',
    },
  ],
  'Джером Брунер': [
    {
      title: 'Bruner, J. (1960). The Process of Education',
      url: 'https://archive.org/details/processofeducati0000brun',
    },
    {
      title: 'Bruner, J. (1978). The Role of Dialogue in Language Acquisition',
      url: 'https://pages.uoregon.edu/stevev/bruner.pdf',
    },
  ],
  'Зигмунд Фрейд': [
    {
      title: 'Freud, S. (1905). Three Essays on the Theory of Sexuality',
      url: 'https://www.sas.upenn.edu/~cavitch/pdf-library/Freud_Three_Essays_complete.pdf',
    },
  ],
  'Дональд Винникотт': [
    {
      title: 'Winnicott, D. (1960). The Theory of the Parent-Infant Relationship',
      url: 'https://tcf-website-media-library.s3.eu-west-2.amazonaws.com/wp-content/uploads/2021/09/21095241/Winnicott-D.-1960.-The-Theory-of-the-Parent-Infant-Relationship.-International-Journal-of-Psycho-Analysis.-411.-pp.585-595-1.pdf',
    },
  ],
  'Патриция Кул': [
    {
      title: 'Kuhl, P. K. (2004). Early Language Acquisition: Cracking the Speech Code',
      url: 'https://ilabs.uw.edu/wp-content/uploads/2016/05/Kuhl-2004-Early-Language-Acquisition.pdf',
    },
  ],
  'Джон Флавелл': [
    {
      title: 'Flavell, J. (1979). Metacognition and Cognitive Monitoring',
      url: 'https://jgregorymcverry.com/readings/flavell1979MetacognitionAndCogntiveMonitoring.pdf',
    },
  ],
  'Дэвид Элкинд': [
    {
      title: 'Elkind, D. (1967). Egocentrism in Adolescence',
      url: 'https://psycdweeb.weebly.com/uploads/3/5/2/0/3520924/elkind_and_adolescent_egocentrism.pdf',
    },
  ],
  'Элеанор Гибсон': [
    {
      title: 'Gibson, E. J., & Walk, R. D. (1960). The “Visual Cliff”',
      url: 'https://stcmpsy.files.wordpress.com/2012/04/gibson-and-walk-original-text.pdf',
    },
  ],
  'Ричард Уок': [
    {
      title: 'Gibson, E. J., & Walk, R. D. (1960). The “Visual Cliff”',
      url: 'https://stcmpsy.files.wordpress.com/2012/04/gibson-and-walk-original-text.pdf',
    },
  ],
};

const LEVEL1_APPEARANCE: TestAppearance = {
  introIcon: '📝',
  introDescription: 'Проверьте, насколько хорошо вы помните ключевых авторов и термины.',
  badgeIcon: '⭐️',
  badgeLabel: 'УРОВЕНЬ 1',
  badgeGradientFrom: '#6366f1',
  badgeGradientTo: '#8b5cf6',
  backgroundGradientFrom: '#f5f3ff',
  backgroundGradientTo: '#e0f2fe',
  accentGradientFrom: '#7c3aed',
  accentGradientTo: '#3b82f6',
  bulletPoints: [
    'Всего 10 ключевых терминов из курса',
    'Выберите автора, который ввёл понятие',
    'После ответа появится краткое пояснение',
    'При верном ответе доступны материалы для углубления',
  ],
};

const LEVEL2_APPEARANCE: TestAppearance = {
  introIcon: '💬',
  introDescription: 'Вспомните формулировки и цитаты классиков развития.',
  badgeIcon: '✨',
  badgeLabel: 'УРОВЕНЬ 2',
  badgeGradientFrom: '#4f46e5',
  badgeGradientTo: '#06b6d4',
  backgroundGradientFrom: '#eef2ff',
  backgroundGradientTo: '#e0f2fe',
  accentGradientFrom: '#6366f1',
  accentGradientTo: '#3b82f6',
  bulletPoints: [
    'Всего 10 цитат из оригинальных работ',
    'Определите автора по характерной формулировке',
    'При правильном ответе получите ссылку на исходную публикацию',
    'Чтобы открыть уровень 3, нужно набрать 10 из 10',
  ],
};

const LEVEL3_APPEARANCE: TestAppearance = {
  introIcon: '📖',
  introDescription: 'Восстановите термины в цитатах из классических работ психологов.',
  badgeIcon: '🔥🔥',
  badgeLabel: 'УРОВЕНЬ 3',
  badgeGradientFrom: '#f97316',
  badgeGradientTo: '#ef4444',
  backgroundGradientFrom: '#fff7ed',
  backgroundGradientTo: '#ffe4e6',
  accentGradientFrom: '#fb923c',
  accentGradientTo: '#ef4444',
  bulletPoints: [
    'Всего 10 цитат из оригинальных работ',
    'Вставьте пропущенный термин в контекст цитаты',
    'При правильном ответе откроется ссылка на источник',
    'Правильный ответ не показывается — подумайте ещё!',
    'Варианты похожи, но только один точно передаёт смысл',
  ],
};

const LEVEL3_AUTHOR_REFERENCE: Record<number, string | string[]> = {
  1: 'Дональд Винникотт',
  2: ['Элеанор Гибсон', 'Ричард Уок'],
  3: 'Джером Брунер',
  4: 'Патриция Кул',
  5: 'Джон Флавелл',
  6: 'Дэвид Элкинд',
  7: 'Мэри Эйнсворт',
  8: 'Эрик Эриксон',
  9: 'Лоуренс Кольберг',
 10: 'Урие Бронфенбреннер',
};

function getAuthorResources(author?: string | string[]): TestResource[] {
  if (!author) return [];
  if (Array.isArray(author)) {
    return author.flatMap((name) => AUTHOR_RESOURCES[name] ?? []);
  }
  return AUTHOR_RESOURCES[author] ?? [];
}

/**
 * Конвертировать legacy Level 1 в TestQuestion[]
 */
function convertLevel1ToQuestions(): TestQuestion[] {
  return AUTHORS_TEST_QUESTIONS.map((q) => {
    const correctIndex = q.options.indexOf(q.correctAuthor);
    if (correctIndex === -1) {
      throw new Error(`Правильный ответ "${q.correctAuthor}" не найден в options для вопроса ${q.id}`);
    }

    const resources = getAuthorResources(q.correctAuthor);

    return {
      id: randomUUID(),
      questionText: `Кто автор концепции: "${q.term}"?`,
      options: q.options as [string, string, string, string],
      correctOptionIndex: correctIndex,
      successMessage: q.explanation,
      failureMessage: q.explanation,
      successResources: resources.length ? resources : undefined,
    };
  });
}

/**
 * Конвертировать legacy Level 2 в TestQuestion[]
 */
function convertLevel2ToQuestions(): TestQuestion[] {
  return AUTHORS_TEST_LEVEL2_QUESTIONS.map((q) => {
    const correctIndex = q.options.indexOf(q.correctAuthor);
    if (correctIndex === -1) {
      throw new Error(`Правильный ответ "${q.correctAuthor}" не найден в options для вопроса ${q.id}`);
    }

    const resources = getAuthorResources(q.correctAuthor);

    return {
      id: randomUUID(),
      questionText: `Кому принадлежит эта цитата?\n\n"${q.quote}"`,
      options: q.options as [string, string, string, string],
      correctOptionIndex: correctIndex,
      successMessage: q.explanation,
      failureMessage: q.explanation,
      successResources: resources.length ? resources : undefined,
    };
  });
}

/**
 * Конвертировать legacy Level 3 в TestQuestion[]
 */
function convertLevel3ToQuestions(): TestQuestion[] {
  return AUTHORS_TEST_LEVEL3_QUESTIONS.map((q) => {
    const correctIndex = q.options.indexOf(q.correctTerm);
    if (correctIndex === -1) {
      throw new Error(`Правильный ответ "${q.correctTerm}" не найден в options для вопроса ${q.id}`);
    }

    const authorResources = getAuthorResources(LEVEL3_AUTHOR_REFERENCE[q.id]);
    const successResources: TestResource[] = [
      { title: q.sourceTitle, url: q.sourceUrl },
      ...authorResources,
    ];

    return {
      id: randomUUID(),
      questionText: `Заполните пропуск в цитате:\n\n"${q.quote}"\n\nИсточник: ${q.sourceTitle}`,
      options: q.options as [string, string, string, string],
      correctOptionIndex: correctIndex,
      successMessage:
        'Отличное понимание контекста! Углубите знания, изучив первоисточник.',
      failureMessage: q.encouragement,
      successResources,
    };
  });
}

/**
 * Создать или обновить тест в Firestore
 */
async function upsertTest(
  title: string,
  questions: TestQuestion[],
  options?: { prerequisiteTestId?: string | null; requiredPercentage?: number; appearance?: TestAppearance }
): Promise<string> {
  const testsRef = db.collection('tests');

  const prerequisite = options?.prerequisiteTestId ?? null;
  const requiredPercentage = options?.requiredPercentage ?? 70;

  const sanitizedQuestions = removeUndefined(questions);

  const baseData = removeUndefined({
    title,
    rubric: 'full-course',
    prerequisiteTestId: prerequisite,
    questionCount: sanitizedQuestions.length,
    questions: sanitizedQuestions,
    status: 'published',
    requiredPercentage,
    appearance: sanitizeAppearance(options?.appearance),
    updatedAt: Timestamp.now(),
  });

  const existingSnapshot = await testsRef.where('title', '==', title).limit(1).get();

  if (!existingSnapshot.empty) {
    const doc = existingSnapshot.docs[0];
    await doc.ref.update(baseData);
    console.log(`♻️ Обновлён тест: "${title}" (ID: ${doc.id})`);
    return doc.id;
  }

  const newData = {
    ...baseData,
    createdAt: Timestamp.now(),
    createdBy: ADMIN_UID,
  };

  const docRef = await testsRef.add(newData);
  console.log(`✅ Создан тест: "${title}" (ID: ${docRef.id})`);
  return docRef.id;
}

/**
 * Главная функция миграции
 */
async function migrateTests() {
  try {
    console.log('🚀 Начинаем миграцию legacy тестов...\n');

    // Конвертируем вопросы
    console.log('📝 Конвертируем вопросы...');
    const level1Questions = convertLevel1ToQuestions();
    console.log(`   Level 1: ${level1Questions.length} вопросов`);

    const level2Questions = convertLevel2ToQuestions();
    console.log(`   Level 2: ${level2Questions.length} вопросов`);

    const level3Questions = convertLevel3ToQuestions();
    console.log(`   Level 3: ${level3Questions.length} вопросов\n`);

    // Создаём тесты
    console.log('💾 Создаём тесты в Firestore...');

    const level1Id = await upsertTest('Авторы и теории: Уровень 1', level1Questions, {
      requiredPercentage: 70,
      appearance: LEVEL1_APPEARANCE,
    });

    const level2Id = await upsertTest('Авторы и теории: Уровень 2 - Цитаты', level2Questions, {
      prerequisiteTestId: level1Id,
      requiredPercentage: 100,
      appearance: LEVEL2_APPEARANCE,
    });

    const level3Id = await upsertTest('Авторы и теории: Уровень 3 - Термины в контексте', level3Questions, {
      prerequisiteTestId: level2Id,
      requiredPercentage: 100,
      appearance: LEVEL3_APPEARANCE,
    });

    console.log('\n✨ Миграция завершена успешно!');
    console.log('\n📋 Созданные тесты:');
    console.log(`   1. Level 1: ${level1Id}`);
    console.log(`   2. Level 2: ${level2Id} (prerequisite: ${level1Id})`);
    console.log(`   3. Level 3: ${level3Id} (prerequisite: ${level2Id})`);
    console.log('\n🔗 Тесты связаны через prerequisiteTestId');
    console.log('   Студенты смогут увидеть Level 2 после прохождения Level 1');
    console.log('   И Level 3 после прохождения Level 2\n');

  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  }
}

// Запуск
migrateTests().then(() => {
  console.log('👋 Готово!');
  process.exit(0);
});
