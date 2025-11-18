const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Инициализация Firebase Admin
// Используем Application Default Credentials (ADC)
// Убедитесь, что вы залогинены через: firebase login
admin.initializeApp({
  projectId: 'psych-dev-site-prod'
});

const db = admin.firestore();

async function importClinicalTopics() {
  try {
    // Читаем JSON файл с преобразованными данными
    const dataPath = path.join(__dirname, '../src/data/clinical-topics.json');
    const topics = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log(`📚 Найдено ${topics.length} тем для импорта`);

    const batch = db.batch();
    let count = 0;

    for (const topic of topics) {
      const docRef = db.collection('clinical-topics').doc(topic.period);

      // Добавляем метаданные
      const docData = {
        ...topic,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(docRef, docData);
      count++;
      console.log(`  ✓ ${topic.period}: ${topic.title}`);
    }

    // Выполняем batch запись
    await batch.commit();

    console.log(`\n✅ Успешно импортировано ${count} тем в коллекцию 'clinical-topics'`);
    console.log('\n📋 Проверьте данные в Firestore Console:');
    console.log('https://console.firebase.google.com/project/psych-dev-site-prod/firestore/data/clinical-topics');

  } catch (error) {
    console.error('❌ Ошибка при импорте:', error);
    process.exit(1);
  } finally {
    // Завершаем работу
    await admin.app().delete();
  }
}

// Запускаем импорт
importClinicalTopics()
  .then(() => {
    console.log('\n🎉 Импорт завершён');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Критическая ошибка:', err);
    process.exit(1);
  });
