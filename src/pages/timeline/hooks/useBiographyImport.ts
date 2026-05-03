import { useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { debugError, debugLog } from '../../../lib/debug';
import { reportAppError } from '../../../lib/errorHandler';
import { buildAuthorizedHeaders } from '../../../lib/apiAuth';
import { buildGeminiApiKeyHeader, sanitizeGeminiApiKey } from '../../../lib/geminiKey';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { TimelineData } from '../types';
import type { BiographyProgressEvent } from '../components/BiographyImportModal';
import { normalizeImportedTimelineData } from '../persistence';

const CLOUD_FUNCTION_URL =
  'https://europe-west1-psych-dev-site-prod.cloudfunctions.net/biographyImport';

interface BiographyImportApplyResult {
  timeline: TimelineData;
  canvasName?: string;
  subjectName?: string;
}

interface UseBiographyImportArgs {
  /** Текущий активный canvasId, прокидывается в CF, чтобы Firestore-запись была привязана. */
  activeTimelineId: string | null;
  /** Имя активного холста — fallback для имени при импорте JSON. */
  activeTimelineName?: string;
  /**
   * Применить готовый таймлайн к активному холсту. Hook сам не знает про state-store,
   * поэтому caller передаёт apply-функцию.
   */
  applyTimeline: (result: BiographyImportApplyResult) => void;
}

export interface BiographyMeta {
  source?: string;
  model?: string;
  nodes?: number;
  edges?: number;
}

export function useBiographyImport({
  activeTimelineId,
  activeTimelineName,
  applyTimeline,
}: UseBiographyImportArgs) {
  const geminiApiKey = useAuthStore((state) => state.geminiApiKey);

  const [expanded, setExpanded] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [meta, setMeta] = useState<BiographyMeta | null>(null);
  const [progress, setProgress] = useState<BiographyProgressEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const open = useCallback(() => {
    debugLog('[Timeline] Open biography import');
    setError(null);
    setMeta(null);
    setExpanded(true);
  }, []);

  const close = useCallback(() => {
    if (loading) return;
    debugLog('[Timeline] Close biography import');
    setExpanded(false);
    setError(null);
    setSourceUrl('');
  }, [loading]);

  const handleSourceUrlChange = useCallback(
    (value: string) => {
      setSourceUrl(value);
      if (error) {
        setError(null);
      }
    },
    [error],
  );

  const submit = useCallback(async (): Promise<boolean> => {
    const trimmedUrl = sourceUrl.trim();
    const apiKeyOverride = sanitizeGeminiApiKey(geminiApiKey);
    debugLog('[Timeline] Biography import submit', {
      sourceUrl: trimmedUrl,
      activeTimelineId,
      hasGeminiApiKeyOverride: Boolean(apiKeyOverride),
    });

    if (!trimmedUrl) {
      setError('Укажите ссылку на статью Wikipedia.');
      return false;
    }

    setLoading(true);
    setError(null);
    setErrorDetail(null);
    setProgress(null);
    setMeta(null);
    flushSync(() => {
      setModalOpen(true);
    });
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    const jobId = crypto.randomUUID();
    setProgress({ step: 1, total: 6, label: 'Запуск Cloud Function...' });

    // Pipeline в CF может занять 5+ минут — fetch браузера разрывает idle TCP
    // соединения раньше. Поэтому Firestore — main source: ждём status='done'/'error'
    // в biographyJobs/{jobId}, fetch только триггерит запуск.
    const jobDocRef = doc(db, 'biographyJobs', jobId);
    let unsubscribe: () => void = () => {};

    const finalResultPromise = new Promise<{
      timeline: TimelineData;
      subjectName?: string;
      canvasName?: string;
      meta?: { model?: string; timelineStats?: { nodes?: number; edges?: number } };
    }>((resolve, reject) => {
      unsubscribe = onSnapshot(jobDocRef, (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        if (data?.progress) {
          setProgress({
            step: data.progress.step ?? 1,
            total: data.progress.total ?? 6,
            label: data.progress.label ?? 'Обработка...',
            detail: data.progress.detail,
          });
        }
        if (data?.status === 'done') {
          const step4 = data.step4 as { timeline?: TimelineData; canvasName?: string; meta?: unknown } | undefined;
          if (!step4?.timeline) {
            reject(new Error('CF завершилась без timeline в Firestore'));
            return;
          }
          resolve({
            timeline: step4.timeline,
            subjectName: data.subjectName as string | undefined,
            canvasName: step4.canvasName,
            meta: step4.meta as { model?: string; timelineStats?: { nodes?: number; edges?: number } } | undefined,
          });
        } else if (data?.status === 'error') {
          reject(new Error((data.error as string) || 'Cloud Function вернула ошибку'));
        }
      });
    });

    // Запускаем CF — fetch fire-and-forget. Network errors игнорируем,
    // так как pipeline пишет результат в Firestore сам.
    try {
      const headers = await buildAuthorizedHeaders({
        'Content-Type': 'application/json',
        ...buildGeminiApiKeyHeader(apiKeyOverride),
      });
      fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sourceUrl: trimmedUrl, canvasId: activeTimelineId ?? '', jobId }),
      }).catch((fetchErr) => {
        debugLog('[Timeline] CF fetch error (ignored, polling Firestore)', fetchErr);
      });
    } catch (authErr) {
      unsubscribe();
      const message = authErr instanceof Error ? authErr.message : 'Не удалось подготовить запрос.';
      setError(message);
      setMeta(null);
      setLoading(false);
      return false;
    }

    try {
      const result = await finalResultPromise;
      setMeta({
        model: result.meta?.model,
        nodes: result.meta?.timelineStats?.nodes,
        edges: result.meta?.timelineStats?.edges,
      });
      applyTimeline({
        timeline: result.timeline,
        canvasName: result.canvasName,
        subjectName: result.subjectName,
      });
      setExpanded(false);
      setSourceUrl('');
      debugLog('[Timeline] Biography import applied via Firestore', { jobId });
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось построить таймлайн по биографии.';
      reportAppError({
        message: 'Ошибка импорта биографии в таймлайн',
        error: err,
        context: 'useBiographyImport.submit',
      });
      setError(message);
      setErrorDetail((prev) => prev ?? (err instanceof Error ? err.message : String(err)));
      setMeta(null);
      debugError('Timeline biography import failed', { error: err, sourceUrl: trimmedUrl });
      return false;
    } finally {
      unsubscribe();
      setLoading(false);
    }
  }, [activeTimelineId, applyTimeline, geminiApiKey, sourceUrl]);

  const importTimelineJsonFile = useCallback(
    async (file: File | null): Promise<boolean> => {
      if (!file) return false;
      debugLog('[Timeline] Timeline JSON import submit', {
        fileName: file.name,
        fileSize: file.size,
      });
      setLoading(true);
      setError(null);

      try {
        const rawText = await file.text();
        const parsed = JSON.parse(rawText) as unknown;
        const normalized = normalizeImportedTimelineData(parsed);
        applyTimeline({
          timeline: normalized,
          canvasName: file.name.replace(/\.json$/i, '').trim() || activeTimelineName,
        });
        setExpanded(false);
        debugLog('[Timeline] Timeline JSON applied', {
          fileName: file.name,
          nodes: normalized.nodes.length,
          edges: normalized.edges.length,
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Не удалось загрузить JSON-файл таймлайна.';
        setError(message);
        debugError('Timeline JSON import failed', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [activeTimelineName, applyTimeline],
  );

  const closeModal = useCallback(() => setModalOpen(false), []);

  const reset = useCallback(() => {
    setExpanded(false);
    setError(null);
    setSourceUrl('');
  }, []);

  return {
    // state
    expanded,
    sourceUrl,
    loading,
    error,
    errorDetail,
    meta,
    progress,
    modalOpen,
    // actions
    open,
    close,
    handleSourceUrlChange,
    submit,
    importTimelineJsonFile,
    closeModal,
    reset,
  };
}
