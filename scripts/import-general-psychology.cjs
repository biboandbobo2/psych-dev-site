const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

admin.initializeApp({
  projectId: 'psych-dev-site-prod'
});

const db = admin.firestore();

async function importGeneralPsychology() {
  try {
    const dataPath = path.join(__dirname, '../general-psychology.json');
    const topics = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log(`📚 Найдено ${topics.length} тем для импорта`);

    const batch = db.batch();
    let count = 0;

    for (const topic of topics) {
      const docRef = db.collection('general-topics').doc(topic.period);

      const docData = {
        ...topic,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(docRef, docData);
      count++;
      console.log(`  ✓ ${topic.period}: ${topic.title}`);
    }

    await batch.commit();

    console.log(`\n✅ Успешно импортировано ${count} тем в коллекцию 'general-topics'`);
    console.log('\n📋 Проверьте данные в Firestore Console:');
    console.log('https://console.firebase.google.com/project/psych-dev-site-prod/firestore/data/general-topics');

  } catch (error) {
    console.error('❌ Ошибка при импорте:', error);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

importGeneralPsychology()
  .then(() => {
    console.log('\n🎉 Импорт завершён');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Критическая ошибка:', err);
    process.exit(1);
  });
