import {
  BRANCH_SLOT_ORDER,
  BRANCH_X_OFFSETS,
  DEFAULT_BRANCH_LENGTH,
  EVENT_ICON_IDS,
  SPHERE_META,
  TIMELINE_PERIODIZATION_IDS,
  LINE_X_POSITION,
  type BiographyTimelineEventPlan,
  type OccupiedBranchLane,
  type TimelineIconId,
  type TimelineSphere,
} from './timelineBiographyTypes.js';
import { isGenericBiographyLabel, isTruncatedBiographyLabel } from './timelineBiographyLabelQuality.js';

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

export function pickBranchX(sphere: TimelineSphere, startAge: number, endAge: number, occupied: OccupiedBranchLane[]) {
  const slotOrder = BRANCH_SLOT_ORDER[sphere] || BRANCH_SLOT_ORDER.other;
  for (const slotIndex of slotOrder) {
    const x = LINE_X_POSITION + BRANCH_X_OFFSETS[slotIndex];
    const collides = occupied.some((lane) => lane.x === x && !(lane.endAge + 1 < startAge || endAge + 1 < lane.startAge));
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
  const title = value.match(/[«"](.*?)[»"]/u)?.[1]?.trim();
  if (!title) return undefined;
  if (!/^[A-ZА-ЯЁ0-9]/u.test(title)) return undefined;
  return title;
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

// ---------------------------------------------------------------------------
// Internal helpers used by inferBirthDetailsFromExtract / buildHeuristicLabel
// ---------------------------------------------------------------------------

function extractYears(sentence: string) {
  return [...sentence.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g)]
    .map((match) => Number(match[1]))
    .filter((year) => year >= 1000 && year <= 2099)
    .filter((year, index, self) => self.indexOf(year) === index);
}

function normalizeLocationCandidate(value: string | undefined) {
  if (!value) return undefined;
  const cleaned = normalizeWhitespace(value.replace(/[«»"()]/g, '').trim());
  if (cleaned.length < 3 || cleaned.length > 80) return undefined;
  if (/^\d+$/.test(cleaned)) return undefined;
  return cleaned;
}

function isLikelyBirthPlace(value: string | undefined) {
  if (!value) return false;
  if (/^\d{3,4}\b/.test(value)) return false;
  if (/^(?:в|от|с|на|из|к|по|для|до|при|про|об|пр|was|is|born|died|he|she)\s/i.test(value)) return false;
  if (value.length < 3 || value.length > 80) return false;
  return true;
}

function isRegistryMetadataSentence(sentence: string) {
  return /^(?:дата|место)\s+(?:рождения|смерти)/i.test(sentence);
}

function extractInstitutionLabel(sentence: string) {
  return sentence.match(/(?:лицей|гимназ|школ|универс|академ|институт|ВМА|МГУ|семинари|училищ)[а-яёА-ЯЁ\s-]{0,40}/ui)?.[0]?.trim() ?? '';
}

function isPosthumousContextSentence(sentence: string) {
  return /посмертн|после смерти|наследи|увековеч|мемориал|памятник|музей(?:-квартир)?|назван(?:\s+)?(?:в честь|его имен)/i.test(sentence);
}

function extractLossRelationFromSentence(sentence: string) {
  return sentence.match(/(?:смерть|гибель|потеря|умер(?:ла)?|скончал(?:ся|ась)?|погиб(?:ла)?)\s+([а-яёА-ЯЁ]+(?:\s+[а-яёА-ЯЁ]+){0,2})/iu)?.[1]?.trim();
}

function extractDeathPersonFromSentence(sentence: string) {
  const patterns = [
    /(?:умер|скончал|погиб|died|killed)\S*\s+(?:его|её|их)\s+(?:друг|соратник|коллега|покровитель|ментор|учитель|наставник)\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/iu,
    /(?:умер|скончал|погиб|died)\S*\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/iu,
    /([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})\s+(?:умер|скончал|погиб|died|killed)/iu,
  ];
  for (const pattern of patterns) {
    const match = sentence.match(pattern);
    if (match?.[1] && match[1].length >= 3 && match[1].length <= 50) return match[1];
  }
  return undefined;
}

function isMediaContextSentence(sentence: string) {
  return /(?:фильм|сериал|спектакл|роль|актёр|актриса|телефильм|документальн|пьес|мюзикл)/i.test(sentence) &&
    !/(?:написал|опубликов|создал|сочинил|закончил|начал работу)/i.test(sentence);
}

function isSubjectAuthorshipSentence(sentence: string) {
  return /(?:написал|сочинил|опубликов|закончил|начал работу|работал над|создал)/i.test(sentence);
}

function extractPublicationOutletTitle(sentence: string) {
  const match = sentence.match(/(?:газет[аеыу]|журнал[аеу]?|альманах[аеу]?)\s+[«"]([^»"]+)[»"]/u);
  return match?.[1]?.trim() || undefined;
}

function normalizeLossRelationLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.startsWith('мат')) return 'матери';
  if (normalized.startsWith('от')) return 'отца';
  if (normalized.startsWith('жен')) return 'жены';
  if (normalized.startsWith('муж')) return 'мужа';
  if (normalized.startsWith('сын')) return 'сына';
  if (normalized.startsWith('дочер')) return 'дочери';
  if (normalized.startsWith('брат')) return 'брата';
  if (normalized.startsWith('сестр')) return 'сестры';
  if (normalized.startsWith('друг')) return 'друга';
  if (normalized.startsWith('нян')) return 'няни';
  if (normalized.startsWith('опекун')) return 'опекуна';
  return normalized;
}

// ---------------------------------------------------------------------------
// Birth / death inference from Wikipedia extract
// ---------------------------------------------------------------------------

export function inferBirthDetailsFromExtract(extract: string) {
  const extractHead = extract.slice(0, 600);
  const sentences = splitBiographyExtractIntoSentences(extract);
  const birthSentence = sentences.find((sentence) => /родил|born/i.test(sentence)) ?? sentences[0] ?? '';
  const years = extractYears(birthSentence);
  const leadDateRangeMatch = extractHead.match(
    /(\d{1,2}\s+[A-Za-zА-Яа-яЁё]+\s+\d{4})\s*,\s*([^—()]+?)\s*[—-]\s*(\d{1,2}\s+[A-Za-zА-Яа-яЁё]+\s+\d{4})/u
  );
  const leadBirthDate = leadDateRangeMatch?.[1];
  const leadBirthPlace = normalizeLocationCandidate(leadDateRangeMatch?.[2]);
  const leadYears = extractYears(extractHead);
  const birthYear = leadBirthDate
    ? extractYears(leadBirthDate)[0]
    : years[0] ?? leadYears[0];

  const bracketDateMatch = birthSentence.match(/\[(\d{1,2}\s+[A-Za-zА-Яа-яЁё]+)\]\s*(\d{4})/);
  const standardDateMatch = birthSentence.match(/(\d{1,2}\s+[A-Za-zА-Яа-яЁё]+\s+\d{4})/);
  const yearOnlyMatch = birthYear ? String(birthYear) : undefined;

  const dateStr = leadBirthDate
    ? normalizeWhitespace(leadBirthDate)
    : bracketDateMatch
      ? `${bracketDateMatch[1]} ${bracketDateMatch[2]}`
      : standardDateMatch?.[1] ?? yearOnlyMatch;

  const placeMatch =
    birthSentence.match(/родил[а-яёa-z]*\s+(?:в|in)\s+([^,.();]+?)(?:\s+(?:в|in)\s+\d{4}\b|[,.();]|$)/i) ??
    birthSentence.match(/\(\s*[^,]+,\s*([^—,)]+?)(?:\s*[—,)])/);
  const normalizedPlace = normalizeLocationCandidate(placeMatch?.[1]);
  const place =
    (leadBirthPlace && isLikelyBirthPlace(leadBirthPlace) ? leadBirthPlace : undefined) ??
    (normalizedPlace && isLikelyBirthPlace(normalizedPlace) ? normalizedPlace : undefined);

  return {
    birthYear,
    birthDetails: {
      date: dateStr ? normalizeWhitespace(dateStr) : undefined,
      place: place && !/^\d{3,4}\b/.test(place) ? place : undefined,
    },
  };
}

export function inferDeathYearFromExtract(extract: string) {
  const extractHead = extract.slice(0, 600);
  const leadSentence = splitBiographyExtractIntoSentences(extractHead)[0] ?? '';
  const leadDateRangeMatch = extractHead.match(
    /(\d{1,2}\s+[A-Za-zА-Яа-яЁё]+\s+\d{4})\s*,\s*[^—()]+?\s*[—-]\s*(\d{1,2}\s+[A-Za-zА-Яа-яЁё]+\s+\d{4})/u
  );
  if (leadDateRangeMatch) {
    return extractYears(leadDateRangeMatch[2])[0];
  }

  const leadSentenceYears = extractYears(leadSentence);
  if (leadSentenceYears.length >= 2 && /[—-]|\(\s*\d{4}\s*[—-]\s*\d{4}\s*\)/u.test(leadSentence)) {
    return leadSentenceYears.at(1);
  }

  const sentences = splitBiographyExtractIntoSentences(extract);
  const articleLeadSentence = sentences[0] ?? '';
  const leadYears = extractYears(articleLeadSentence);
  if (leadYears.length >= 2 && /[—-]|\(\s*\d{4}\s*[—-]\s*\d{4}\s*\)/u.test(articleLeadSentence)) {
    return leadYears.at(1);
  }

  const deathSentence = sentences.find((sentence) => {
    if (!/умер|скончал|погиб|смерт|дуэл|died|killed|death/i.test(sentence)) {
      return false;
    }

    if (
      /(отца|отец|матери|мать|родителей|родителя|мужа|муж|жены|жена|сына|сын|дочери|дочь|сестры|сестра|брата|брат|друга|друг|опекун)/i.test(
        sentence
      ) &&
      !/(елизавет|королев[аы]|её величеств|ее величеств)/i.test(sentence)
    ) {
      return false;
    }

    return true;
  });
  if (deathSentence) {
    const years = extractYears(deathSentence);
    return years.at(-1);
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Icon / sphere inference and label building
// ---------------------------------------------------------------------------

export function inferIconFromSentence(sentence: string, sphere: TimelineSphere): TimelineIconId | undefined {
  if (isRegistryMetadataSentence(sentence)) return 'baby-feet';
  if (/родил|born/i.test(sentence)) return 'baby-feet';
  if (/женил|брак|свад/i.test(sentence)) return 'wedding-rings';
  if (/лице|школ|универс|академ|учил|нян|настав/i.test(sentence)) return 'school-backpack';
  if (/опублик|издал|поэм|роман|стих|книг|произвед|написал|сочин/i.test(sentence)) return 'idea-book';
  if (/ссыл|переех|эмигр|travel|moved/i.test(sentence)) return 'passport';
  if (/умер|погиб|дуэл|болез/i.test(sentence)) return 'thermometer';
  if (/друж|переписк|кружок|декабрист/i.test(sentence)) return 'friendship';
  if (/ребён|сын|дочь/i.test(sentence)) return 'baby-stroller';
  if (sphere === 'creativity') return 'idea-book';
  if (sphere === 'career') return 'briefcase';
  return undefined;
}

export function inferSphereFromSentence(sentence: string): TimelineSphere {
  if (/родил[а-яё]?\b|рожден/i.test(sentence) && sentence.length < 80) return 'family';
  if (/свад|женил|брак|брач|замуж|обручен/i.test(sentence)) return 'family';
  if (/ребён|сын|дочь|внук|внучк/i.test(sentence)) return 'family';
  if (/школ|университ|лицей|семинар|обучен|учил|курс|академ.*(?:поступ|учил|оконч)|диплом|диссертац|студен/i.test(sentence)) return 'education';
  if (/опублик|поэм|роман|стих|книг|произвед|повесть|пьес|журнал|газет|издан|написал|сочин|поэзи|литератур/i.test(sentence)) return 'creativity';
  if (/переех|ссыл|эмигр|поездк|travel|move|прибыл|отправ|уехал|вернул(?:ся|ась)/i.test(sentence)) return 'place';
  if (/болез|здоров|лечен|ранен|операц|clinic|hospital|травм/i.test(sentence)) return 'health';
  if (/умер|скончал|погиб|смерт|похорон|гибел|died|death/i.test(sentence)) return 'health';
  if (/друг|друж|переписк|знакомств|встреч/i.test(sentence)) return 'friends';
  if (/арест|тюрьм|ссыл|заключ|конфликт|суд|дуэл|дисципл/i.test(sentence)) return 'health';
  if (/назначен|служб|карьер|начальник|директор|глав|министр|чиновник|секретар|должнос/i.test(sentence)) return 'career';
  if (/наград|орден|медал|звани|прем|лауреат|почётн|academ|fellow|member/i.test(sentence)) return 'career';
  return 'other';
}

export function buildHeuristicLabel(sentence: string, sphere: TimelineSphere) {
  const workTitle = extractQuotedWorkTitle(sentence);
  const outletTitle = extractPublicationOutletTitle(sentence);
  const location = normalizeLocationCandidate(
    sentence.match(/\b(?:в|на|из)\s+([А-ЯЁA-Z][^,.();:]{2,50})/u)?.[1]?.trim().replace(/\s+/g, ' ') ?? undefined
  );
  const spouse = sentence.match(/\bс\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/u)?.[1]?.trim() ?? undefined;
  const institution = extractInstitutionLabel(sentence) || undefined;
  const lossRelation = extractLossRelationFromSentence(sentence);
  const deathPerson = extractDeathPersonFromSentence(sentence);

  if (isRegistryMetadataSentence(sentence)) return 'Рождение';
  if (/родил|born/i.test(sentence)) return 'Рождение';
  if (/дуэл/i.test(sentence) && /умер|погиб|скончал|died/i.test(sentence)) return 'Дуэль и смерть';
  if (/умер|скончал|погиб|died/i.test(sentence) && lossRelation) {
    return `Смерть ${normalizeLossRelationLabel(lossRelation)}`;
  }
  if (/умер|скончал|погиб|died/i.test(sentence) && deathPerson) {
    return `Смерть ${deathPerson}`;
  }
  if (/умер|скончал|погиб|died/i.test(sentence)) return 'Смерть';
  if (/женил|брак|свад/i.test(sentence)) return spouse ? `Брак с ${spouse}` : 'Брак';
  if (/родил\S*\s+(?:сын|дочь|ребён)/i.test(sentence)) return 'Рождение ребёнка';
  if (/нян|домашн.*обуч|гуверн|наставник/i.test(sentence)) return 'Домашнее обучение';
  if (/перв.*стих/i.test(sentence)) return 'Первые стихи';
  if (/ранн.*чтен|много читал|библиотек/i.test(sentence)) return 'Раннее увлечение чтением';
  if (/(детств|летние месяцы|усадьб|у бабушк|у дедушк)/i.test(sentence) && location) return `Детство в ${location}`;
  if (/под надзор/i.test(sentence)) return 'Полицейский надзор';
  if (/путешеств|поездк|поехал|отправился/i.test(sentence) && location) return `Поездка в ${location}`;
  if (/вернул(?:ся|ась|ись)?\s+из\s+ссыл/i.test(sentence)) return 'Возвращение из ссылки';
  if (/южн/i.test(sentence) && /ссыл/i.test(sentence)) return 'Южная ссылка';
  if (/сослан|ссыл/i.test(sentence)) return location ? `Ссылка в ${location}` : 'Ссылка';
  if (/переех|эмигр|relocat|moved/i.test(sentence)) return location ? `Переезд в ${location}` : 'Переезд';
  if (/поступ/i.test(sentence) && institution && sphere === 'education') return `Поступление в ${institution}`;
  if (/(окончил|выпустил|выпуск)/i.test(sentence) && institution) return `Окончание ${institution}`;
  if (/лице|школ|универс|академ|институт|учил/i.test(sentence) && institution && sphere === 'education') {
    return `Учёба в ${institution}`;
  }
  if (/лицей/i.test(sentence) && sphere === 'education') return 'Лицейские годы';
  if (/университет|академ|институт/i.test(sentence) && sphere === 'education') return 'Студенческие годы';
  if (/школ/i.test(sentence) && sphere === 'education') return 'Школьные годы';
  if (/вступил в .*общество/i.test(sentence)) return 'Литературный круг';
  if (outletTitle && /газет|журнал/i.test(sentence)) return `Материал в «${outletTitle}»`;
  if (workTitle && isMediaContextSentence(sentence) && !isSubjectAuthorshipSentence(sentence)) {
    return `Упоминание «${workTitle}»`;
  }
  if (workTitle && (sphere === 'career' || sphere === 'creativity')) return `Публикация «${workTitle}»`;
  if (/начал работу/i.test(sentence) && workTitle) return `Начало работы над «${workTitle}»`;
  if (/опублик|издал|поэм|роман|стих|книг|произведени|published/i.test(sentence)) {
    if (/впервые|дебют|получил известность|выступил/i.test(sentence)) return 'Первое литературное признание';
    if (location) return `Публикация в ${location}`;
  }
  if (/поступил на службу|начал службу/i.test(sentence)) return 'Начало службы';
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

  if (cleaned.length <= 50 && !isGenericBiographyLabel(cleaned) && !isTruncatedBiographyLabel(cleaned)) {
    return cleaned;
  }

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
  if (isGenericBiographyLabel(label) || isTruncatedBiographyLabel(label)) return true;
  if (label.length > 50) return true;
  if (/^\d{1,2}\s+[а-яё]+\s+\d{4}/u.test(label)) return true;
  if (/^(?:В|С|К|После|Весной|Летом|Осенью|Зимой)\s+\d{4}/u.test(label)) return true;
  if (/^(?:С|В)\s+\d{1,2}\s+[а-яё]+\s+\d{4}/u.test(label)) return true;
  if (/^(?:Однако|Таким образом|В своей|В своём|После знакомства|Из-за|из-за|Тогда|Но|При этом)\b/u.test(label)) return true;
  if (/^(?:В|С|После|Из-за|Тогда|Но)\s+[а-яё]/u.test(label) && label.split(/\s+/).length >= 4) return true;
  if (/^(?:один|два|три|четыре|пять|шесть|семь|восемь|девять|десять|несколько|многие)\b/iu.test(label)) return true;
  if (/^[А-ЯЁ][а-яё]+\s+[а-яё]+\s+[а-яё]+\s+[а-яё]+\s+[а-яё]+\s+[а-яё]+\s+[а-яё]+/u.test(label)) return true;
  if (/^[а-яё]/u.test(label)) return true;
  if (/\s(?:в|на|с|о|к|у|по|из|за|от|до|для|при|про|без|над|под|об|что|как|и|а|но|или|не)\s*$/i.test(label)) return true;
  if (/\b(?:он|она|его|её|они|их|ему|ей|им)\b/i.test(label)) return true;
  if (label.split(/\s+/).length >= 8) return true;
  return false;
}

function postProcessModelEvent(event: BiographyTimelineEventPlan): BiographyTimelineEventPlan {
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

export {
  DEFAULT_BRANCH_LENGTH,
  LINE_X_POSITION,
  TIMELINE_PERIODIZATION_IDS,
};
