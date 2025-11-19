const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Инициализация Firebase Admin
// Используем Application Default Credentials (ADC)
admin.initializeApp({
  projectId: 'psych-dev-site-prod'
});

const db = admin.firestore();

async function backupPeriods() {
  try {
    console.log('📦 Начинаем экспорт коллекции periods...\n');

    // Экспортируем коллекцию periods
    const periodsSnapshot = await db.collection('periods').get();
    const periodsData = [];

    periodsSnapshot.forEach(doc => {
      const data = doc.data();
      // Конвертируем Timestamp в обычные объекты для JSON
      const cleanData = {
        ...data,
        updatedAt: data.updatedAt ? {
          _seconds: data.updatedAt._seconds,
          _nanoseconds: data.updatedAt._nanoseconds
        } : null,
        createdAt: data.createdAt ? {
          _seconds: data.createdAt._seconds,
          _nanoseconds: data.createdAt._nanoseconds
        } : null
      };
      periodsData.push(cleanData);
      console.log(`  ✓ ${doc.id}: ${data.title || 'Без названия'}`);
    });

    // Экспортируем коллекцию intro (если есть)
    let introData = null;
    try {
      const introSnapshot = await db.collection('intro').get();
      if (!introSnapshot.empty) {
        const introDoc = introSnapshot.docs[0];
        const data = introDoc.data();
        introData = {
          ...data,
          updatedAt: data.updatedAt ? {
            _seconds: data.updatedAt._seconds,
            _nanoseconds: data.updatedAt._nanoseconds
          } : null,
          createdAt: data.createdAt ? {
            _seconds: data.createdAt._seconds,
            _nanoseconds: data.createdAt._nanoseconds
          } : null
        };
        console.log(`  ✓ intro: ${data.title || 'Без названия'}`);
      }
    } catch (err) {
      console.log('  ⚠️  Коллекция intro не найдена или пуста');
    }

    // Сохраняем backup с временной меткой
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = path.join(__dirname, '../backups');

    // Создаём директорию backups если её нет
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupData = {
      exportDate: new Date().toISOString(),
      projectId: 'psych-dev-site-prod',
      collections: {
        periods: periodsData,
        intro: introData
      },
      totalPeriods: periodsData.length
    };

    const backupPath = path.join(backupDir, `periods-backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');

    console.log(`\n✅ Backup успешно создан!`);
    console.log(`📁 Файл: ${backupPath}`);
    console.log(`📊 Экспортировано периодов: ${periodsData.length}`);
    console.log(`📊 Экспортировано intro: ${introData ? 'Да' : 'Нет'}`);

    return backupPath;

  } catch (error) {
    console.error('❌ Ошибка при создании backup:', error);
    throw error;
  } finally {
    await admin.app().delete();
  }
}

// Запускаем backup
backupPeriods()
  .then((backupPath) => {
    console.log('\n🎉 Backup завершён');
    console.log('💡 Используйте этот файл для восстановления в случае проблем');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Критическая ошибка:', err);
    process.exit(1);
  });
