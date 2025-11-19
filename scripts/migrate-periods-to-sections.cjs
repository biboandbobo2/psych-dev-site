const admin = require('firebase-admin');

// Инициализация Firebase Admin
admin.initializeApp({
  projectId: 'psych-dev-site-prod'
});

const db = admin.firestore();

/**
 * Проверяет, использует ли период legacy формат
 */
function isLegacyFormat(data) {
  // Если есть sections с контентом - это новый формат
  if (data.sections && Object.keys(data.sections).length > 0) {
    const hasSectionContent = Object.values(data.sections).some(
      section => section && Array.isArray(section.content) && section.content.length > 0
    );
    if (hasSectionContent) {
      return false;
    }
  }

  // Если есть legacy поля - это старый формат
  const hasLegacyFields =
    data.video_playlist ||
    data.video_url ||
    (Array.isArray(data.concepts) && data.concepts.length > 0) ||
    (Array.isArray(data.authors) && data.authors.length > 0) ||
    (Array.isArray(data.core_literature) && data.core_literature.length > 0) ||
    (Array.isArray(data.extra_literature) && data.extra_literature.length > 0) ||
    (Array.isArray(data.extra_videos) && data.extra_videos.length > 0) ||
    (Array.isArray(data.leisure) && data.leisure.length > 0) ||
    data.self_questions_url;

  return hasLegacyFields;
}

/**
 * Преобразует legacy данные в sections формат
 */
function convertToSections(data) {
  const sections = {};
  const trimmedTitle = data.title || 'Без названия';

  // Video Section
  if (Array.isArray(data.video_playlist) && data.video_playlist.length > 0) {
    sections.video_section = {
      title: 'Видео',
      content: data.video_playlist.map(video => ({
        title: video.title || trimmedTitle,
        url: video.url || '',
        ...(video.deckUrl || video.deck_url ? { deckUrl: video.deckUrl || video.deck_url } : {}),
        ...(video.audioUrl || video.audio_url ? { audioUrl: video.audioUrl || video.audio_url } : {})
      }))
    };
  } else if (data.video_url) {
    // Fallback на одиночное видео
    sections.video_section = {
      title: 'Видео',
      content: [{
        title: trimmedTitle,
        url: data.video_url,
        ...(data.deck_url ? { deckUrl: data.deck_url } : {}),
        ...(data.audio_url ? { audioUrl: data.audio_url } : {})
      }]
    };
  }

  // Concepts
  if (Array.isArray(data.concepts) && data.concepts.length > 0) {
    sections.concepts = {
      title: 'Основные понятия',
      content: data.concepts
    };
  }

  // Authors
  if (Array.isArray(data.authors) && data.authors.length > 0) {
    sections.authors = {
      title: 'Персоналии',
      content: data.authors
    };
  }

  // Core Literature
  if (Array.isArray(data.core_literature) && data.core_literature.length > 0) {
    sections.core_literature = {
      title: 'Основная литература',
      content: data.core_literature
    };
  }

  // Extra Literature
  if (Array.isArray(data.extra_literature) && data.extra_literature.length > 0) {
    sections.extra_literature = {
      title: 'Дополнительная литература',
      content: data.extra_literature
    };
  }

  // Extra Videos
  if (Array.isArray(data.extra_videos) && data.extra_videos.length > 0) {
    sections.extra_videos = {
      title: 'Дополнительные видео',
      content: data.extra_videos
    };
  }

  // Leisure
  if (Array.isArray(data.leisure) && data.leisure.length > 0) {
    sections.leisure = {
      title: 'Досуг',
      content: data.leisure
    };
  }

  // Self Questions
  if (data.self_questions_url) {
    sections.self_questions = {
      title: 'Вопросы для самопроверки',
      content: [data.self_questions_url]
    };
  }

  return sections;
}

/**
 * Создает объект для обновления документа
 */
function createUpdateData(data, sections) {
  const updateData = {
    sections: sections,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  // Удаляем legacy поля
  const legacyFields = [
    'video_url',
    'video_playlist',
    'deck_url',
    'audio_url',
    'self_questions_url',
    'concepts',
    'authors',
    'core_literature',
    'extra_literature',
    'extra_videos',
    'leisure'
  ];

  legacyFields.forEach(field => {
    updateData[field] = admin.firestore.FieldValue.delete();
  });

  return updateData;
}

/**
 * Главная функция миграции
 */
async function migratePeriods(dryRun = true, periodsToMigrate = null) {
  try {
    console.log('🔄 Начинаем миграцию коллекции periods на формат sections...\n');
    console.log(`📋 Режим: ${dryRun ? '🔍 DRY-RUN (без изменений)' : '✍️  РЕАЛЬНАЯ МИГРАЦИЯ'}\n`);

    // Получаем все периоды
    const snapshot = await db.collection('periods').get();

    let toMigrate = [];
    let alreadyMigrated = [];
    let empty = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const periodId = doc.id;

      // Если указаны конкретные периоды - фильтруем
      if (periodsToMigrate && !periodsToMigrate.includes(periodId)) {
        return;
      }

      if (isLegacyFormat(data)) {
        toMigrate.push({ id: periodId, data });
      } else if (data.sections && Object.keys(data.sections).length > 0) {
        alreadyMigrated.push({ id: periodId, title: data.title });
      } else {
        empty.push({ id: periodId, title: data.title });
      }
    });

    // Отчёт
    console.log('📊 Анализ данных:');
    console.log(`   ✅ Уже на sections формате: ${alreadyMigrated.length}`);
    console.log(`   🔄 Требуют миграции: ${toMigrate.length}`);
    console.log(`   ⚠️  Пустые (нет контента): ${empty.length}\n`);

    if (alreadyMigrated.length > 0) {
      console.log('✅ Уже мигрированы:');
      alreadyMigrated.forEach(p => console.log(`   • ${p.id}: ${p.title}`));
      console.log('');
    }

    if (empty.length > 0) {
      console.log('⚠️  Пустые периоды (пропускаем):');
      empty.forEach(p => console.log(`   • ${p.id}: ${p.title}`));
      console.log('');
    }

    if (toMigrate.length === 0) {
      console.log('🎉 Нет периодов для миграции!');
      return { success: true, migrated: 0 };
    }

    console.log('🔄 Периоды для миграции:');
    toMigrate.forEach(p => {
      console.log(`   • ${p.id}: ${p.data.title}`);
    });
    console.log('');

    // Выполняем миграцию
    if (dryRun) {
      console.log('🔍 DRY-RUN: Показываем изменения без сохранения\n');

      for (const period of toMigrate) {
        const sections = convertToSections(period.data);
        console.log(`\n📄 ${period.id}: ${period.data.title}`);
        console.log('   Будет создан объект sections:');
        Object.keys(sections).forEach(key => {
          const section = sections[key];
          console.log(`     • ${key}: ${section.title} (${section.content.length} элементов)`);
        });
        console.log('   Будут удалены legacy поля:');
        console.log('     • video_url, video_playlist, deck_url, audio_url');
        console.log('     • concepts, authors, core_literature, extra_literature');
        console.log('     • extra_videos, leisure, self_questions_url');
      }

      console.log('\n\n✅ DRY-RUN завершён. Запустите с флагом --execute для реальной миграции.');
      return { success: true, dryRun: true, toMigrate: toMigrate.length };

    } else {
      console.log('✍️  Выполняем реальную миграцию...\n');

      const batch = db.batch();
      let count = 0;

      for (const period of toMigrate) {
        const sections = convertToSections(period.data);
        const updateData = createUpdateData(period.data, sections);

        const docRef = db.collection('periods').doc(period.id);
        batch.update(docRef, updateData);

        count++;
        console.log(`   ✓ ${period.id}: ${period.data.title}`);
        console.log(`     Создано секций: ${Object.keys(sections).length}`);
      }

      await batch.commit();

      console.log(`\n✅ Успешно мигрировано ${count} периодов!`);
      console.log('📋 Проверьте результат в Firestore Console:');
      console.log('https://console.firebase.google.com/project/psych-dev-site-prod/firestore/data/periods');

      return { success: true, migrated: count };
    }

  } catch (error) {
    console.error('❌ Ошибка при миграции:', error);
    throw error;
  } finally {
    await admin.app().delete();
  }
}

// Парсинг аргументов командной строки
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
const periodsArg = args.find(arg => arg.startsWith('--periods='));
const periodsToMigrate = periodsArg ? periodsArg.split('=')[1].split(',') : null;

// Запускаем миграцию
migratePeriods(dryRun, periodsToMigrate)
  .then((result) => {
    if (result.dryRun) {
      console.log('\n💡 Чтобы выполнить реальную миграцию, запустите:');
      console.log('   node scripts/migrate-periods-to-sections.cjs --execute');
      console.log('\n💡 Для миграции конкретных периодов:');
      console.log('   node scripts/migrate-periods-to-sections.cjs --execute --periods=prenatal,infancy');
    } else {
      console.log('\n🎉 Миграция завершена успешно!');
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Критическая ошибка:', err);
    process.exit(1);
  });
