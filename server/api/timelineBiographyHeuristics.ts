import {
  BRANCH_SLOT_ORDER,
  BRANCH_X_OFFSETS,
  DEFAULT_BRANCH_LENGTH,
  EVENT_ICON_IDS,
  SPHERE_META,
  TIMELINE_PERIODIZATION_IDS,
  LINE_X_POSITION,
  type BiographyTimelinePlan,
  type BiographyTimelineEventPlan,
  type BiographyTimelineFact,
  type BiographyTimelineBranchPlan,
  type OccupiedBranchLane,
  type TimelineIconId,
  type TimelineSphere,
} from './timelineBiographyTypes.js';

export function normalizeSphere(sphere: unknown): TimelineSphere | undefined {
  return typeof sphere === 'string' && sphere in SPHERE_META ? (sphere as TimelineSphere) : undefined;
}

export function normalizeIcon(iconId: unknown): TimelineIconId | undefined {
  return typeof iconId === 'string' && EVENT_ICON_IDS.includes(iconId as TimelineIconId)
    ? (iconId as TimelineIconId)
    : undefined;
}

export function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

const RUSSIAN_MONTHS: Record<string, string> = {
  января: '01', февраля: '02', марта: '03', апреля: '04',
  мая: '05', июня: '06', июля: '07', августа: '08',
  сентября: '09', октября: '10', ноября: '11', декабря: '12',
  январь: '01', февраль: '02', март: '03', апрель: '04',
  май: '05', июнь: '06', июль: '07', август: '08',
  сентябрь: '09', октябрь: '10', ноябрь: '11', декабрь: '12',
};

export function russianDateToISO(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // Strip old-style date annotations like "26 мая [6 июня]" or "26 мая (6 июня)"
  // Prefer new-style date (in brackets) if present
  const bracketMatch = dateStr.match(/\[(\d{1,2}\s+[A-Za-zА-Яа-яЁё]+)\]\s*(\d{4})/);
  const parenMatch = dateStr.match(/\((\d{1,2}\s+[A-Za-zА-Яа-яЁё]+)\)\s*(\d{4})/);
  const newStyleDate = bracketMatch
    ? `${bracketMatch[1]} ${bracketMatch[2]}`
    : parenMatch
      ? `${parenMatch[1]} ${parenMatch[2]}`
      : undefined;
  const normalizedStr = newStyleDate ?? dateStr;

  const match = normalizedStr.match(/(\d{1,2})\s+([A-Za-zА-Яа-яЁё]+)\s+(\d{4})/);
  if (!match) {
    const yearOnly = normalizedStr.match(/(\d{4})/);
    if (yearOnly) return `${yearOnly[1]}-01-01`;
    return dateStr;
  }

  const day = match[1].padStart(2, '0');
  const month = RUSSIAN_MONTHS[match[2].toLowerCase()];
  const year = match[3];
  if (!month) return dateStr;
  return `${year}-${month}-${day}`;
}

export function overlapsAgeRange(a: OccupiedBranchLane, startAge: number, endAge: number) {
  return !(a.endAge + 1 < startAge || endAge + 1 < a.startAge);
}

export function pickBranchX(sphere: TimelineSphere, startAge: number, endAge: number, occupied: OccupiedBranchLane[]) {
  const slotOrder = BRANCH_SLOT_ORDER[sphere] || BRANCH_SLOT_ORDER.other;
  for (const slotIndex of slotOrder) {
    const x = LINE_X_POSITION + BRANCH_X_OFFSETS[slotIndex];
    const collides = occupied.some((lane) => lane.x === x && overlapsAgeRange(lane, startAge, endAge));
    if (!collides) {
      occupied.push({ x, startAge, endAge });
      return x;
    }
  }

  const x = LINE_X_POSITION + BRANCH_X_OFFSETS[slotOrder[0] ?? 0];
  occupied.push({ x, startAge, endAge });
  return x;
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function extractQuotedWorkTitle(value: string) {
  return value.match(/[«"](.*?)[»"]/u)?.[1]?.trim();
}

export function normalizeFactText(value: string) {
  return normalizeWhitespace(value.toLowerCase())
    .replace(/[«»"'`().,:;!?-]/g, ' ')
    .replace(/\b(году|года|лет|event|main|branch|публикация|обучение|карьерный|этап|жизнь)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildEventFactKey(event: Pick<BiographyTimelineEventPlan, 'age' | 'label' | 'notes'>) {
  const title = extractQuotedWorkTitle(event.label) || (event.notes ? extractQuotedWorkTitle(event.notes) : undefined);
  const normalizedAge = Math.round(Number(event.age) * 2) / 2;
  if (title) {
    return `${normalizedAge}|work|${normalizeFactText(title)}`;
  }

  const sourceText = normalizeFactText(event.notes || event.label);
  return `${normalizedAge}|fact|${sourceText.slice(0, 96)}`;
}

export function hasTerminalLifeEvent(events: BiographyTimelineEventPlan[], currentAge: number) {
  const terminalEvent = events.find((event) =>
    /(смерт|гибел|погиб|умер|дуэл|died|death|killed)/i.test(`${event.label} ${event.notes ?? ''}`)
  );

  if (!terminalEvent) return false;
  return Math.abs(terminalEvent.age - currentAge) <= 1.5;
}

export function splitBiographyExtractIntoSentences(extract: string) {
  return extract
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length >= 12);
}

export function extractYears(sentence: string) {
  return [...sentence.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g)]
    .map((match) => Number(match[1]))
    .filter((year, index, years) => year >= 1000 && year <= 2099 && years.indexOf(year) === index);
}

function reorderCommaSeparatedName(name: string) {
  const parts = name.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : name.trim();
}

export function inferSubjectName(articleTitle: string) {
  const trimmed = normalizeWhitespace(articleTitle);
  return reorderCommaSeparatedName(trimmed);
}

export function inferCanvasName(subjectName: string) {
  const parts = subjectName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[parts.length - 1]} ${parts[0]}`.slice(0, 40);
  }
  return subjectName.slice(0, 40);
}

export function inferBirthDetailsFromExtract(extract: string) {
  const sentences = splitBiographyExtractIntoSentences(extract);
  const birthSentence = sentences.find((sentence) => /родил|born/i.test(sentence)) ?? sentences[0] ?? '';
  const years = extractYears(birthSentence);
  const birthYear = years[0];

  // Try new-style date in brackets: "26 мая [6 июня] 1799" → "6 июня 1799"
  const bracketDateMatch = birthSentence.match(/\[(\d{1,2}\s+[A-Za-zА-Яа-яЁё]+)\]\s*(\d{4})/);
  // Try standard date: "6 июня 1799"
  const standardDateMatch = birthSentence.match(/(\d{1,2}\s+[A-Za-zА-Яа-яЁё]+\s+\d{4})/);
  // Fallback: year only
  const yearOnlyMatch = birthYear ? String(birthYear) : undefined;

  const dateStr = bracketDateMatch
    ? `${bracketDateMatch[1]} ${bracketDateMatch[2]}`
    : standardDateMatch?.[1] ?? yearOnlyMatch;

  const placeMatch =
    birthSentence.match(/родил[а-яёa-z]*\s+(?:в|in)\s+([^,.();]+?)(?:\s+(?:в|in)\s+\d{4}\b|[,.();]|$)/i) ??
    birthSentence.match(/\(\s*[^,]+,\s*([^—,)]+?)(?:\s*[—,)])/);

  return {
    birthYear,
    birthDetails: {
      date: dateStr ? normalizeWhitespace(dateStr) : undefined,
      place: placeMatch?.[1] ? normalizeWhitespace(placeMatch[1]) : undefined,
    },
  };
}

export function inferDeathYearFromExtract(extract: string) {
  const sentences = splitBiographyExtractIntoSentences(extract);
  const deathSentence = sentences.find((sentence) => /умер|скончал|погиб|смерт|дуэл|died|killed|death/i.test(sentence));
  const years = deathSentence ? extractYears(deathSentence) : [];
  return years[0];
}

export function isLikelyTimelineEventSentence(sentence: string) {
  const normalized = sentence.toLowerCase();
  const hasYear = extractYears(sentence).length > 0;
  const hasAction = /(родил|born|поступ|окончил|учил|образован|опублик|издал|написал|создал|стал|назнач|служ|ссыл|переех|вернул|женил|брак|родил[а-яё]* сына|родил[а-яё]* дочь|умер|погиб|скончал|болез|дуэл|друж|перепис|кружок|декабр|нян|воспит|детств|усадьб|перв.*стих|дома|died|moved|married|published|appointed|founded|returned|exile|friend|circle|correspond|childhood|nurse|estate)/i.test(
    sentence
  );
  const looksLikeLead =
    hasYear &&
    /—/.test(sentence) &&
    /(поэт|писател|драматург|автор|historian|poet|writer|novelist|composer|artist)/i.test(normalized) &&
    !hasAction;

  if (!hasYear) return false;
  if (looksLikeLead) return false;
  if (!hasAction && sentence.length > 180) return false;

  return true;
}

export function inferSphereFromSentence(sentence: string): TimelineSphere {
  const normalized = sentence.toLowerCase();

  if (/(родил|born)/i.test(normalized)) {
    return 'family';
  }
  if (/(лице|школ|универс|академ|институт|учил|образован|домашн.*обуч|гуверн|настав|нян|воспит|чтен|stud|school|college|tutor)/i.test(normalized)) {
    return 'education';
  }
  if (/(женил|брак|свад|семь|сын|доч|дет|ребён|married|family|wife|husband|children)/i.test(normalized)) {
    return 'family';
  }
  if (/(умер|погиб|скончал|дуэл|болез|ранен|died|death|ill|injur)/i.test(normalized)) {
    return 'health';
  }
  if (/(ссыл|сослан|переех|эмигр|путешеств|жил в|вернул|москв|петербург|одесс|кишин|молдов|крым|кавказ|михайл|болдин|царск|захаров|усадьб|travel|moved|exile|relocat|estate)/i.test(normalized)) {
    return 'place';
  }
  if (/(друж|друз|переписк|кружок|общество|арзамас|лампа|декабр|лицейск|пущин|дельвиг|кюхельбекер|чаадаев|friend|circle|acquaint|correspond)/i.test(normalized)) {
    return 'friends';
  }
  if (/(денег|финанс|банк|состояни|долг|наследств|fund|money|finance|wealth)/i.test(normalized)) {
    return 'finance';
  }
  if (/(арест|тюрьм|суд|следств|надзор|полиц|цензур|запрет|prison|arrest|trial|censor)/i.test(normalized)) {
    return 'career';
  }
  if (/(рисова|музык|театр|хобб|спорт|painting|music|sport|hobby)/i.test(normalized)) {
    return 'hobby';
  }
  if (/(опублик|издал|поэм|роман|стих|пьес|произвед|книг|повест|драм|элег|трагед|заверш.*работу|начал работу|написал|сочин|творчеств|poem|novel|published|book|composed|wrote)/i.test(normalized)) {
    return 'creativity';
  }
  if (/(назнач|стал|служ|карьер|журнал|должност|чин|повыш|career|appointed|founded)/i.test(normalized)) {
    return 'career';
  }

  return 'other';
}

export function inferDecisionFromSentence(sentence: string) {
  return /(поступил|начал|решил|женил|переех|опублик|издал|основал|вернул|стал|entered|began|decided|married|moved|published|founded|became)/i.test(
    sentence
  );
}

export function inferIconFromSentence(sentence: string, sphere: TimelineSphere): TimelineIconId | undefined {
  if (/родил|born/i.test(sentence)) return 'baby-feet';
  if (/женил|брак|свад/i.test(sentence)) return 'wedding-rings';
  if (/лице|школ|универс|академ|учил|нян|настав/i.test(sentence)) return 'school-backpack';
  if (/опублик|издал|поэм|роман|стих|книг|произвед|написал|сочин/i.test(sentence)) return 'idea-book';
  if (/ссыл|переех|эмигр|travel|moved/i.test(sentence)) return 'passport';
  if (/умер|погиб|дуэл|болез/i.test(sentence)) return 'thermometer';
  if (/друж|переписк|кружок|декабр/i.test(sentence)) return 'friendship';
  if (/ребён|сын|дочь/i.test(sentence)) return 'baby-stroller';
  if (sphere === 'creativity') return 'idea-book';
  if (sphere === 'career') return 'briefcase';
  return undefined;
}

export function buildHeuristicLabel(sentence: string, sphere: TimelineSphere) {
  const workTitle = extractQuotedWorkTitle(sentence);
  const location =
    sentence.match(/\b(?:в|на|из)\s+([А-ЯЁA-Z][^,.();:]{2,50})/u)?.[1]?.trim().replace(/\s+/g, ' ') ?? undefined;
  const spouse = sentence.match(/\bс\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/u)?.[1]?.trim() ?? undefined;
  const institution = sentence.match(/\b((?:Царскосельск[^\s,.;:)]*\s+)?(?:лице[йя]|школ[ауые]|университет[а-я]*|академи[яию]|институт[а-я]*))\b/u)?.[1] ?? undefined;

  if (/родил|born/i.test(sentence)) return 'Рождение';
  if (/дуэл/i.test(sentence) && /умер|погиб|скончал|died/i.test(sentence)) return 'Дуэль и смерть';
  if (/умер|скончал|погиб|died/i.test(sentence)) return 'Смерть';
  if (/женил|брак|свад/i.test(sentence)) return spouse ? `Брак с ${spouse}` : 'Брак';
  if (/родил\S*\s+(?:сын|дочь|ребён)/i.test(sentence)) return 'Рождение ребёнка';
  if (/нян|домашн.*обуч|гуверн|наставник/i.test(sentence)) return 'Домашнее обучение';
  if (/детств|ранн.*чтен|перв.*стих/i.test(sentence)) return 'Формирующее детство';
  if (/лицейск.*друз|дружб|переписк|кружок|общество|арзамас|лампа|декабр|пущин|дельвиг|кюхельбекер|чаадаев/i.test(sentence)) {
    return /декабр/i.test(sentence) ? 'Потери круга декабристов' : 'Лицейский круг';
  }
  if (/под надзор/i.test(sentence)) return 'Полицейский надзор';
  if (/путешеств|поездк|поехал|отправился/i.test(sentence) && location) return `Поездка в ${location}`;
  if (/войн/i.test(sentence) && /отправился|поехал/i.test(sentence)) return 'Поездка на войну';
  if (/сослан|ссыл/i.test(sentence)) return location ? `Ссылка в ${location}` : 'Ссылка';
  if (/переех|эмигр|relocat|moved/i.test(sentence)) return location ? `Переезд в ${location}` : 'Переезд';
  if (/поступ/i.test(sentence) && institution) return `Поступление в ${institution}`;
  if (/(окончил|выпустил|выпуск)/i.test(sentence) && institution) return `Окончание ${institution}`;
  if (/лице|школ|универс|академ|институт|учил/i.test(sentence) && institution) return `Учёба в ${institution}`;
  if (/лице|школ|универс|академ|институт|учил/i.test(sentence)) return 'Учёба';
  if (/вступил в .*общество|арзамас|зел[её]ная лампа/i.test(sentence)) return 'Литературный круг';
  if (/элег|лирик/i.test(sentence)) return 'Литературный поворот';
  if (/предложени/i.test(sentence) && /гончаров/i.test(sentence)) return 'Предложение Наталье Гончаровой';
  if (/ссора/i.test(sentence) && /тёщ/i.test(sentence)) return 'Ссора с тёщей';
  if (workTitle && (sphere === 'career' || sphere === 'creativity')) return `Публикация «${workTitle}»`;
  if (/заверш[а-я]+\s+.*борис[а-яё ]+годунов/i.test(sentence)) return 'Завершение «Бориса Годунова»';
  if (/начал работу/i.test(sentence) && workTitle) return `Начало работы над «${workTitle}»`;
  if (/опублик|издал|поэм|роман|стих|книг|произвед|published/i.test(sentence)) {
    return location ? `Публикация в ${location}` : 'Новая публикация';
  }
  if (/назнач|стал|служ|карьер|became|appointed/i.test(sentence)) return 'Новый карьерный этап';
  if (/долг|обязательств|финанс|денег|money|finance/i.test(sentence)) return 'Финансовое давление';
  if (/арест|тюрьм|prison|arrest/i.test(sentence)) return 'Арест';
  if (/цензур|запрет|censor/i.test(sentence)) return 'Цензурные ограничения';
  if (/наград|орден|award|prize/i.test(sentence)) return 'Награждение';

  const cleaned = normalizeWhitespace(
    sentence
      .replace(/\([^)]*\)/g, '')
      .replace(/^(?:В|С|К|После|До|Около)\s+\d{4}\s+(?:году?|годах|годов),?\s*/u, '')
      .replace(/^\d{1,2}\s+[А-Яа-яЁё]+\s+\d{4}\s+года,?\s*/u, '')
      .replace(/^(?:В этот период|В это время|В том же году|Тогда же),?\s*/u, '')
  );

  if (cleaned.length <= 50) return cleaned;

  const firstClause = cleaned.split(/[,;—–]/, 1)[0]?.trim();
  if (firstClause && firstClause.length >= 5 && firstClause.length <= 50) return firstClause;

  const words = cleaned.split(/\s+/);
  if (words.length > 7) {
    const shortPhrase = words.slice(0, 5).join(' ');
    if (shortPhrase.length <= 50) return shortPhrase;
  }

  return cleaned.length > 50 ? `${cleaned.slice(0, 47).trimEnd()}...` : cleaned;
}

export function isRawSentenceLabel(label: string) {
  if (label.length > 50) return true;
  if (/^\d{1,2}\s+[а-яё]+\s+\d{4}/u.test(label)) return true;
  if (/^(?:В|С|К|После|Весной|Летом|Осенью|Зимой)\s+\d{4}/u.test(label)) return true;
  if (/^[А-ЯЁ][а-яё]+\s+[а-яё]+\s+[а-яё]+\s+[а-яё]+\s+[а-яё]+\s+[а-яё]+\s+[а-яё]+/u.test(label)) return true;
  // Lowercase start = likely a sentence fragment, not a title
  if (/^[а-яё]/u.test(label)) return true;
  // Ends with a preposition/conjunction = truncated sentence
  if (/\s(?:в|на|с|о|к|у|по|из|за|от|до|для|при|про|без|над|под|об|что|как|и|а|но|или|не)\s*$/i.test(label)) return true;
  // Contains pronouns typical of narrative sentences
  if (/\b(?:он|она|его|её|они|их|ему|ей|им)\b/i.test(label)) return true;
  // 8+ words even if short chars — likely a sentence
  if (label.split(/\s+/).length >= 8) return true;
  return false;
}

export function postProcessModelEvent(event: BiographyTimelineEventPlan): BiographyTimelineEventPlan {
  let { label, sphere, iconId } = event;
  const source = event.notes || event.label;

  if (isRawSentenceLabel(label)) {
    const betterLabel = buildHeuristicLabel(source, sphere ?? 'other');
    if (betterLabel && betterLabel.length <= 50) {
      label = betterLabel;
    }
  }

  if (!sphere || sphere === 'other') {
    const inferred = inferSphereFromSentence(source);
    if (inferred !== 'other') {
      sphere = inferred;
    }
  }

  if (!iconId && sphere) {
    iconId = inferIconFromSentence(source, sphere);
  }

  return { ...event, label, sphere, iconId };
}

export function sanitizeTimelineEventPlan(
  event: BiographyTimelineEventPlan,
  fallbackSphere?: TimelineSphere
): BiographyTimelineEventPlan | null {
  if (!Number.isFinite(event.age)) return null;
  const label = normalizeText(event.label, 50);
  if (!label) return null;

  return postProcessModelEvent({
    age: Math.max(0, Math.min(120, Number(event.age))),
    label,
    notes: normalizeText(event.notes, 700),
    sphere: normalizeSphere(event.sphere) ?? fallbackSphere,
    isDecision: Boolean(event.isDecision),
    iconId: normalizeIcon(event.iconId),
  });
}

export function inferChronologicalEventsFromExtract(extract: string, birthYear?: number) {
  const sentences = splitBiographyExtractIntoSentences(extract);
  const events: BiographyTimelineEventPlan[] = [];

  sentences.forEach((sentence) => {
    if (!isLikelyTimelineEventSentence(sentence)) return;

    const years = extractYears(sentence);
    if (years.length === 0) return;

    const year = years[0];
    const age = birthYear ? year - birthYear : 0;
    if (birthYear && (age < 0 || age > 120)) return;

    const sphere = inferSphereFromSentence(sentence);
    const label = buildHeuristicLabel(sentence, sphere);
    const event = sanitizeTimelineEventPlan({
      age,
      label,
      notes: sentence,
      sphere,
      isDecision: inferDecisionFromSentence(sentence),
      iconId: inferIconFromSentence(sentence, sphere),
    });

    if (event) {
      events.push(event);
    }
  });

  const deduped = new Map<string, BiographyTimelineEventPlan>();
  events.forEach((event) => {
    const key = `${event.age}:${event.label}`;
    if (!deduped.has(key)) {
      deduped.set(key, event);
    }
  });

  return [...deduped.values()].sort((a, b) => a.age - b.age);
}

export function selectEventsForLifeCoverage(events: BiographyTimelineEventPlan[], lifespan?: number) {
  if (events.length <= 5) return events;

  const lifespanBonus = lifespan && lifespan > 30 ? Math.floor(lifespan / 5) : 0;
  const baseTarget =
    events.length >= 18 ? 12 : events.length >= 14 ? 10 : events.length >= 10 ? 8 : Math.max(5, events.length);
  const targetCount = Math.min(events.length, Math.max(baseTarget, lifespanBonus));

  if (events.length <= targetCount) return events;

  const selectedIndexes = new Set<number>([0, events.length - 1]);
  const birthIndex = events.findIndex((event) => event.age === 0);
  const terminalIndex = events.findIndex((event) =>
    /(смерт|гибел|погиб|умер|дуэл|died|death|killed)/i.test(`${event.label} ${event.notes ?? ''}`)
  );

  if (birthIndex >= 0) selectedIndexes.add(birthIndex);
  if (terminalIndex >= 0) selectedIndexes.add(terminalIndex);

  while (selectedIndexes.size < targetCount) {
    const progress = selectedIndexes.size / Math.max(targetCount - 1, 1);
    const targetIndex = Math.round(progress * (events.length - 1));
    let offset = 0;

    while (offset < events.length) {
      const left = targetIndex - offset;
      const right = targetIndex + offset;
      if (left >= 0 && !selectedIndexes.has(left)) {
        selectedIndexes.add(left);
        break;
      }
      if (right < events.length && !selectedIndexes.has(right)) {
        selectedIndexes.add(right);
        break;
      }
      offset += 1;
    }
  }

  return [...selectedIndexes]
    .sort((a, b) => a - b)
    .map((index) => events[index])
    .filter(Boolean);
}

function dedupeEvents(events: BiographyTimelineEventPlan[]) {
  const deduped = new Map<string, BiographyTimelineEventPlan>();
  events.forEach((event) => {
    const key = buildEventFactKey(event);
    if (!deduped.has(key)) {
      deduped.set(key, event);
    }
  });
  return [...deduped.values()].sort((a, b) => a.age - b.age);
}

function extractTargetedEvents(
  extract: string,
  birthYear: number | undefined,
  patternGroups: Array<{ pattern: RegExp; sphere: TimelineSphere }>
) {
  const sentences = splitBiographyExtractIntoSentences(extract);
  const events: BiographyTimelineEventPlan[] = [];

  for (const sentence of sentences) {
    const years = extractYears(sentence);
    if (years.length === 0) continue;
    const year = years[0];
    const age = birthYear ? year - birthYear : undefined;
    if (age === undefined || age < 0 || age > 120) continue;

    const matched = patternGroups.find(({ pattern }) => pattern.test(sentence));
    if (!matched) continue;

    const label = buildHeuristicLabel(sentence, matched.sphere);
    const event = sanitizeTimelineEventPlan({
      age,
      label,
      notes: normalizeWhitespace(sentence).slice(0, 300),
      sphere: matched.sphere,
      isDecision: inferDecisionFromSentence(sentence),
      iconId: inferIconFromSentence(sentence, matched.sphere),
    }, matched.sphere);

    if (event) {
      events.push(event);
    }
  }

  return dedupeEvents(events);
}

export function extractFriendshipEventsFromExtract(extract: string, birthYear?: number) {
  return extractTargetedEvents(extract, birthYear, [
    { pattern: /лицейск|друж|друз|переписк|кружок|общество|арзамас|лампа|декабр|пущин|дельвиг|кюхельбекер|чаадаев/i, sphere: 'friends' },
  ]);
}

export function extractChildhoodEventsFromExtract(extract: string, birthYear?: number) {
  return extractTargetedEvents(extract, birthYear, [
    { pattern: /нян|домашн.*обуч|гуверн|воспит|детств|ранн.*чтен|перв.*стих|усадьб|захаров/i, sphere: 'education' },
    { pattern: /семь|родител|дом|детств/i, sphere: 'family' },
  ]).filter((event) => event.age <= 12);
}

export function extractPsychologicallySignificantEvents(extract: string, birthYear?: number): BiographyTimelineEventPlan[] {
  const sentences = splitBiographyExtractIntoSentences(extract);
  const events: BiographyTimelineEventPlan[] = [];

  const psychPatterns: Array<{
    pattern: RegExp;
    labelFn: (sentence: string) => string;
    sphere: TimelineSphere;
  }> = [
    {
      pattern: /(?:смерт|скончал|умер|потеря|потерял)\S*\s+(?:мат|отц|отец|родител|брат|сестр|жен|муж|сын|дочер|друг|няня)/i,
      labelFn: (s) => {
        const who = s.match(/(?:смерт|потер\S+)\s+(\S+(?:\s+\S+)?)/i)?.[1];
        return who ? `Смерть ${who}` : 'Потеря близкого';
      },
      sphere: 'family',
    },
    { pattern: /(?:арест|заключ|тюрьм|каторг|приговор|осужд)/i, labelFn: () => 'Арест', sphere: 'career' },
    {
      pattern: /(?:сослан|ссылк|изгнан|высл)/i,
      labelFn: (s) => {
        const where = s.match(/(?:ссыл\S*|сослан\S*)\s+(?:в|на)\s+([А-ЯЁ]\S+)/u)?.[1];
        return where ? `Ссылка в ${where}` : 'Ссылка';
      },
      sphere: 'place',
    },
    { pattern: /(?:тяжел\S+\s+болезн|серьёзн\S+\s+болезн|заболел|тяжело\s+ранен|ранен\S*\s+на\s+дуэл)/i, labelFn: () => 'Тяжёлая болезнь', sphere: 'health' },
    { pattern: /(?:развод|расстав|разрыв\S*\s+(?:с\s+)?(?:жен|муж|супруг))/i, labelFn: () => 'Разрыв в семье', sphere: 'family' },
    { pattern: /(?:банкрот|разорен|долг\S*\s+(?:привел|вынудил|заставил))/i, labelFn: () => 'Финансовый кризис', sphere: 'finance' },
    { pattern: /(?:дуэл)/i, labelFn: () => 'Дуэль', sphere: 'health' },
    {
      pattern: /(?:родил\S*\s+(?:сын|дочь|ребён|перв\S+\s+ребён))/i,
      labelFn: (s) => {
        const child = s.match(/родил\S*\s+(сын|дочь|ребён\S*)/i)?.[1];
        return child ? `Рождение: ${child}` : 'Рождение ребёнка';
      },
      sphere: 'family',
    },
  ];

  for (const sentence of sentences) {
    const years = extractYears(sentence);
    if (years.length === 0) continue;
    const year = years[0];
    const age = birthYear ? year - birthYear : undefined;
    if (age !== undefined && (age < 0 || age > 120)) continue;

    for (const { pattern, labelFn, sphere } of psychPatterns) {
      if (!pattern.test(sentence)) continue;
      const event = sanitizeTimelineEventPlan({
        age: age ?? 0,
        label: labelFn(sentence),
        notes: normalizeWhitespace(sentence).slice(0, 300),
        sphere,
        isDecision: false,
        iconId: inferIconFromSentence(sentence, sphere),
      });
      if (event && age !== undefined) {
        events.push(event);
      }
      break;
    }
  }

  return dedupeEvents(events);
}

export function buildHeuristicBiographyFacts(extract: string, articleTitle: string): BiographyTimelineFact[] {
  const { birthYear } = inferBirthDetailsFromExtract(extract);
  const events = dedupeEvents([
    ...inferChronologicalEventsFromExtract(extract, birthYear),
    ...extractChildhoodEventsFromExtract(extract, birthYear),
    ...extractFriendshipEventsFromExtract(extract, birthYear),
  ]);

  return events.map((event) => {
    const normalizedText = `${event.label} ${event.notes ?? ''}`.toLowerCase();
    const category =
      event.age === 0
        ? 'birth'
        : /(смерт|гибел|погиб|умер|дуэл)/i.test(normalizedText)
          ? 'death'
          : /(поступ|учёб|лицей|универс|школ|домашнее обучение|няня|настав)/i.test(normalizedText)
            ? 'education'
            : /(друж|перепис|кружок|декабр|лицейский круг)/i.test(normalizedText)
              ? 'friends'
              : /(переезд|ссыл|одесс|кишин|петербург|болдин|москв|крым|кавказ|захаров|усадьб)/i.test(normalizedText)
                ? 'move'
                : /(брак|женить|венч|дочь|сын|семь)/i.test(normalizedText)
                  ? 'family'
                  : /(публик|поэм|роман|повест|трагед|журнал|произвед)/i.test(normalizedText)
                    ? 'publication'
                    : event.sphere ?? 'other';

    return {
      year: birthYear ? birthYear + Math.round(event.age) : undefined,
      age: event.age,
      sphere: event.sphere,
      category,
      labelHint: event.label,
      details: event.notes || event.label,
      importance:
        event.age === 0 || /(смерт|гибел|умер|дуэл|брак|поступ|публик|лицейск|друж|детств)/i.test(normalizedText)
          ? 'high'
          : 'medium',
    };
  });
}

export function summarizeBiographyFacts(facts: BiographyTimelineFact[], articleTitle: string) {
  const subjectName = inferSubjectName(articleTitle);
  const birthYear = facts.find((fact) => fact.category === 'birth')?.year;
  const deathYear = facts.find((fact) => fact.category === 'death')?.year;
  const headerLines = [
    `SUBJECT\t${subjectName}`,
    `BIRTH_YEAR\t${birthYear ?? 'unknown'}`,
    `DEATH_YEAR\t${deathYear ?? 'unknown'}`,
  ];

  const factLines = facts.map((fact) =>
    [
      'FACT',
      fact.year ?? 'unknown',
      Number.isFinite(fact.age) ? fact.age : 'unknown',
      fact.category,
      fact.sphere ?? 'other',
      fact.importance,
      fact.labelHint,
      fact.details.replace(/\t+/g, ' ').trim(),
    ].join('\t')
  );

  return [...headerLines, ...factLines].join('\n');
}

export function buildHeuristicBiographyPlan(params: {
  articleTitle: string;
  extract: string;
  fallbackCurrentAge: number;
}): BiographyTimelinePlan {
  const subjectName = inferSubjectName(params.articleTitle);
  const canvasName = inferCanvasName(subjectName);
  const { birthYear, birthDetails } = inferBirthDetailsFromExtract(params.extract);
  const deathYear = inferDeathYearFromExtract(params.extract);
  const inferredCurrentAge =
    birthYear && deathYear
      ? Math.max(0, Math.min(120, deathYear - birthYear))
      : birthYear
        ? Math.max(0, Math.min(120, new Date().getFullYear() - birthYear))
        : params.fallbackCurrentAge;

  const extractedEvents = dedupeEvents([
    ...inferChronologicalEventsFromExtract(params.extract, birthYear),
    ...extractChildhoodEventsFromExtract(params.extract, birthYear),
    ...extractFriendshipEventsFromExtract(params.extract, birthYear),
  ]);
  const mainEvents = selectEventsForLifeCoverage(extractedEvents, inferredCurrentAge);
  const usedKeys = new Set(mainEvents.map((event) => buildEventFactKey(event)));
  const branchCandidates = extractedEvents.filter((event) => !usedKeys.has(buildEventFactKey(event)));
  const branchSourceEvents =
    branchCandidates.length > 0
      ? branchCandidates
      : mainEvents.filter((event) => event.age > 0 && (event.sphere ?? 'other') !== 'other');

  const branches = Object.entries(
    branchSourceEvents.reduce<Record<string, BiographyTimelineEventPlan[]>>((acc, event) => {
      const sphere = event.sphere ?? 'other';
      if (sphere === 'other') return acc;
      acc[sphere] ??= [];
      acc[sphere].push(event);
      return acc;
    }, {})
  )
    .map(([sphere, events]) => {
      const firstAge = events[0]?.age ?? 0;
      const sourceMainEventIndex = Math.max(
        0,
        mainEvents.findIndex((event, index) => {
          const nextAge = mainEvents[index + 1]?.age ?? Number.POSITIVE_INFINITY;
          return event.age <= firstAge && nextAge > firstAge;
        })
      );

      return {
        label: SPHERE_META[sphere as TimelineSphere]?.label ?? sphere,
        sphere: sphere as TimelineSphere,
        sourceMainEventIndex,
        events: selectEventsForLifeCoverage(events).slice(0, 5),
      };
    })
    .filter((branch) => branch.events.length >= 1)
    .slice(0, 4);

  if (birthYear && !mainEvents.some((event) => event.age === 0)) {
    mainEvents.unshift({
      age: 0,
      label: 'Рождение',
      notes: birthDetails.place ? `Родился(ась) в ${birthDetails.place}.` : 'Рождение',
      sphere: 'family',
      isDecision: false,
      iconId: 'baby-feet',
    });
  }

  if (birthYear && deathYear && !hasTerminalLifeEvent(mainEvents, inferredCurrentAge)) {
    const deathSentence = splitBiographyExtractIntoSentences(params.extract).find((sentence) =>
      /умер|скончал|погиб|смерт|дуэл|died|killed|death/i.test(sentence)
    );
    mainEvents.push({
      age: inferredCurrentAge,
      label: /дуэл/i.test(deathSentence || '') ? 'Дуэль и смерть' : 'Смерть',
      notes: deathSentence ? normalizeWhitespace(deathSentence) : 'Завершение жизненного пути.',
      sphere: 'health',
      isDecision: false,
      iconId: 'thermometer',
    });
  }

  mainEvents.sort((a, b) => a.age - b.age);

  return {
    subjectName,
    canvasName,
    currentAge: inferredCurrentAge,
    selectedPeriodization: 'erikson',
    birthDetails,
    mainEvents,
    branches,
  };
}

export {
  DEFAULT_BRANCH_LENGTH,
  LINE_X_POSITION,
  TIMELINE_PERIODIZATION_IDS,
};
