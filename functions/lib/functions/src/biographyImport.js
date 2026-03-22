/**
 * Cloud Function: biographyImport
 * Full biography pipeline in a single call with parallel slice extraction.
 * Replaces the multi-step Vercel endpoint that couldn't fit within 60s timeout.
 *
 * Steps:
 * 1. Fetch Wikipedia article
 * 2. Extract facts (slices in parallel via Promise.allSettled)
 * 3. Gap-filling
 * 4. Annotation + redaktura
 * 5. Composition + render → final timeline
 */
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';
import { GoogleGenAI } from '@google/genai';
import { debugLog, debugError } from './lib/debug.js';
// Import biography submodules (included via tsconfig)
import { WIKIPEDIA_HOST_PATTERN, } from '../../server/api/timelineBiographyTypes.js';
import { fetchWikipediaPlainExtract } from '../../server/api/timelineBiographyWikipedia.js';
import { buildSimpleBiographyFactExtractionPrompt, buildBiographyGapFillingPrompt, buildBiographyAnnotationPrompt, buildBiographyRedakturaPrompt, buildBiographyCompositionPrompt, } from '../../server/api/timelineBiographyPrompts.js';
import { buildPlanFromCompositionResult } from '../../server/api/timelineBiographyComposer.js';
import { buildTimelineDataFromBiographyPlan } from '../../server/api/timelineBiographyQuality.js';
// ============================================================================
// INIT
// ============================================================================
if (getApps().length === 0) {
    initializeApp();
}
// Facts contain optional fields (age, month, etc.) that may be undefined.
// Firestore rejects undefined values by default.
getFirestore().settings({ ignoreUndefinedProperties: true });
const JOBS_COLLECTION = 'biographyJobs';
// ============================================================================
// Helpers (inlined from timelineBiographyRuntime to avoid pulling in Vercel deps)
// ============================================================================
function getGenAiClient(apiKey) {
    return new GoogleGenAI({ apiKey });
}
/** Call Gemini with retry on 429 (rate limit) — up to 3 attempts with exponential backoff */
async function callGeminiWithRetry(client, params, label) {
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await client.models.generateContent(params);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const is429 = /429|RESOURCE_EXHAUSTED|quota/i.test(msg);
            if (is429 && attempt < MAX_RETRIES - 1) {
                const delay = (attempt + 1) * 10_000; // 10s, 20s
                debugLog(`[biographyImport] ${label}: 429 rate limit, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw error;
        }
    }
    throw new Error(`${label}: max retries exceeded`);
}
function collectGeminiResultText(result) {
    if (result && typeof result === 'object') {
        const directText = 'text' in result && typeof result.text === 'string' ? result.text : '';
        if (directText.trim())
            return directText;
        const outputsText = 'outputs' in result && Array.isArray(result.outputs)
            ? result.outputs
                .map((output) => {
                if (!output || typeof output !== 'object')
                    return '';
                const type = 'type' in output && typeof output.type === 'string' ? output.type : '';
                if (type !== 'text')
                    return '';
                return 'text' in output && typeof output.text === 'string' ? output.text : '';
            })
                .filter(Boolean)
                .join('\n')
            : '';
        if (outputsText.trim())
            return outputsText;
        const candidateText = 'candidates' in result && Array.isArray(result.candidates)
            ? result.candidates
                .flatMap((candidate) => {
                if (!candidate || typeof candidate !== 'object')
                    return [];
                const content = 'content' in candidate ? candidate.content : null;
                if (!content || typeof content !== 'object')
                    return [];
                const parts = 'parts' in content && Array.isArray(content.parts) ? content.parts : [];
                return parts
                    .map((part) => {
                    if (!part || typeof part !== 'object')
                        return '';
                    return 'text' in part && typeof part.text === 'string' ? part.text : '';
                })
                    .filter(Boolean);
            })
                .join('\n')
            : '';
        if (candidateText.trim())
            return candidateText;
    }
    return '';
}
function parseSimpleJsonFacts(rawText) {
    const cleaned = rawText.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
    let jsonText = cleaned.match(/\[[\s\S]*\]/)?.[0] ?? '';
    if (!jsonText) {
        const arrayStart = cleaned.indexOf('[');
        if (arrayStart >= 0) {
            let truncated = cleaned.slice(arrayStart).replace(/,\s*$/, '');
            const lastComplete = truncated.lastIndexOf('}');
            if (lastComplete > 0) {
                truncated = truncated.slice(0, lastComplete + 1) + ']';
                jsonText = truncated;
            }
        }
    }
    if (!jsonText)
        return [];
    try {
        const parsed = JSON.parse(jsonText);
        if (!Array.isArray(parsed))
            return [];
        return parsed
            .filter((item) => item && typeof item.text === 'string' && item.text.trim().length > 3)
            .map((item) => ({
            year: typeof item.year === 'number' ? item.year : undefined,
            age: undefined,
            sphere: (item.sphere ?? 'other'),
            category: item.category ?? 'other',
            eventType: (item.category ?? 'other'),
            labelHint: item.text?.trim() ?? '',
            details: item.text?.trim() ?? '',
            evidence: item.text?.trim() ?? '',
            importance: 'medium',
            confidence: 'medium',
            source: 'model',
        }));
    }
    catch {
        return [];
    }
}
function splitTextIntoSlices(text, count) {
    if (count <= 1)
        return [text];
    const targetSize = Math.ceil(text.length / count);
    const slices = [];
    let start = 0;
    for (let i = 0; i < count - 1; i++) {
        let end = start + targetSize;
        const searchStart = Math.max(start, end - Math.floor(targetSize * 0.2));
        const searchEnd = Math.min(text.length, end + Math.floor(targetSize * 0.2));
        const region = text.slice(searchStart, searchEnd);
        const breakIdx = region.indexOf('\n\n');
        if (breakIdx !== -1)
            end = searchStart + breakIdx + 2;
        slices.push(text.slice(start, end));
        start = end;
    }
    slices.push(text.slice(start));
    return slices;
}
function deduplicateFacts(facts) {
    const stopWords = new Set(['в', 'и', 'на', 'с', 'по', 'из', 'за', 'от', 'к', 'до', 'для', 'не', 'о', 'об', 'его', 'её', 'был', 'была', 'были', 'году', 'год', 'года', 'лет']);
    function extractKeywords(text) {
        return new Set(text.toLowerCase().replace(/[«»"".,;:!?()—–\-]/g, ' ').split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w)));
    }
    function countOverlap(kwA, kwB) {
        let shared = 0;
        for (const w of kwA) {
            if (kwB.has(w))
                shared++;
        }
        return shared;
    }
    const removed = new Set();
    for (let i = 0; i < facts.length; i++) {
        if (removed.has(i))
            continue;
        for (let j = i + 1; j < facts.length; j++) {
            if (removed.has(j))
                continue;
            const a = facts[i];
            const b = facts[j];
            const sameYear = a.year != null && b.year != null && a.year === b.year;
            const oneUndated = (a.year == null) !== (b.year == null);
            if (!sameYear && !oneUndated)
                continue;
            const kwA = extractKeywords(a.details);
            const kwB = extractKeywords(b.details);
            const shared = countOverlap(kwA, kwB);
            if (shared >= 3) {
                if (oneUndated) {
                    removed.add(a.year == null ? i : j);
                    if (a.year == null)
                        break;
                }
                else {
                    if (a.details.length >= b.details.length) {
                        removed.add(j);
                    }
                    else {
                        removed.add(i);
                        break;
                    }
                }
            }
        }
    }
    return facts.filter((_, idx) => !removed.has(idx));
}
// ============================================================================
// Annotation
// ============================================================================
const VALID_THEMES = new Set([
    'upbringing_mentors', 'education', 'friends_network', 'romance',
    'family_household', 'children', 'travel_moves_exile', 'service_career',
    'creative_work', 'conflict_duels', 'losses', 'politics_public_pressure',
    'health', 'legacy',
]);
function parseAnnotationResponse(rawText) {
    const annotations = new Map();
    for (const line of rawText.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('INDEX'))
            continue;
        const parts = trimmed.split(/\t/);
        if (parts.length < 2)
            continue;
        const index = parseInt(parts[0], 10);
        if (isNaN(index))
            continue;
        const themes = (parts[1] ?? '').split(',').map(t => t.trim()).filter(t => VALID_THEMES.has(t));
        const people = (parts[2] ?? '').split(',').map(p => p.trim()).filter(p => p && p !== '-' && p !== 'пусто');
        const month = parts[3] ? parseInt(parts[3], 10) : null;
        const day = parts[4] ? parseInt(parts[4], 10) : null;
        if (themes.length > 0) {
            annotations.set(index, {
                themes,
                people,
                month: month && !isNaN(month) && month >= 1 && month <= 12 ? month : null,
                day: day && !isNaN(day) && day >= 1 && day <= 31 ? day : null,
            });
        }
    }
    return annotations;
}
// ============================================================================
// Redaktura
// ============================================================================
function parseRedakturaResponse(rawText) {
    const results = new Map();
    for (const line of rawText.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('INDEX'))
            continue;
        const parts = trimmed.split(/\t/);
        if (parts.length < 3)
            continue;
        const index = parseInt(parts[0], 10);
        if (isNaN(index))
            continue;
        const importance = parseInt(parts[1], 10);
        const shortLabel = parts[2]?.trim() ?? '';
        results.set(index, {
            importance: importance >= 1 && importance <= 5 ? importance : 3,
            shortLabel,
        });
    }
    return results;
}
// ============================================================================
// Validation
// ============================================================================
function validateSourceUrl(body) {
    const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : '';
    if (!sourceUrl) {
        throw Object.assign(new Error('Укажите ссылку на статью Wikipedia.'), { statusCode: 400 });
    }
    try {
        const hostname = new URL(sourceUrl).hostname;
        if (!WIKIPEDIA_HOST_PATTERN.test(hostname)) {
            throw Object.assign(new Error('Ссылка должна вести на Wikipedia.'), { statusCode: 400 });
        }
    }
    catch (e) {
        if (e.statusCode)
            throw e;
        throw Object.assign(new Error('Некорректный URL.'), { statusCode: 400 });
    }
    return sourceUrl;
}
function normalizeError(error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const statusCode = error.statusCode;
    if (statusCode)
        return { statusCode, message: rawMessage };
    if (/quota|RESOURCE_EXHAUSTED|429/i.test(rawMessage))
        return { statusCode: 429, message: 'Gemini временно недоступен из-за лимита запросов. Попробуйте позже.' };
    if (/PERMISSION_DENIED|API key not valid|invalid api key|forbidden/i.test(rawMessage))
        return { statusCode: 403, message: 'Gemini API key недействителен.' };
    if (/JSON|Unexpected token|parse/i.test(rawMessage))
        return { statusCode: 502, message: 'Gemini вернул некорректный ответ. Попробуйте ещё раз.' };
    return { statusCode: 500, message: `Не удалось собрать таймлайн: ${rawMessage}` };
}
// ============================================================================
// Auth (verify Firebase Auth token from Authorization header)
// ============================================================================
async function verifyAuth(req) {
    const authHeader = req.headers['authorization'] ?? req.headers['Authorization'] ?? '';
    const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
    if (!token) {
        throw Object.assign(new Error('Authorization header required'), { statusCode: 401 });
    }
    const decoded = await getAuth().verifyIdToken(token);
    let email = decoded.email ?? '';
    if (!email) {
        try {
            const userRecord = await getAuth().getUser(decoded.uid);
            email = userRecord.email ?? '';
        }
        catch { /* optional */ }
    }
    return { uid: decoded.uid, email };
}
// ============================================================================
// MAIN PIPELINE
// ============================================================================
async function runFullBiographyPipeline(params) {
    const db = getFirestore();
    const client = getGenAiClient(params.apiKey);
    // Create job document (use client-provided jobId for onSnapshot tracking)
    const jobRef = params.jobId
        ? db.collection(JOBS_COLLECTION).doc(params.jobId)
        : db.collection(JOBS_COLLECTION).doc();
    await jobRef.set({
        userId: params.uid,
        userEmail: params.userEmail,
        canvasId: params.canvasId,
        sourceUrl: params.sourceUrl,
        subjectName: '',
        status: 'running',
        progress: { step: 1, total: 6, label: 'Загрузка статьи из Wikipedia' },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    const updateJob = async (data) => {
        await jobRef.update({ ...data, updatedAt: FieldValue.serverTimestamp() });
    };
    try {
        // --- Step 1: Wikipedia fetch ---
        debugLog('[biographyImport] fetching Wikipedia', { sourceUrl: params.sourceUrl });
        const wikiPage = await fetchWikipediaPlainExtract(params.sourceUrl);
        const fullExtract = wikiPage.biographyExtract || wikiPage.extract;
        const subjectName = wikiPage.title;
        const len = fullExtract.length;
        // --- Step 2: Slice extraction ---
        const sliceCount = len <= 30000 ? 1 : len <= 70000 ? 2 : len <= 130000 ? 3 : 4;
        const slices = splitTextIntoSlices(fullExtract, sliceCount);
        await updateJob({
            subjectName,
            status: 'step1_extracting',
            progress: { step: 2, total: 6, label: 'Извлечение фактов', detail: `${sliceCount} ${sliceCount === 1 ? 'часть' : 'части'}` },
        });
        debugLog('[biographyImport] extraction start', { subjectName, chars: len, slices: sliceCount });
        // Extract slices sequentially to avoid Gemini rate limits (429)
        let allFacts = [];
        const factsModel = 'gemini-2.5-flash';
        for (let i = 0; i < slices.length; i++) {
            const focusHint = slices.length > 1
                ? `Персона: ${subjectName}. Это часть ${i + 1} из ${slices.length}. Извлекай ВСЕ факты из этого фрагмента — включая мелкие семейные детали, конкретные произведения, второстепенные эпизоды, аресты, организации.`
                : `Персона: ${subjectName}. Извлекай максимум фактов — включая мелкие семейные детали, конкретные произведения, второстепенные эпизоды, аресты, организации.`;
            const prompt = buildSimpleBiographyFactExtractionPrompt({
                articleTitle: subjectName,
                extract: slices[i],
                focusHint,
            });
            const result = await callGeminiWithRetry(client, {
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: { temperature: 0.1, maxOutputTokens: 65536, responseMimeType: 'text/plain' },
            }, `extraction slice ${i + 1}/${slices.length}`);
            const rawText = collectGeminiResultText(result);
            const facts = parseSimpleJsonFacts(rawText);
            allFacts.push(...facts);
            debugLog(`[biographyImport] slice ${i + 1}/${slices.length} done`, { facts: facts.length });
        }
        if (allFacts.length === 0) {
            throw new Error('two-pass-flash-failed: all slices returned 0 facts');
        }
        allFacts = deduplicateFacts(allFacts);
        await updateJob({
            status: 'step1_done',
            progress: { step: 3, total: 6, label: 'Gap-filling', detail: `${allFacts.length} фактов извлечено` },
            'step1.facts': allFacts,
            'step1.model': factsModel,
            'step1.rawTextChars': len,
            'step1.extract': fullExtract,
        });
        debugLog('[biographyImport] extraction done', { facts: allFacts.length });
        // --- Step 3: Gap-filling ---
        try {
            const datedFacts = allFacts.filter(f => f.year != null);
            const undatedFacts = allFacts.filter(f => f.year == null);
            const existingFactTexts = datedFacts.map(f => `[${f.year}] ${f.details}`);
            const undatedFactTexts = undatedFacts.map(f => f.details);
            const gapSlices = len > 100000 ? slices : [fullExtract];
            // Gap-filling sequentially to avoid rate limits
            allFacts = [...datedFacts];
            for (let i = 0; i < gapSlices.length; i++) {
                try {
                    const gapPrompt = buildBiographyGapFillingPrompt({
                        articleTitle: subjectName,
                        extract: gapSlices[i],
                        existingFacts: existingFactTexts,
                        undatedFacts: undatedFactTexts.length > 0 ? undatedFactTexts : undefined,
                    });
                    const gapResult = await callGeminiWithRetry(client, {
                        model: 'gemini-2.5-flash',
                        contents: [{ role: 'user', parts: [{ text: gapPrompt }] }],
                        config: { temperature: 0.1, maxOutputTokens: 65536, responseMimeType: 'text/plain' },
                    }, `gap-filling ${i + 1}/${gapSlices.length}`);
                    const gapFacts = parseSimpleJsonFacts(collectGeminiResultText(gapResult));
                    if (gapFacts.length > 0)
                        allFacts.push(...gapFacts);
                }
                catch {
                    // Individual gap-fill slice failure is ok
                }
            }
            allFacts = deduplicateFacts(allFacts);
        }
        catch {
            // Gap-filling is best-effort
        }
        await updateJob({
            status: 'step2_done',
            progress: { step: 4, total: 6, label: 'Аннотация и ранжирование', detail: `${allFacts.length} фактов после добивки` },
            'step2.facts': allFacts,
        });
        debugLog('[biographyImport] gap-filling done', { facts: allFacts.length });
        // --- Step 4: Annotation ---
        const indexedForAnnotation = allFacts.map((fact, index) => ({
            index,
            year: fact.year ?? null,
            details: fact.details ?? fact.evidence ?? '',
        }));
        const annotationPrompt = buildBiographyAnnotationPrompt({
            subjectName,
            facts: indexedForAnnotation,
        });
        let annotations = new Map();
        try {
            const annotResult = await callGeminiWithRetry(client, {
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: annotationPrompt }] }],
                config: { temperature: 0.05, maxOutputTokens: 65536, responseMimeType: 'text/plain' },
            }, 'annotation');
            annotations = parseAnnotationResponse(collectGeminiResultText(annotResult));
        }
        catch (error) {
            debugError('[biographyImport] annotation failed', { error });
        }
        const annotatedFacts = allFacts.map((fact, index) => {
            const ann = annotations.get(index);
            return { ...fact, themes: ann?.themes ?? fact.themes, people: ann?.people?.length ? ann.people : fact.people, month: ann?.month ?? fact.month };
        });
        // --- Step 5: Redaktura ---
        const indexedForRedaktura = annotatedFacts.map((fact, index) => ({
            index,
            year: fact.year ?? null,
            details: fact.details ?? fact.evidence ?? '',
            themes: annotations.get(index)?.themes ?? fact.themes ?? [],
        }));
        const redakturaPrompt = buildBiographyRedakturaPrompt({
            subjectName,
            facts: indexedForRedaktura,
        });
        let finalFacts = annotatedFacts;
        try {
            const redResult = await callGeminiWithRetry(client, {
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: redakturaPrompt }] }],
                config: { temperature: 0.05, maxOutputTokens: 16384, responseMimeType: 'text/plain' },
            }, 'redaktura');
            const redaktura = parseRedakturaResponse(collectGeminiResultText(redResult));
            finalFacts = annotatedFacts.map((fact, index) => {
                const red = redaktura.get(index);
                const rankScore = red?.importance ?? 2;
                const importance = rankScore >= 4 ? 'high' : rankScore === 3 ? 'medium' : 'low';
                return { ...fact, shortLabel: red?.shortLabel ?? fact.shortLabel, importance };
            });
        }
        catch (error) {
            debugError('[biographyImport] redaktura failed', { error });
        }
        await updateJob({
            status: 'step3_done',
            progress: { step: 5, total: 6, label: 'Композиция таймлайна', detail: `${finalFacts.length} фактов обработано` },
            'step3.facts': finalFacts,
        });
        debugLog('[biographyImport] annotation+redaktura done', { facts: finalFacts.length });
        // --- Step 6: Composition + render ---
        const birthFact = finalFacts.find(f => f.eventType === 'birth' || f.category === 'birth');
        const birthYear = birthFact?.year ?? finalFacts[0]?.year ?? 0;
        const deathFact = finalFacts.find(f => f.category === 'death')
            ?? finalFacts.find(f => f.themes?.includes('losses') && (f.details?.includes('скончал') || f.details?.includes('Умер') || f.details?.includes('умер')));
        const allYears = finalFacts.map(f => f.year ?? 0).filter(y => y > 0 && y < 2100);
        const deathYear = deathFact?.year ?? (allYears.length > 0 ? Math.max(...allYears) : null);
        const importanceToScore = (imp) => {
            if (imp === 'high')
                return 4;
            if (imp === 'medium')
                return 3;
            return 2;
        };
        const compositionPrompt = buildBiographyCompositionPrompt({
            subjectName,
            birthYear,
            deathYear,
            facts: finalFacts.map((fact, index) => ({
                index,
                year: fact.year ?? 0,
                shortLabel: fact.shortLabel ?? (fact.details ?? fact.evidence ?? '').slice(0, 40),
                themes: (fact.themes ?? []).join(','),
                people: (fact.people ?? []).join(','),
                importance: importanceToScore(fact.importance),
            })),
        });
        const compResult = await callGeminiWithRetry(client, {
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: compositionPrompt }] }],
            config: { temperature: 0.1, maxOutputTokens: 65536, responseMimeType: 'application/json' },
        }, 'composition');
        const composition = JSON.parse(collectGeminiResultText(compResult));
        // Fill in missing facts
        const assigned = new Set();
        for (const idx of composition.mainLine)
            assigned.add(idx);
        for (const branch of composition.branches) {
            for (const idx of branch.facts)
                assigned.add(idx);
        }
        const missing = finalFacts.map((_, i) => i).filter(i => !assigned.has(i));
        if (missing.length > 0 && composition.branches.length > 0) {
            composition.branches[composition.branches.length - 1].facts.push(...missing);
        }
        // Convert composition → plan → timeline
        let timeline;
        let planDiagnostics;
        let timelineStats;
        try {
            const plan = buildPlanFromCompositionResult({ subjectName, facts: finalFacts, composition });
            timeline = buildTimelineDataFromBiographyPlan(plan);
            planDiagnostics = {
                source: 'facts-first',
                mainEvents: plan.mainEvents.length,
                branches: plan.branches.length,
                branchEvents: plan.branches.reduce((sum, b) => sum + b.events.length, 0),
                hasBirthDate: Boolean(plan.birthDetails?.date),
                hasBirthPlace: Boolean(plan.birthDetails?.place),
            };
            timelineStats = {
                nodes: timeline.nodes.length,
                edges: timeline.edges.length,
                hasBirthDate: Boolean(timeline.birthDetails?.date),
                hasBirthPlace: Boolean(timeline.birthDetails?.place),
            };
        }
        catch (error) {
            debugError('[biographyImport] plan/timeline conversion failed', { error });
        }
        const meta = {
            factCount: finalFacts.length,
            model: `${factsModel} -> annotation -> redaktura -> composition -> render`,
            rawTextChars: len,
            planDiagnostics,
            timelineStats,
        };
        await updateJob({
            status: 'done',
            step4: { timeline, composition, canvasName: subjectName, meta },
        });
        debugLog('[biographyImport] complete', { jobId: jobRef.id, nodes: timelineStats?.nodes });
        return {
            jobId: jobRef.id,
            subjectName,
            canvasName: subjectName,
            timeline,
            composition,
            meta,
        };
    }
    catch (error) {
        await updateJob({ status: 'error', error: error instanceof Error ? error.message : String(error) });
        throw error;
    }
}
// ============================================================================
// CLOUD FUNCTION
// ============================================================================
export const biographyImport = onRequest({
    timeoutSeconds: 3600,
    memory: '2GiB',
    region: 'europe-west1',
    secrets: ['GEMINI_API_KEY'],
}, async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Gemini-Api-Key');
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'Method not allowed' });
        return;
    }
    try {
        const { uid, email } = await verifyAuth(req);
        const sourceUrl = validateSourceUrl(req.body);
        const canvasId = typeof req.body?.canvasId === 'string' ? req.body.canvasId : '';
        // BYOK: user's key from header takes priority over server secret
        const userKey = req.headers['x-gemini-api-key'];
        const apiKey = (typeof userKey === 'string' && userKey.trim()) ? userKey.trim() : process.env.GEMINI_API_KEY;
        if (!apiKey) {
            res.status(503).json({ ok: false, error: 'GEMINI_API_KEY not configured' });
            return;
        }
        const clientJobId = typeof req.body?.jobId === 'string' ? req.body.jobId : undefined;
        const result = await runFullBiographyPipeline({ sourceUrl, apiKey, uid, userEmail: email, canvasId, jobId: clientJobId });
        res.status(200).json({
            ok: true,
            jobId: result.jobId,
            subjectName: result.subjectName,
            canvasName: result.canvasName,
            timeline: result.timeline,
            meta: result.meta,
        });
    }
    catch (error) {
        debugError('[biographyImport] handler error', error);
        const { statusCode, message } = normalizeError(error);
        res.status(statusCode).json({
            ok: false,
            error: message,
            detail: error instanceof Error ? error.message : String(error),
        });
    }
});
