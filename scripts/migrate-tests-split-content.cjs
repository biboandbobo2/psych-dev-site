#!/usr/bin/env node

/**
 * Миграция тестов: вынос вопросов из tests/{id}.questions
 * в subdoc tests/{id}/content/questions.
 *
 * Фазы (запускать по очереди, между copy и strip — деплой фронтенда):
 *   node scripts/migrate-tests-split-content.cjs backup <file.json>
 *     — дамп всех документов tests в JSON (страховка перед миграцией)
 *   node scripts/migrate-tests-split-content.cjs copy [--dry-run]
 *     — копирует embedded questions в subdoc, parent не трогает
 *   node scripts/migrate-tests-split-content.cjs strip [--dry-run]
 *     — удаляет embedded questions из parent (только если subdoc совпадает
 *       по количеству вопросов), проставляет questionCount
 */

const fs = require('fs');
const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'psych-dev-site-prod'
});

const db = admin.firestore();

const phase = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

async function backup(file) {
  if (!file) throw new Error('Укажи файл: backup <file.json>');
  const snapshot = await db.collection('tests').get();
  const dump = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
  fs.writeFileSync(file, JSON.stringify(dump, null, 2));
  console.log(`✅ Бэкап: ${dump.length} документов → ${file}`);
}

async function copy() {
  const snapshot = await db.collection('tests').get();
  let copied = 0;
  let skipped = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const title = data.title || doc.id;
    if (!Array.isArray(data.questions)) {
      const sub = await doc.ref.collection('content').doc('questions').get();
      console.log(
        sub.exists
          ? `⏭️  "${title}" — уже в новом формате (subdoc есть)`
          : `⚠️  "${title}" — нет ни embedded questions, ни subdoc (пустой тест?)`
      );
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`[dry-run] copy "${title}": ${data.questions.length} вопросов → subdoc`);
    } else {
      await doc.ref.collection('content').doc('questions').set({ questions: data.questions });
      console.log(`✅ copy "${title}": ${data.questions.length} вопросов → subdoc`);
    }
    copied++;
  }
  console.log(`\nИтого: скопировано ${copied}, пропущено ${skipped}`);
}

async function strip() {
  const snapshot = await db.collection('tests').get();
  let stripped = 0;
  let skipped = 0;
  let errors = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const title = data.title || doc.id;
    if (!Array.isArray(data.questions)) {
      skipped++;
      continue;
    }
    const sub = await doc.ref.collection('content').doc('questions').get();
    const subQuestions = sub.exists ? sub.data().questions : null;
    if (!Array.isArray(subQuestions) || subQuestions.length !== data.questions.length) {
      console.error(
        `❌ "${title}" — subdoc отсутствует или не совпадает ` +
          `(embedded: ${data.questions.length}, subdoc: ${Array.isArray(subQuestions) ? subQuestions.length : 'нет'}). ` +
          'Сначала запусти фазу copy.'
      );
      errors++;
      continue;
    }
    if (dryRun) {
      console.log(`[dry-run] strip "${title}": удалить embedded (${data.questions.length} вопросов)`);
    } else {
      await doc.ref.update({
        questions: admin.firestore.FieldValue.delete(),
        questionCount: data.questions.length,
      });
      console.log(`✅ strip "${title}": embedded удалён, questionCount=${data.questions.length}`);
    }
    stripped++;
  }
  console.log(`\nИтого: очищено ${stripped}, уже в новом формате ${skipped}, ошибок ${errors}`);
  if (errors > 0) process.exit(1);
}

async function main() {
  if (phase === 'backup') return backup(process.argv[3]);
  if (phase === 'copy') return copy();
  if (phase === 'strip') return strip();
  console.log('Использование: migrate-tests-split-content.cjs backup <file.json> | copy [--dry-run] | strip [--dry-run]');
  process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
