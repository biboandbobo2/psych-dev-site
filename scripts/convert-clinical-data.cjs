const fs = require('fs');
const path = require('path');

// Читаем исходный JSON
const rawData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../clinical_psych_site_content.json'), 'utf8')
);

/**
 * Преобразует данные из JSON в формат Period
 */
function transformTopicToPeriod(topic, index) {
  const sections = topic.sections;

  // Создаём короткий ID из названия
  const periodId = `clinical-${index + 1}`;

  // Преобразуем "Понятия" в concepts (массив строк с URL)
  const concepts = (sections['Понятия'] || []).map(item =>
    item.url ? `${item.term} (${item.url})` : item.term
  );

  // Преобразуем "Ключевые авторы"
  const authors = (sections['Ключевые авторы'] || []).map(item => ({
    name: item.name,
    url: item.url
  }));

  // Преобразуем "Видео-лекция" в video_playlist
  const videoPlaylist = (sections['Видео-лекция'] || []).map(item => ({
    title: item.title,
    url: item.url
  }));

  // Преобразуем "Основная литература"
  const coreLiterature = (sections['Основная литература'] || []).map(item => ({
    title: item.title,
    url: item.url
  }));

  // Преобразуем "Дополнительная литература"
  const extraLiterature = (sections['Дополнительная литература'] || []).map(item => ({
    title: item.title,
    url: item.url
  }));

  // Преобразуем "Дополнительные видео и лекции"
  const extraVideos = (sections['Дополнительные видео и лекции'] || []).map(item => ({
    title: item.title || 'Видео',
    url: item.url
  }));

  // Преобразуем "Досуговое"
  const leisure = (sections['Досуговое'] || []).map(item => ({
    title: item.title,
    url: item.url
  }));

  return {
    period: periodId,
    title: topic.title,
    subtitle: `Тема ${index + 1} курса клинической психологии`,
    video_playlist: videoPlaylist,
    concepts: concepts,
    authors: authors,
    core_literature: coreLiterature,
    extra_literature: extraLiterature,
    extra_videos: extraVideos,
    leisure: leisure,
    accent: '#8B5CF6', // Фиолетовый цвет для всех тем клинической психологии
    accent100: '#F5F3FF',
    published: true,
    order: index + 1
  };
}

// Преобразуем все темы
const convertedTopics = rawData.topics.map(transformTopicToPeriod);

// Добавляем вводную тему
const introTopic = {
  period: 'clinical-intro',
  title: 'Введение в клиническую психологию',
  subtitle: 'Вводное занятие курса',
  video_playlist: [],
  concepts: [
    'Клиническая психология',
    'Патопсихология',
    'Психодиагностика',
    'Психические расстройства'
  ],
  authors: [],
  core_literature: [],
  extra_literature: [],
  extra_videos: [],
  leisure: [],
  accent: '#8B5CF6',
  accent100: '#F5F3FF',
  published: true,
  order: 0
};

// Объединяем всё
const allTopics = [introTopic, ...convertedTopics];

// Сохраняем результат
const outputPath = path.join(__dirname, '../src/data/clinical-topics.json');
fs.writeFileSync(outputPath, JSON.stringify(allTopics, null, 2), 'utf8');

console.log(`✅ Преобразовано ${allTopics.length} тем`);
console.log(`📁 Сохранено в: ${outputPath}`);
console.log('\nСписок тем:');
allTopics.forEach((topic, i) => {
  console.log(`  ${i + 1}. ${topic.title} (${topic.period})`);
});
