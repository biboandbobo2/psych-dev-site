#!/usr/bin/env node

const admin = require('firebase-admin');

// Инициализация Firebase Admin
admin.initializeApp({
  projectId: 'psych-dev-site-prod'
});

const db = admin.firestore();

/**
 * Миграция тестов: добавление поля course для тестов без этого поля
 */
async function migrateTestsCourse() {
  console.log('🔄 Начинаем миграцию тестов...\n');

  try {
    const testsRef = db.collection('tests');
    const snapshot = await testsRef.get();

    if (snapshot.empty) {
      console.log('📭 Тесты не найдены в базе данных.');
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log(`📊 Найдено тестов: ${snapshot.size}\n`);

    // Проходим по всем тестам
    for (const doc of snapshot.docs) {
      const testData = doc.data();
      const testId = doc.id;

      // Проверяем наличие поля course
      if (testData.course) {
        console.log(`⏭️  Пропускаем "${testData.title}" (${testId}) - поле course уже существует: ${testData.course}`);
        skippedCount++;
        continue;
      }

      try {
        // Добавляем поле course со значением 'development' (по умолчанию)
        await testsRef.doc(testId).update({
          course: 'development'
        });

        console.log(`✅ Обновлён "${testData.title}" (${testId}) - добавлено course: development`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Ошибка обновления "${testData.title}" (${testId}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 Итоги миграции:');
    console.log(`   ✅ Обновлено: ${updatedCount}`);
    console.log(`   ⏭️  Пропущено (уже имели course): ${skippedCount}`);
    console.log(`   ❌ Ошибки: ${errorCount}`);
    console.log(`   📊 Всего тестов: ${snapshot.size}`);
    console.log('='.repeat(60) + '\n');

    if (updatedCount > 0) {
      console.log('✨ Миграция успешно завершена!');
    } else if (skippedCount === snapshot.size) {
      console.log('ℹ️  Все тесты уже имеют поле course - миграция не требуется.');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка миграции:', error);
    process.exit(1);
  }
}

// Запуск миграции
migrateTestsCourse()
  .then(() => {
    console.log('\n🏁 Скрипт завершён.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Необработанная ошибка:', error);
    process.exit(1);
  });
