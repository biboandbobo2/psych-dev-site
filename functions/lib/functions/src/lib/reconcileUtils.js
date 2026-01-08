/**
 * Утилиты для нормализации и слияния данных при reconcile
 */
export const ARRAY_FIELDS = [
    'concepts',
    'authors',
    'core_literature',
    'extra_literature',
    'extra_videos',
    'video_playlist',
    'leisure',
];
export function normalizeSpaces(value) {
    return value.replace(/\s+/g, ' ').trim();
}
export function normalizeAuthor(value) {
    if (!value)
        return undefined;
    if (typeof value === 'string') {
        const name = normalizeSpaces(value);
        if (!name)
            return undefined;
        return { name };
    }
    if (typeof value === 'object') {
        const name = normalizeSpaces(String(value.name ?? value.title ?? ''));
        if (!name)
            return undefined;
        const url = value.url ?? value.link ?? value.href;
        return url ? { name, url: String(url).trim() } : { name };
    }
    return undefined;
}
export function normalizeAuthors(value) {
    if (!Array.isArray(value))
        return [];
    const result = [];
    value.forEach((item) => {
        const normalized = normalizeAuthor(item);
        if (normalized)
            result.push(normalized);
    });
    return result;
}
export function normalizeLink(value) {
    if (!value)
        return undefined;
    if (typeof value === 'string') {
        const title = normalizeSpaces(value);
        if (!title)
            return undefined;
        return { title };
    }
    if (typeof value === 'object') {
        const title = normalizeSpaces(String(value.title ?? value.name ?? ''));
        if (!title)
            return undefined;
        const url = value.url ?? value.link ?? value.href;
        return url ? { title, url: String(url).trim() } : { title };
    }
    return undefined;
}
export function normalizeLinks(value) {
    if (!Array.isArray(value))
        return [];
    const result = [];
    value.forEach((item) => {
        const normalized = normalizeLink(item);
        if (normalized)
            result.push(normalized);
    });
    return result;
}
export function normalizeVideoPlaylist(value) {
    if (!Array.isArray(value))
        return [];
    const result = [];
    value.forEach((item) => {
        if (!item)
            return;
        if (typeof item === 'string') {
            const url = normalizeSpaces(item);
            if (url)
                result.push({ title: '', url });
            return;
        }
        if (typeof item === 'object') {
            const rawUrl = item.url ?? item.videoUrl ?? item.src;
            const url = rawUrl ? normalizeSpaces(String(rawUrl)) : '';
            if (!url)
                return;
            const title = normalizeSpaces(String(item.title ?? item.label ?? ''));
            const deck = item.deckUrl ?? item.deck_url;
            const audio = item.audioUrl ?? item.audio_url;
            result.push({
                title,
                url,
                ...(deck ? { deckUrl: normalizeSpaces(String(deck)) } : {}),
                ...(audio ? { audioUrl: normalizeSpaces(String(audio)) } : {}),
            });
        }
    });
    return result;
}
export function normalizeLeisure(value) {
    if (!Array.isArray(value))
        return [];
    const result = [];
    value.forEach((item) => {
        if (!item)
            return;
        if (typeof item === 'string') {
            const title = normalizeSpaces(item);
            if (title)
                result.push({ title });
            return;
        }
        if (typeof item === 'object') {
            const title = normalizeSpaces(String(item.title ?? item.name ?? ''));
            if (!title)
                return;
            const urlRaw = item.url ?? item.link;
            const typeRaw = item.type ?? item.category;
            const yearRaw = item.year;
            result.push({
                title,
                ...(urlRaw ? { url: String(urlRaw).trim() } : {}),
                ...(typeRaw ? { type: normalizeSpaces(String(typeRaw)) } : {}),
                ...(yearRaw !== undefined && yearRaw !== null
                    ? { year: normalizeSpaces(String(yearRaw)) }
                    : {}),
            });
        }
    });
    return result;
}
export function normalizeConcepts(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map((item) => normalizeSpaces(String(item ?? '')))
        .filter((item) => item.length > 0);
}
function conceptKey(value) {
    return normalizeSpaces(value).toLowerCase();
}
function authorKey(value) {
    const name = normalizeSpaces(value.name).toLowerCase();
    const url = value.url ? value.url.trim().toLowerCase() : '';
    return `${name}|${url}`;
}
function linkKey(value) {
    const title = normalizeSpaces(value.title).toLowerCase();
    const url = value.url ? value.url.trim().toLowerCase() : '';
    return `${title}|${url}`;
}
function videoKey(value) {
    const title = normalizeSpaces(value.title).toLowerCase();
    const url = value.url.trim().toLowerCase();
    const deck = value.deckUrl ? normalizeSpaces(value.deckUrl).toLowerCase() : '';
    const audio = value.audioUrl ? normalizeSpaces(value.audioUrl).toLowerCase() : '';
    return `${title}|${url}|${deck}|${audio}`;
}
function leisureKey(value) {
    const title = normalizeSpaces(value.title).toLowerCase();
    const url = value.url ? value.url.trim().toLowerCase() : '';
    const type = value.type ? normalizeSpaces(value.type).toLowerCase() : '';
    const year = value.year ? normalizeSpaces(value.year).toLowerCase() : '';
    return `${title}|${url}|${type}|${year}`;
}
export function mergeUniqueStrings(current, additions) {
    const set = new Set(current.map(conceptKey));
    const result = [...current];
    additions.forEach((item) => {
        const key = conceptKey(item);
        if (!set.has(key)) {
            set.add(key);
            result.push(item);
        }
    });
    return result;
}
export function mergeUniqueAuthors(current, additions) {
    const set = new Set(current.map(authorKey));
    const result = [...current];
    additions.forEach((item) => {
        const key = authorKey(item);
        if (!set.has(key)) {
            set.add(key);
            result.push(item);
        }
    });
    return result;
}
export function mergeUniqueLinks(current, additions) {
    const set = new Set(current.map(linkKey));
    const result = [...current];
    additions.forEach((item) => {
        const key = linkKey(item);
        if (!set.has(key)) {
            set.add(key);
            result.push(item);
        }
    });
    return result;
}
export function mergeUniqueVideos(current, additions) {
    const set = new Set(current.map(videoKey));
    const result = [...current];
    additions.forEach((item) => {
        const key = videoKey(item);
        if (!set.has(key)) {
            set.add(key);
            result.push(item);
        }
    });
    return result;
}
export function mergeUniqueLeisure(current, additions) {
    const set = new Set(current.map(leisureKey));
    const result = [...current];
    additions.forEach((item) => {
        const key = leisureKey(item);
        if (!set.has(key)) {
            set.add(key);
            result.push(item);
        }
    });
    return result;
}
