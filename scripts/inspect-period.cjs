const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'psych-dev-site-prod'
});

const db = admin.firestore();

async function inspectPeriod(periodId) {
  try {
    const docRef = db.collection('periods').doc(periodId);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`❌ Период ${periodId} не найден`);
      return;
    }

    const data = doc.data();

    console.log(`\n📄 Период: ${periodId}`);
    console.log(`📌 Название: ${data.title}`);
    console.log(`\n🔍 Структура данных:\n`);
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await admin.app().delete();
  }
}

const periodId = process.argv[2] || 'prenatal';
inspectPeriod(periodId);
