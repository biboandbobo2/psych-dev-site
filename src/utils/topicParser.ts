export function parseTopicsText(text: string): string[] {
  if (!text.trim()) return [];

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter((line) => line.length > 0);
}

export function previewTopics(text: string): {
  topics: string[];
  count: number;
  warnings: string[];
} {
  const topics = parseTopicsText(text);
  const warnings: string[] = [];

  topics.forEach((topic, index) => {
    if (topic.length < 10) {
      warnings.push(`Тема ${index + 1} слишком короткая: "${topic}"`);
    }
    if (topic.length > 500) {
      warnings.push(`Тема ${index + 1} слишком длинная (${topic.length} символов)`);
    }
  });

  return {
    topics,
    count: topics.length,
    warnings,
  };
}
