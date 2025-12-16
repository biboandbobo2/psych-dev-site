/**
 * Psychology domain filter for post-processing search results.
 * Filters out non-psychology articles (e.g., "resistance" in physics).
 */

// Psychology-related terms by language
// These terms indicate the article is likely about psychology
const PSYCHOLOGY_TERMS: Record<string, string[]> = {
  en: [
    // Core psychology
    'psychology', 'psychological', 'psychologist', 'psychotherapy', 'psychotherapist',
    'psychiatry', 'psychiatric', 'mental health', 'mental disorder', 'mental illness',
    // Clinical
    'therapy', 'therapist', 'counseling', 'counselor', 'clinical', 'treatment',
    'diagnosis', 'symptoms', 'disorder', 'syndrome', 'pathology',
    // Development
    'developmental', 'child development', 'adolescent', 'attachment', 'parenting',
    'infant', 'childhood', 'lifespan', 'aging', 'gerontology',
    // Cognitive
    'cognitive', 'cognition', 'memory', 'attention', 'perception', 'learning',
    'executive function', 'decision making', 'problem solving', 'intelligence',
    // Social/Personality
    'social psychology', 'personality', 'behavior', 'behaviour', 'emotion', 'emotional',
    'interpersonal', 'relationship', 'motivation', 'self-esteem', 'identity',
    // Neuro
    'neuroscience', 'neuropsychology', 'brain', 'neural', 'neurocognitive',
    // Research methods
    'participants', 'subjects', 'questionnaire', 'scale', 'inventory', 'assessment',
    'intervention', 'experiment', 'longitudinal', 'cross-sectional',
    // Disorders
    'anxiety', 'depression', 'ptsd', 'trauma', 'stress', 'burnout',
    'adhd', 'autism', 'schizophrenia', 'bipolar', 'ocd', 'phobia',
    'narcissism', 'narcissistic', 'borderline', 'dissociation',
    // Education
    'educational psychology', 'school psychology', 'learning disability',
    // Organizational
    'organizational psychology', 'workplace', 'job satisfaction', 'leadership',
  ],
  ru: [
    // Базовые
    'психология', 'психологический', 'психолог', 'психотерапия', 'психотерапевт',
    'психиатрия', 'психиатр', 'психическое здоровье', 'психическое расстройство',
    // Клиническая
    'терапия', 'терапевт', 'консультирование', 'клинический', 'лечение',
    'диагноз', 'диагностика', 'симптом', 'расстройство', 'синдром', 'патология',
    // Развитие
    'развитие', 'детское развитие', 'подростковый', 'привязанность', 'воспитание',
    'младенец', 'детство', 'онтогенез', 'старение', 'геронтология',
    // Когнитивная
    'когнитивный', 'познание', 'память', 'внимание', 'восприятие', 'обучение',
    'исполнительные функции', 'принятие решений', 'интеллект', 'мышление',
    // Социальная/Личность
    'социальная психология', 'личность', 'поведение', 'эмоция', 'эмоциональный',
    'межличностный', 'отношения', 'мотивация', 'самооценка', 'идентичность',
    // Нейро
    'нейронаука', 'нейропсихология', 'мозг', 'нейронный', 'нейрокогнитивный',
    // Методы
    'респондент', 'испытуемый', 'опросник', 'шкала', 'методика', 'диагностика',
    'интервенция', 'эксперимент', 'лонгитюдный', 'выборка',
    // Расстройства
    'тревога', 'тревожность', 'депрессия', 'птср', 'травма', 'стресс', 'выгорание',
    'сдвг', 'аутизм', 'шизофрения', 'биполярный', 'окр', 'фобия',
    'нарциссизм', 'нарциссический', 'пограничный', 'диссоциация',
    // Педагогическая
    'педагогическая психология', 'школьная психология', 'трудности обучения',
    // Организационная
    'организационная психология', 'рабочее место', 'удовлетворённость работой', 'лидерство',
    // Дополнительно
    'психика', 'сознание', 'подсознание', 'бессознательное', 'защитные механизмы',
    'копинг', 'адаптация', 'ресилентность', 'благополучие', 'субъективное',
  ],
  de: [
    'psychologie', 'psychologisch', 'psychologe', 'psychotherapie', 'psychotherapeut',
    'psychiatrie', 'psychiater', 'psychische gesundheit', 'psychische störung',
    'therapie', 'therapeut', 'beratung', 'klinisch', 'behandlung',
    'entwicklung', 'kindheitsentwicklung', 'bindung', 'erziehung',
    'kognitiv', 'kognition', 'gedächtnis', 'aufmerksamkeit', 'wahrnehmung',
    'sozialpsychologie', 'persönlichkeit', 'verhalten', 'emotion', 'motivation',
    'neurowissenschaft', 'neuropsychologie', 'gehirn',
    'angst', 'depression', 'trauma', 'stress', 'burnout',
    'störung', 'syndrom', 'diagnose', 'symptom',
  ],
  fr: [
    'psychologie', 'psychologique', 'psychologue', 'psychothérapie', 'psychothérapeute',
    'psychiatrie', 'psychiatre', 'santé mentale', 'trouble mental',
    'thérapie', 'thérapeute', 'conseil', 'clinique', 'traitement',
    'développement', 'attachement', 'éducation', 'enfance',
    'cognitif', 'cognition', 'mémoire', 'attention', 'perception',
    'psychologie sociale', 'personnalité', 'comportement', 'émotion', 'motivation',
    'neuroscience', 'neuropsychologie', 'cerveau',
    'anxiété', 'dépression', 'traumatisme', 'stress',
    'trouble', 'syndrome', 'diagnostic', 'symptôme',
    'narcissisme', 'narcissique',
  ],
  es: [
    'psicología', 'psicológico', 'psicólogo', 'psicoterapia', 'psicoterapeuta',
    'psiquiatría', 'psiquiatra', 'salud mental', 'trastorno mental',
    'terapia', 'terapeuta', 'consejería', 'clínico', 'tratamiento',
    'desarrollo', 'apego', 'crianza', 'infancia',
    'cognitivo', 'cognición', 'memoria', 'atención', 'percepción',
    'psicología social', 'personalidad', 'comportamiento', 'emoción', 'motivación',
    'neurociencia', 'neuropsicología', 'cerebro',
    'ansiedad', 'depresión', 'trauma', 'estrés',
    'trastorno', 'síndrome', 'diagnóstico', 'síntoma',
    'narcisismo', 'narcisista',
  ],
  zh: [
    '心理学', '心理', '心理治疗', '精神病学', '精神健康',
    '治疗', '咨询', '临床', '发展', '依恋', '认知',
    '记忆', '注意', '感知', '社会心理', '人格', '行为',
    '情绪', '动机', '神经科学', '神经心理学', '大脑',
    '焦虑', '抑郁', '创伤', '压力', '障碍', '症状',
    '自恋',
  ],
};

// All terms combined for quick lookup (lowercase)
const ALL_TERMS_SET = new Set<string>();
for (const lang of Object.keys(PSYCHOLOGY_TERMS)) {
  for (const term of PSYCHOLOGY_TERMS[lang]) {
    ALL_TERMS_SET.add(term.toLowerCase());
  }
}

/**
 * Checks if text contains any psychology-related terms.
 * @param text - Text to check (title, abstract, etc.)
 * @param lang - Optional language hint for more precise matching
 * @returns true if text contains psychology terms
 */
export function containsPsychologyTerms(text: string, lang?: string): boolean {
  if (!text) return false;

  const lowerText = text.toLowerCase();

  // If language is specified, check that language's terms first
  if (lang && PSYCHOLOGY_TERMS[lang]) {
    for (const term of PSYCHOLOGY_TERMS[lang]) {
      if (lowerText.includes(term.toLowerCase())) {
        return true;
      }
    }
  }

  // Check all terms
  for (const term of ALL_TERMS_SET) {
    if (lowerText.includes(term)) {
      return true;
    }
  }

  return false;
}

/**
 * Psychology relevance score (0-100).
 * Higher score = more likely to be psychology-related.
 */
export function getPsychologyRelevanceScore(
  title: string,
  abstract?: string | null,
  lang?: string
): number {
  let score = 0;
  const titleLower = title.toLowerCase();
  const abstractLower = abstract?.toLowerCase() ?? '';

  // Get terms for the specified language or use English
  const primaryTerms = PSYCHOLOGY_TERMS[lang ?? 'en'] ?? PSYCHOLOGY_TERMS.en;

  // Title matches are worth more
  for (const term of primaryTerms) {
    const termLower = term.toLowerCase();
    if (titleLower.includes(termLower)) {
      score += 15; // Title match
    }
    if (abstractLower.includes(termLower)) {
      score += 5; // Abstract match
    }
  }

  // Check other languages' terms (less weight)
  for (const [termLang, terms] of Object.entries(PSYCHOLOGY_TERMS)) {
    if (termLang === (lang ?? 'en')) continue;
    for (const term of terms) {
      const termLower = term.toLowerCase();
      if (titleLower.includes(termLower)) {
        score += 10;
      }
      if (abstractLower.includes(termLower)) {
        score += 3;
      }
    }
  }

  return Math.min(score, 100);
}

/**
 * Filter results to keep only psychology-related articles.
 * @param results - Array of search results with title and paragraph
 * @param threshold - Minimum relevance score (0-100), default 10
 */
export function filterPsychologyResults<T extends { title: string; paragraph?: string | null; language?: string }>(
  results: T[],
  threshold = 10
): T[] {
  return results.filter((item) => {
    const score = getPsychologyRelevanceScore(
      item.title,
      item.paragraph,
      item.language
    );
    return score >= threshold;
  });
}

export { PSYCHOLOGY_TERMS };
