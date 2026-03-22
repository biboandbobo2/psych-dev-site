const GENERIC_LABEL_PATTERN = /^(?:уч[её]ба|обучение|публикация|новая публикация|новый карьерный этап|карьерный этап|ссылка|переезд|важное событие|формирующее детство|детство(?:\s+и\s+юность)?|юность|школьные годы|студенческие годы|брак|смерть|событие)$/i;
export function isGenericBiographyLabel(label) {
    return Boolean(label && GENERIC_LABEL_PATTERN.test(label.trim()));
}
export function isTruncatedBiographyLabel(label) {
    if (!label)
        return false;
    const normalized = label.trim();
    if (!normalized)
        return false;
    const openQuotes = [...normalized].filter((char) => char === '«').length;
    const closeQuotes = [...normalized].filter((char) => char === '»').length;
    if (openQuotes > 0 && openQuotes > closeQuotes) {
        return true;
    }
    return /\s(?:в|на|с|о|к|у|по|из|за|от|до|для|при|про|без|над|под|об|что|как|и|а|но|или|не)\s*$/i.test(normalized);
}
export function isMediaMentionBiographyEvent(label, details) {
    const normalizedLabel = (label || '').trim();
    const normalizedText = `${normalizedLabel} ${details || ''}`.trim();
    if (!normalizedText)
        return false;
    if (/^(?:Материал в|Обложка|Упоминание)\b/i.test(normalizedLabel)) {
        return true;
    }
    if (/^Публикация «[^»]+»/i.test(normalizedLabel) &&
        /(газет|журнал|обложк|в прессе|ролик|фильм|яхт|музе)/i.test(normalizedText) &&
        !/(написал|написала|опубликовал|опубликовала|издал|издала|выпустил|выпустила|роман|книга|поэма|повесть|стихотворен)/i.test(normalizedText)) {
        return true;
    }
    return false;
}
