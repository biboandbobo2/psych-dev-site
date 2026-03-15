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

function isRegistryMetadataSentence(sentence: string) {
  return /метрическ.*книг|в числе прочих|приходится такая запись|запис[ья][^.!?]{0,40}(?:церкв|книг)/i.test(sentence);
}

function normalizeLocationCandidate(value: string | undefined) {
  if (!value) return undefined;
  const normalized = normalizeWhitespace(value);
  if (normalized.length < 3) return undefined;
  if (/\b[А-ЯЁA-Z]\.?$/u.test(normalized)) return undefined;
  if (/\b[А-ЯЁA-Z]\.\s*[А-ЯЁA-Z]?\.?/u.test(normalized)) return undefined;
  return normalized;
}

function isLikelyBirthPlace(value: string | undefined) {
  if (!value) return false;
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized) return false;
  if (/^(?:семье|браке|отношениях|плену|изгнании|ссылке|поездке|возрасте)\b/i.test(normalized)) return false;
  if (/^(?:семье|герцога|герцогини|короля|королевы)\b/i.test(normalized)) return false;
  return true;
}

function extractInstitutionLabel(sentence: string) {
  const match = sentence.match(
    /\b((?:(?:[А-ЯЁA-Zа-яёa-z-]+)\s+){0,4}(?:лице[яйе]|школ[ауые]|университет[а-я]*|академи[яию]|институт[а-я]*))\b/u
  );
  return normalizeWhitespace(match?.[1] ?? '');
}

function isPosthumousContextSentence(sentence: string) {
  return /похорон|похороны|могил|гроб|покойн|посмерт|на его могиле|на её могиле/i.test(sentence);
}

function extractLossRelationFromSentence(sentence: string) {
  return sentence.match(/(матери|мать|отца|отец|родителей|родителя|жены|жена|мужа|муж|няни|няня|сына|сын|дочери|дочь|друга|друг|опекун[а-я]*)/i)?.[1];
}

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

export function isLikelyTimelineEventSentence(sentence: string) {
  const normalized = sentence.toLowerCase();
  const hasYear = extractYears(sentence).length > 0;
  const hasAction = /(родил|born|поступ|окончил|учил|образован|опублик|издал|написал|создал|стал|назнач|служ|ссыл|переех|вернул|женил|брак|родил[а-яё]* сына|родил[а-яё]* дочь|умер|погиб|скончал|болез|дуэл|друж|перепис|кружок|декабрист|нян|воспит|детств|усадьб|перв.*стих|дома|died|moved|married|published|appointed|founded|returned|exile|friend|circle|correspond|childhood|nurse|estate)/i.test(
    sentence
  );
  const looksLikeLead =
    hasYear &&
    /—/.test(sentence) &&
    /(поэт|писател|драматург|автор|historian|poet|writer|novelist|composer|artist)/i.test(normalized) &&
    !hasAction;

  if (!hasYear) return false;
  if (isRegistryMetadataSentence(sentence)) return false;
  if (looksLikeLead) return false;
  if (!hasAction && sentence.length > 180) return false;

  return true;
}

export function inferSphereFromSentence(sentence: string): TimelineSphere {
  const normalized = sentence.toLowerCase();

  if (isRegistryMetadataSentence(sentence)) {
    return 'family';
  }
  if (
    /(наследниц[аы]\s+престола|взошл[аи]\s+на\s+престол|коронац|тайного совета|премьер-минис|содружеств|конгресс|парламент|юбиле|монарх|королев[аы]\s+великобритании|главой государства)/i.test(
      normalized
    )
  ) {
    return 'career';
  }
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
  if (/(друж|друз|переписк|кружок|общество|арзамас|лампа|декабрист|лицейск|пущин|дельвиг|кюхельбекер|чаадаев|friend|circle|acquaint|correspond)/i.test(normalized)) {
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

export function buildHeuristicLabel(sentence: string, sphere: TimelineSphere) {
  const workTitle = extractQuotedWorkTitle(sentence);
  const location = normalizeLocationCandidate(
    sentence.match(/\b(?:в|на|из)\s+([А-ЯЁA-Z][^,.();:]{2,50})/u)?.[1]?.trim().replace(/\s+/g, ' ') ?? undefined
  );
  const spouse = sentence.match(/\bс\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/u)?.[1]?.trim() ?? undefined;
  const institution = extractInstitutionLabel(sentence) || undefined;
  const lossRelation = extractLossRelationFromSentence(sentence);
  const deathPerson = sentence.match(
    /(?:умерла|умер|скончал(?:ась|ся)?|погиб(?:ла)?)[^.!?]{0,20}\s+([А-ЯЁ][а-яё-]+(?:-[А-ЯЁ][а-яё-]+)?(?:\s+[А-ЯЁ][а-яё-]+){0,2})/u
  )?.[1]?.trim();

  if (isRegistryMetadataSentence(sentence)) return 'Рождение';
  if (/родил|born/i.test(sentence)) return 'Рождение';
  if (/наследниц[аы]\s+престола/i.test(sentence)) return 'Наследница престола';
  if (/взошл[аи]\s+на\s+престол/i.test(sentence)) return 'Восшествие на престол';
  if (/тайного совета/i.test(sentence)) return 'Присяга Тайного совета';
  if (/коронаци/i.test(sentence) && /телевидени/i.test(sentence)) return 'Телевизионная коронация';
  if (/коронаци/i.test(sentence)) return 'Коронация';
  if (/рождеств/i.test(sentence) && /телевидени/i.test(sentence)) return 'Первое рождественское обращение по ТВ';
  if (/серебрян.*юбиле/i.test(sentence)) return 'Серебряный юбилей';
  if (/золот.*юбиле/i.test(sentence)) return 'Золотой юбилей';
  if (/бриллиантов|алмазн.*юбиле/i.test(sentence)) return 'Бриллиантовый юбилей';
  if (/платинов.*юбиле/i.test(sentence)) return 'Платиновый юбилей';
  if (/платинов.*свад/i.test(sentence)) return 'Платиновая свадьба';
  if (/гарольд макмиллан/i.test(sentence) && /иден/i.test(sentence)) return 'Назначение Гарольда Макмиллана';
  if (/дуглас-хьюм/i.test(sentence)) return 'Назначение Александра Дуглас-Хьюма';
  if (/гарольда вильсона/i.test(sentence) && /премьер/i.test(sentence)) return 'Назначение Гарольда Вильсона';
  if (/лиз трасс/i.test(sentence)) return 'Назначение Лиз Трасс';
  if (/барбадос/i.test(sentence) && /республик/i.test(sentence)) return 'Барбадос становится республикой';
  if (/covid-19|коронавирус/i.test(sentence)) return 'COVID-19';
  if (/виндзорский замок своей постоянной резиденцией/i.test(sentence)) return 'Переезд в Виндзор';
  if (/вестминстерском аббатстве/i.test(sentence) && /похорон/i.test(sentence)) return 'Государственные похороны';
  if (/балморал/i.test(sentence) && /умерла|смерть/i.test(sentence)) return 'Смерть в Балморале';
  if (/(?:едва не|чуть не)\s+погиб/i.test(sentence)) {
    return /охот/i.test(sentence) ? 'Опасная охота' : 'Опасный эпизод';
  }
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
  if (/лицейск.*друз|дружб|переписк|кружок|общество|арзамас|лампа|декабрист|пущин|дельвиг|кюхельбекер|чаадаев/i.test(sentence)) {
    return /декабрист/i.test(sentence) ? 'Потери круга декабристов' : 'Лицейский круг';
  }
  if (/под надзор/i.test(sentence)) return 'Полицейский надзор';
  if (/путешеств|поездк|поехал|отправился/i.test(sentence) && location) return `Поездка в ${location}`;
  if (/государственн.*визит/i.test(sentence) && location) return `Государственный визит в ${location}`;
  if (/войн/i.test(sentence) && /отправился|поехал/i.test(sentence)) return 'Поездка на войну';
  if (/вернул(?:ся|ась|ись)?\s+из\s+ссыл/i.test(sentence)) return 'Возвращение из ссылки';
  if (/южн/i.test(sentence) && /ссыл/i.test(sentence)) return 'Южная ссылка';
  if (/сослан|ссыл/i.test(sentence)) return location ? `Ссылка в ${location}` : 'Ссылка';
  if (/переех|эмигр|relocat|moved/i.test(sentence)) return location ? `Переезд в ${location}` : 'Переезд';
  if (/поступ/i.test(sentence) && institution && sphere === 'education') return `Поступление в ${institution}`;
  if (/(окончил|выпустил|выпуск)/i.test(sentence) && institution) return `Окончание ${institution}`;
  if (/лице|школ|универс|академ|институт|учил/i.test(sentence) && institution && sphere === 'education') {
    return `Учёба в ${institution}`;
  }
  if (/лицей/i.test(sentence)) return 'Лицейские годы';
  if (/университет|академ|институт/i.test(sentence)) return 'Студенческие годы';
  if (/школ/i.test(sentence)) return 'Школьные годы';
  if (/вступил в .*общество|арзамас|зел[её]ная лампа/i.test(sentence)) return 'Литературный круг';
  if (/элег|лирик/i.test(sentence)) return 'Литературный поворот';
  if (/предложени/i.test(sentence) && /гончаров/i.test(sentence)) return 'Предложение Наталье Гончаровой';
  if (/ссора/i.test(sentence) && /тёщ/i.test(sentence)) return 'Ссора с тёщей';
  if (/сотрудничеств/i.test(sentence) && /журнал/i.test(sentence) && workTitle) return `Сотрудничество с «${workTitle}»`;
  if (/издава(?:л|ть)/i.test(sentence) && /журнал/i.test(sentence) && workTitle) return `Журнал «${workTitle}»`;
  if (/отлуч/i.test(sentence) && /церк|рпц/i.test(sentence)) return 'Отлучение от церкви';
  if (/записал/i.test(sentence) && /дневник/i.test(sentence) && /за два года до смерти/i.test(sentence)) return 'Поздний дневник';
  if (workTitle && (sphere === 'career' || sphere === 'creativity')) return `Публикация «${workTitle}»`;
  if (/заверш[а-я]+\s+.*борис[а-яё ]+годунов/i.test(sentence)) return 'Завершение «Бориса Годунова»';
  if (/начал работу/i.test(sentence) && workTitle) return `Начало работы над «${workTitle}»`;
  if (/опублик|издал|поэм|роман|стих|книг|произвед|published/i.test(sentence)) {
    if (/впервые|дебют|получил известность|выступил/i.test(sentence)) return 'Первое литературное признание';
    if (location) return `Публикация в ${location}`;
  }
  if (/поступил на службу|начал службу/i.test(sentence)) return 'Начало службы';
  if (/назнач|стал|служ|карьер|became|appointed/i.test(sentence) && /редактор|секретар|чиновник|служб/i.test(sentence)) {
    return 'Новый этап службы';
  }
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
  if (/^(?:Однако|Таким образом|В своей|В своём|После знакомства|Из-за|из-за|Тогда|Но|При этом)\b/u.test(label)) return true;
  if (/^(?:В|С|После|Из-за|Тогда|Но)\s+[а-яё]/u.test(label) && label.split(/\s+/).length >= 4) return true;
  if (/^(?:один|два|три|четыре|пять|шесть|семь|восемь|девять|десять|несколько|многие)\b/iu.test(label)) return true;
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
    const age = birthYear ? year - birthYear : undefined;
    if (!Number.isFinite(age)) return;
    if (age < 0 || age > 120) return;

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
  const terminalIndex = events.findIndex((event) =>
    /(смерт|гибел|погиб|умер|дуэл|died|death|killed)/i.test(`${event.label} ${event.notes ?? ''}`)
  );

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

function normalizeFactLabelHint(label: string) {
  const normalized = normalizeWhitespace(label).slice(0, 80);
  if (/^(?:[А-ЯA-Z]\.){1,4}$/u.test(normalized)) return '';
  if (/^[А-ЯA-Z]$/u.test(normalized)) return '';
  return normalized;
}

function resolveYearBasedAge(year: number, birthYear?: number) {
  if (!birthYear) return undefined;
  const age = year - birthYear;
  return age >= 0 && age <= 120 ? age : undefined;
}

function buildApproximateAgeLabel(minAge: number, maxAge: number) {
  if (minAge === maxAge) {
    return `примерно ${minAge} лет`;
  }
  return `примерно ${minAge}-${maxAge} лет`;
}

function buildHeuristicFactFromSentence(params: {
  sentence: string;
  birthYear?: number;
  year?: number;
  age?: number;
  ageMin?: number;
  ageMax?: number;
  category: BiographyTimelineFact['category'];
  sphere: TimelineSphere;
  labelHint: string;
  importance: BiographyTimelineFact['importance'];
  timePrecision?: BiographyTimelineFact['timePrecision'];
  themes?: BiographyTimelineFact['themes'];
  people?: string[];
  relationRoles?: string[];
}) {
  const normalizedSentence = normalizeWhitespace(params.sentence).slice(0, 700);
  const derivedAge =
    params.age ??
    (Number.isFinite(params.year) ? resolveYearBasedAge(Number(params.year), params.birthYear) : undefined) ??
    (Number.isFinite(params.ageMin) && Number.isFinite(params.ageMax)
      ? Math.round((Number(params.ageMin) + Number(params.ageMax)) / 2)
      : Number.isFinite(params.ageMin)
        ? Number(params.ageMin)
        : Number.isFinite(params.ageMax)
          ? Number(params.ageMax)
          : undefined);

  if (!Number.isFinite(derivedAge) && !Number.isFinite(params.year)) {
    return null;
  }

  return {
    year: params.year,
    age: derivedAge,
    ageMin: params.ageMin,
    ageMax: params.ageMax,
    ageLabel:
      Number.isFinite(params.ageMin) && Number.isFinite(params.ageMax)
        ? buildApproximateAgeLabel(Number(params.ageMin), Number(params.ageMax))
        : undefined,
    timePrecision:
      params.timePrecision ??
      (Number.isFinite(params.year)
        ? 'year'
        : Number.isFinite(params.ageMin) || Number.isFinite(params.ageMax)
          ? 'approximate'
          : Number.isFinite(derivedAge)
            ? 'inferred'
            : undefined),
    sphere: params.sphere,
    category: params.category,
    labelHint: normalizeFactLabelHint(params.labelHint),
    details: normalizedSentence,
    importance: params.importance,
    themes: params.themes,
    people: params.people?.filter(Boolean),
    relationRoles: params.relationRoles?.filter(Boolean),
  } satisfies BiographyTimelineFact;
}

function extractNamedPersonAfter(sentence: string, pattern: RegExp) {
  return sentence.match(pattern)?.[1]?.trim();
}

function normalizeLossRelationLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.startsWith('мат')) return 'матери';
  if (normalized.startsWith('от')) return 'отца';
  if (normalized.startsWith('родител')) return 'родителей';
  if (normalized.startsWith('жен')) return 'жены';
  if (normalized.startsWith('муж')) return 'мужа';
  if (normalized.startsWith('сын')) return 'сына';
  if (normalized.startsWith('доч')) return 'дочери';
  if (normalized.startsWith('друг')) return 'друга';
  if (normalized.startsWith('нян')) return 'няни';
  if (normalized.startsWith('опекун')) return 'опекуна';
  return normalized;
}

function normalizeConflictTargetLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.startsWith('от')) return 'отцом';
  if (normalized.startsWith('мат')) return 'матерью';
  if (normalized.startsWith('родител')) return 'родителями';
  if (normalized.startsWith('семь')) return 'семьёй';
  return normalized;
}

function extractRelativeContextFacts(extract: string): BiographyTimelineFact[] {
  const sentences = splitBiographyExtractIntoSentences(extract);
  const facts: BiographyTimelineFact[] = [];

  for (const sentence of sentences) {
    if (extractYears(sentence).length > 0 || sentence.length > 220) continue;
    if (isPosthumousContextSentence(sentence)) continue;

    const nanny = extractNamedPersonAfter(
      sentence,
      /(?:нян[яеи]|кормилиц[аеи]|гувернантк[аеи]|наставниц[аеи]|наставник[а-я]*)\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/u
    );
    if (/нян|гуверн|настав|воспитател/i.test(sentence)) {
      const fact = buildHeuristicFactFromSentence({
        sentence,
        category: 'education',
        sphere: 'education',
        labelHint: nanny ? `Няня ${nanny}` : 'Домашний наставник',
        importance: 'high',
        ageMin: 4,
        ageMax: 8,
        themes: ['upbringing_mentors', 'education'],
        people: nanny ? [nanny] : undefined,
        relationRoles: nanny ? ['няня'] : ['наставник'],
      });
      if (fact) facts.push(fact);
      continue;
    }

    if (/в детств|детские годы|ранние годы|домашн.*библиотек|много читал|ранн.*чтен|перв.*стих/i.test(sentence)) {
      const fact = buildHeuristicFactFromSentence({
        sentence,
        category: 'education',
        sphere: 'education',
        labelHint: /стих/i.test(sentence) ? 'Первые литературные опыты' : 'Раннее увлечение чтением',
        importance: 'medium',
        ageMin: /детств|ранние годы/i.test(sentence) ? 5 : 6,
        ageMax: /детств|ранние годы/i.test(sentence) ? 8 : 10,
        themes: ['education', 'upbringing_mentors'],
      });
      if (fact) facts.push(fact);
      continue;
    }

    if (/юност|подростк|в лицейские годы/i.test(sentence)) {
      const fact = buildHeuristicFactFromSentence({
        sentence,
        category: 'education',
        sphere: 'education',
        labelHint: 'Юношеское становление',
        importance: 'medium',
        ageMin: 14,
        ageMax: 18,
        themes: ['education'],
      });
      if (fact) facts.push(fact);
    }
  }

  return facts;
}

function extractHighSalienceFactsFromExtract(extract: string, birthYear?: number): BiographyTimelineFact[] {
  const sentences = splitBiographyExtractIntoSentences(extract);
  const facts: BiographyTimelineFact[] = [];

  for (const sentence of sentences) {
    const year = extractYears(sentence)[0];
    const age = Number.isFinite(year) ? resolveYearBasedAge(year, birthYear) : undefined;
    if (!Number.isFinite(age) && !Number.isFinite(year)) continue;

    const lossRelation = /(умерла|умер|скончал(?:ась|ся)?|смерть|кончина)/i.test(sentence)
      ? sentence.match(/(матери|мать|отца|отец|родителей|родителя|жены|жена|мужа|муж|няни|няня|сына|сын|дочери|дочь|друга|друг)/i)?.[1]
      : undefined;
    if (lossRelation) {
      const normalizedLossRelation = normalizeLossRelationLabel(lossRelation);
      const fact = buildHeuristicFactFromSentence({
        sentence,
        birthYear,
        year,
        age,
        category: 'family',
        sphere: 'family',
        labelHint: `Смерть ${normalizedLossRelation}`,
        importance: 'high',
        themes: ['losses', 'family_household'],
        relationRoles: [normalizedLossRelation],
      });
      if (fact) facts.push(fact);
      continue;
    }

    const romanceName = extractNamedPersonAfter(
      sentence,
      /(?:отношени[яй]|роман|любовь|увлечени[ея]|переписк[аи]|связ[ьи])\s+(?:с|к)\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/u
    );
    if (romanceName) {
      const fact = buildHeuristicFactFromSentence({
        sentence,
        birthYear,
        year,
        age,
        category: 'family',
        sphere: 'family',
        labelHint: `Отношения с ${romanceName}`,
        importance: /любов|роман/i.test(sentence) ? 'high' : 'medium',
        themes: ['romance'],
        people: [romanceName],
        relationRoles: ['партнёр'],
      });
      if (fact) facts.push(fact);
      continue;
    }

    const familyConflictTarget = sentence.match(
      /(?:ссор[а-я]*|конфликт|разрыв)[^.!?]{0,40}\s+с\s+(отцом|отца|матерью|матью|родителями|семьёй|семьей)/i
    )?.[1];
    if (familyConflictTarget) {
      const normalizedConflictTarget = normalizeConflictTargetLabel(familyConflictTarget);
      const fact = buildHeuristicFactFromSentence({
        sentence,
        birthYear,
        year,
        age,
        category: 'conflict',
        sphere: 'family',
        labelHint: `Ссора с ${normalizedConflictTarget}`,
        importance: 'high',
        themes: ['family_household', 'conflict_duels'],
        relationRoles: [normalizedConflictTarget],
      });
      if (fact) facts.push(fact);
      continue;
    }

    if (/(декабрист|восстан|арест|казн|сослан)/i.test(sentence) && /(друз|друг|товарищ|круг|лицейск|приятел)/i.test(sentence)) {
      const fact = buildHeuristicFactFromSentence({
        sentence,
        birthYear,
        year,
        age,
        category: 'friends',
        sphere: 'friends',
        labelHint: /декабрист|восстан/i.test(sentence) ? 'Восстание друзей-декабристов' : 'Удар по кругу друзей',
        importance: 'high',
        themes: ['friends_network', 'politics_public_pressure', 'losses'],
      });
      if (fact) facts.push(fact);
      continue;
    }

    if (/(родил\S*\s+(?:сын|дочь|ребён|ребен))/i.test(sentence)) {
      const childName = extractNamedPersonAfter(
        sentence,
        /(?:сын|дочь|ребёнок|ребенок)\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/u
      );
      const fact = buildHeuristicFactFromSentence({
        sentence,
        birthYear,
        year,
        age,
        category: 'family',
        sphere: 'family',
        labelHint: childName ? `Рождение ребёнка: ${childName}` : 'Рождение ребёнка',
        importance: 'high',
        themes: ['children', 'family_household'],
        people: childName ? [childName] : undefined,
        relationRoles: ['ребёнок'],
      });
      if (fact) facts.push(fact);
    }
  }

  return facts;
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
    { pattern: /лицейск|друж|друз|переписк|кружок|общество|арзамас|лампа|декабрист|пущин|дельвиг|кюхельбекер|чаадаев/i, sphere: 'friends' },
  ]);
}

export function extractChildhoodEventsFromExtract(extract: string, birthYear?: number) {
  return extractTargetedEvents(extract, birthYear, [
    { pattern: /нян|домашн.*обуч|гуверн|воспит|детств|ранн.*чтен|перв.*стих|усадьб|захаров/i, sphere: 'education' },
    { pattern: /семь|родител|дом|детств/i, sphere: 'family' },
  ]).filter((event) => event.age <= 12);
}

export function extractRelativeChildhoodEventsFromExtract(extract: string, birthYear?: number) {
  if (!birthYear) return [];

  const sentences = splitBiographyExtractIntoSentences(extract);
  const relativePatterns: Array<{ pattern: RegExp; sphere: TimelineSphere; age: number }> = [
    { pattern: /в детств|детские годы|ранние годы|много читал|домашн.*библиотек|ранн.*чтен|перв.*стих/i, sphere: 'education', age: 6 },
    { pattern: /летние месяцы|захаров|усадьб|у бабушк|у дедушк/i, sphere: 'family', age: 9 },
    { pattern: /подростк|юност|юный/i, sphere: 'education', age: 15 },
  ];

  const events: BiographyTimelineEventPlan[] = [];
  for (const sentence of sentences) {
    if (extractYears(sentence).length > 0 || sentence.length > 180) continue;
    if (isPosthumousContextSentence(sentence)) continue;

    const matched = relativePatterns.find(({ pattern }) => pattern.test(sentence));
    if (!matched) continue;

    const event = sanitizeTimelineEventPlan(
      {
        age: matched.age,
        label: buildHeuristicLabel(sentence, matched.sphere),
        notes: normalizeWhitespace(sentence).slice(0, 300),
        sphere: matched.sphere,
        isDecision: inferDecisionFromSentence(sentence),
        iconId: inferIconFromSentence(sentence, matched.sphere),
      },
      matched.sphere
    );

    if (event && event.age <= 18) {
      events.push(event);
    }
  }

  return dedupeEvents(events);
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
      pattern: /(?:ссор[а-я]*|конфликт|разрыв)[^.!?]{0,40}\s+с\s+(?:отцом|отца|матерью|матью|родителями|семьёй|семьей)/i,
      labelFn: (s) => {
        const target = s.match(/(?:ссор[а-я]*|конфликт|разрыв)[^.!?]{0,40}\s+с\s+(\S+)/i)?.[1];
        return target ? `Ссора с ${normalizeConflictTargetLabel(target)}` : 'Семейный конфликт';
      },
      sphere: 'family',
    },
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
      pattern: /(?:отношени[яй]|роман|любовь|увлечени[ея]|связ[ьи])\s+(?:с|к)\s+[А-ЯЁ]/u,
      labelFn: (s) => {
        const person = extractNamedPersonAfter(
          s,
          /(?:отношени[яй]|роман|любовь|увлечени[ея]|связ[ьи])\s+(?:с|к)\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/u
        );
        return person ? `Отношения с ${person}` : 'Любовная связь';
      },
      sphere: 'family',
    },
    {
      pattern: /(?:декабрист|восстан|арест|казн|сослан).*(?:друз|друг|товарищ|круг|лицейск|приятел)/i,
      labelFn: (s) => (/декабрист|восстан/i.test(s) ? 'Восстание друзей-декабристов' : 'Удар по кругу друзей'),
      sphere: 'friends',
    },
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
    ...extractRelativeChildhoodEventsFromExtract(extract, birthYear),
    ...extractFriendshipEventsFromExtract(extract, birthYear),
    ...extractPsychologicallySignificantEvents(extract, birthYear),
  ]);
  const directFacts = [
    ...extractRelativeContextFacts(extract),
    ...extractHighSalienceFactsFromExtract(extract, birthYear),
  ];

  return [
    ...events.map((event): BiographyTimelineFact => {
      const normalizedText = `${event.label} ${event.notes ?? ''}`.toLowerCase();
      const normalizedLabel = event.label.toLowerCase();
      const isBirthEvent = /(рождени|родил|родилась|родился)/i.test(normalizedText) && event.age <= 1.5;
      const isDeathEvent =
        /(смерт|гибел|погиб|умер|дуэл)/i.test(normalizedLabel) ||
        (/(смерт|гибел|погиб|умер|дуэл)/i.test(normalizedText) &&
          !/(восшествие на престол|коронац|присяга|назначен|назначение|визит|юбиле|обращени|переезд)/i.test(normalizedLabel));
      const category =
        isBirthEvent
          ? 'birth'
          : isDeathEvent
            ? 'death'
            : /(восшествие на престол|коронац|присяга|назначени|юбиле|обращени|монарх|премьер|парламент|государственный визит|турне|walkabout)/i.test(
                  normalizedLabel
                )
              ? 'career'
              : /(поступ|учеб|учёб|лицей|универс|школ|домашнее обучение|няня|настав)/i.test(normalizedText)
                ? 'education'
                : /(друж|перепис|кружок|декабрист|лицейский круг)/i.test(normalizedText)
                  ? 'friends'
                  : /(переезд|ссыл|одесс|кишин|петербург|болдин|москв|крым|кавказ|захаров|усадьб|поездка|турне|визит)/i.test(normalizedText)
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
    }),
    ...directFacts,
  ];
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
      '',
      fact.importance,
      fact.timePrecision ?? (Number.isFinite(fact.year) ? 'year' : Number.isFinite(fact.age) ? 'inferred' : ''),
      Number.isFinite(fact.ageMin) ? fact.ageMin : 'unknown',
      Number.isFinite(fact.ageMax) ? fact.ageMax : 'unknown',
      fact.themes?.join('|') ?? '',
      fact.people?.join('|') ?? '',
      fact.relationRoles?.join('|') ?? '',
      fact.ageLabel ?? '',
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
    ...extractRelativeChildhoodEventsFromExtract(params.extract, birthYear),
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
