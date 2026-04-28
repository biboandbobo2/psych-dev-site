// Психология-релевантный скоринг: словари по языкам + non-psychology
// блокеры (terms, venues). Используется для post-processing OpenAlex / OpenAIRE / SS.

const PSYCHOLOGY_TERMS: Record<string, string[]> = {
  en: [
    'psychology', 'psychological', 'psychologist', 'psychotherapy', 'psychotherapist',
    'psychiatry', 'psychiatric', 'mental health', 'mental disorder', 'mental illness',
    'therapy', 'therapist', 'counseling', 'counselor', 'clinical', 'treatment',
    'developmental', 'child development', 'adolescent', 'attachment', 'parenting',
    'cognitive', 'cognition', 'memory', 'attention', 'perception', 'learning',
    'executive function', 'decision making', 'problem solving', 'intelligence',
    'social psychology', 'personality', 'behavior', 'behaviour', 'emotion', 'emotional',
    'interpersonal', 'relationship', 'motivation', 'self-esteem', 'identity',
    'neuroscience', 'neuropsychology', 'brain', 'neural', 'neurocognitive',
    'participants', 'subjects', 'questionnaire', 'scale', 'inventory', 'assessment',
    'intervention', 'experiment', 'longitudinal', 'cross-sectional',
    'anxiety', 'depression', 'ptsd', 'trauma', 'stress', 'burnout',
    'adhd', 'autism', 'schizophrenia', 'bipolar', 'ocd', 'phobia',
    'narcissism', 'narcissistic', 'borderline', 'dissociation',
  ],
  ru: [
    'психология', 'психологический', 'психолог', 'психотерапия', 'психотерапевт',
    'психиатрия', 'психиатр', 'психическое здоровье', 'психическое расстройство',
    'терапия', 'терапевт', 'консультирование', 'клинический', 'лечение',
    'развитие', 'детское развитие', 'подростковый', 'привязанность', 'воспитание',
    'когнитивный', 'познание', 'память', 'внимание', 'восприятие', 'обучение',
    'исполнительные функции', 'принятие решений', 'интеллект', 'мышление',
    'социальная психология', 'личность', 'поведение', 'эмоция', 'эмоциональный',
    'межличностный', 'отношения', 'мотивация', 'самооценка', 'идентичность',
    'нейронаука', 'нейропсихология', 'мозг', 'нейронный', 'нейрокогнитивный',
    'респондент', 'испытуемый', 'опросник', 'шкала', 'методика', 'диагностика',
    'интервенция', 'эксперимент', 'лонгитюдный', 'выборка',
    'тревога', 'тревожность', 'депрессия', 'птср', 'травма', 'стресс', 'выгорание',
    'сдвг', 'аутизм', 'шизофрения', 'биполярный', 'окр', 'фобия',
    'нарциссизм', 'нарциссический', 'пограничный', 'диссоциация',
    'психика', 'сознание', 'подсознание', 'бессознательное', 'защитные механизмы',
    'копинг', 'адаптация', 'ресилентность', 'благополучие',
  ],
  de: [
    'psychologie', 'psychologisch', 'psychologe', 'psychotherapie', 'psychotherapeut',
    'psychiatrie', 'psychiater', 'psychische gesundheit', 'psychische störung',
    'therapie', 'therapeut', 'beratung', 'klinisch', 'behandlung',
    'entwicklung', 'kindheitsentwicklung', 'bindung', 'erziehung',
    'kognitiv', 'kognition', 'gedächtnis', 'aufmerksamkeit', 'wahrnehmung',
    'sozialpsychologie', 'persönlichkeit', 'verhalten', 'emotion', 'motivation',
    'neurowissenschaft', 'neuropsychologie', 'gehirn',
    'angst', 'depression', 'trauma', 'stress', 'burnout', 'störung', 'syndrom',
  ],
  fr: [
    'psychologie', 'psychologique', 'psychologue', 'psychothérapie', 'psychothérapeute',
    'psychiatrie', 'psychiatre', 'santé mentale', 'trouble mental',
    'thérapie', 'thérapeute', 'conseil', 'clinique', 'traitement',
    'développement', 'attachement', 'éducation', 'enfance',
    'cognitif', 'cognition', 'mémoire', 'attention', 'perception',
    'psychologie sociale', 'personnalité', 'comportement', 'émotion', 'motivation',
    'neuroscience', 'neuropsychologie', 'cerveau',
    'anxiété', 'dépression', 'traumatisme', 'stress', 'trouble', 'syndrome',
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
    'ansiedad', 'depresión', 'trauma', 'estrés', 'trastorno', 'síndrome',
    'narcisismo', 'narcisista',
  ],
  // TODO: Re-enable Chinese when needed
};

// Non-psychology terms: presence indicates article is NOT about psychology
const NON_PSYCHOLOGY_TERMS = [
  // Agriculture / Soil science
  'soil', 'roughness', 'tillage', 'agronomie', 'agronomy', 'agricultural', 'crop',
  'irrigation', 'fertilizer', 'agrofitocenoz', 'почва', 'пахота', 'агрономия', 'урожай',
  'удобрение', 'агрофитоценоз', 'растениеводство',
  // Physics / Electronics / Engineering
  'electrical resistance', 'ohm', 'circuit', 'voltage', 'current', 'capacitor',
  'resistor', 'semiconductor', 'transistor', 'plasma coating', 'ion-plasma',
  'износостойкость', 'диод', 'транзистор', 'конденсатор', 'вакуумн',
  'электрическое сопротивление', 'омическое', 'цепь', 'напряжение',
  // Materials science
  'alloy', 'corrosion', 'metallurgy', 'tensile', 'polymer', 'сплав', 'коррозия',
  // Biology (non-psychology)
  'bacteria', 'virus', 'antibiotic', 'enzyme', 'photosynthesis', 'yeast', 'dna sequencing',
  'бактерия', 'вирус', 'антибиотик', 'фермент', 'фотосинтез', 'дрожж',
  // Ornithology / Zoology (not psychology)
  'bird migration', 'ornithology', 'nesting', 'passeriformes', 'миграция птиц',
  'орнитология', 'гнездование', 'воробьинообразн',
  // Chemistry
  'chemical reaction', 'catalyst', 'molecule', 'oxidation', 'катализатор', 'окисление',
  // Geology
  'geology', 'seismic', 'tectonic', 'earthquake', 'геология', 'сейсмический', 'землетрясение',
  // Astronomy
  'galaxy', 'asteroid', 'planetary', 'космический', 'галактика', 'астероид',
  // Medicine (non-psychiatry/non-psychology)
  'spine surgery', 'vertebral', 'spinal fixation', 'transpedicular', 'echocardiography',
  'myocardial', 'ischemia', 'cardiac stress', 'фиксация позвоночника', 'транспедикулярн',
  'эхокардиография', 'миокард', 'ишемия',
  // IT/AI (not cognitive psychology)
  'cloud service', 'облачный сервис', 'робототехническ', 'autonomous robot',
  'криптовалют', 'блокчейн', 'blockchain',
  // Linguistics / Pure pedagogy (not educational psychology)
  'pronunciation', 'grammar teaching', 'language instruction', 'произношение',
  'грамматика обучени', 'методика преподавания языка',
  // Economics/Finance (not economic psychology)
  'gdp', 'inflation rate', 'monetary policy', 'fiscal', 'macroprudential',
  'stress testing imf', 'денежная политика', 'макропруденциальн', 'стресс-тестирование мвф',
  // History/Political science (not political psychology)
  'historical memory', 'политическая идентичность региона', 'историческая память',
  // Literature studies
  'культурный герой', 'сказочный мир', 'натурфилософск',
];

// Non-psychology venue patterns (journal names that indicate non-psychology content)
const NON_PSYCHOLOGY_VENUES = [
  // Agriculture / Biology
  'agronomi', 'soil', 'crop', 'plant', 'botany', 'kemerovo state university',
  'bulletin of kemerovo',
  // Geology / Physics / Chemistry
  'geology', 'geophys', 'electric', 'electron', 'circuit', 'physics', 'chemistry',
  'chemical', 'material', 'metallurg', 'mining', 'petroleum',
  // Russian technical
  'энерг', 'физик', 'химия', 'агрономия', 'почвовед', 'геология', 'механика', 'машиностр',
  // Astronomy
  'astronomy', 'astrophys', 'космос',
  // Medical (non-psychiatric)
  'spine surgery', 'хирургия позвоночника', 'cardiol', 'кардиол',
  // IT
  'program systems', 'information technolog', 'информационн', 'open information',
  // History / Political science
  'власть', 'revue des études slaves', 'bibliosphere',
  // General (too broad)
  'fundamental research', 'фундаментальные исследования',
];

// OpenAlex Psychology concept IDs for filtering
// These are ML-classified categories that dramatically improve relevance
export const PSYCHOLOGY_CONCEPT_IDS = [
  'C15744967',   // Psychology (main, level 0)
  'C77805123',   // Social psychology (level 1)
  'C138496976',  // Developmental psychology (level 1)
  'C70410870',   // Clinical psychology (level 1)
  'C180747234',  // Cognitive psychology (level 1)
  'C75630572',   // Applied psychology (level 1)
  'C126838900',  // Psychiatry (related)
  'C134895398',  // Educational psychology (level 2)
];

export const PSYCHOLOGY_SCORE_THRESHOLD = 10;

/**
 * Скорит статью по релевантности для психологии: положительные баллы за
 * психология-термины (по языку + кросс-язык), отрицательные за не-психо
 * термины и не-психо журналы. Возвращает clamp(score, 0..100).
 */
export function getPsychologyScore(
  title: string,
  abstract?: string | null,
  lang?: string,
  venue?: string | null,
): number {
  let score = 0;
  const titleLower = title.toLowerCase();
  const abstractLower = abstract?.toLowerCase() ?? '';
  const venueLower = venue?.toLowerCase() ?? '';
  const primaryTerms = PSYCHOLOGY_TERMS[lang ?? 'en'] ?? PSYCHOLOGY_TERMS.en;

  // Positive scoring: psychology terms
  for (const term of primaryTerms) {
    const termLower = term.toLowerCase();
    if (titleLower.includes(termLower)) score += 15;
    if (abstractLower.includes(termLower)) score += 5;
  }

  for (const [termLang, terms] of Object.entries(PSYCHOLOGY_TERMS)) {
    if (termLang === (lang ?? 'en')) continue;
    for (const term of terms) {
      const termLower = term.toLowerCase();
      if (titleLower.includes(termLower)) score += 10;
      if (abstractLower.includes(termLower)) score += 3;
    }
  }

  // Negative scoring: non-psychology terms
  for (const term of NON_PSYCHOLOGY_TERMS) {
    const termLower = term.toLowerCase();
    if (titleLower.includes(termLower)) score -= 25; // Strong penalty in title
    if (abstractLower.includes(termLower)) score -= 10;
  }

  // Negative scoring: non-psychology venue/journal
  for (const pattern of NON_PSYCHOLOGY_VENUES) {
    if (venueLower.includes(pattern.toLowerCase())) {
      score -= 30; // Strong penalty for clearly non-psychology journals
      break; // Only penalize once
    }
  }

  return Math.max(0, Math.min(score, 100));
}
