import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LoginModal from '../../../components/LoginModal';
import { useNotes } from '../../../hooks/useNotes';
import { debugError } from '../../../lib/debug';
import {
  buildLectureContentFromSegments,
  normalizeLectureNoteSegments,
  type LectureNoteDraft,
  type LectureNoteSegment,
} from '../../../types/notes';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { StudyVideoPlaybackSnapshot } from './StudyVideoPlayer';
import { LectureNoteSegmentsEditor } from './LectureNoteSegmentsEditor';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useTimestampedLectureDraft } from '../hooks/useTimestampedLectureDraft';

interface VideoStudyNotesPanelProps {
  courseId: string;
  draft: LectureNoteDraft;
  getPlaybackSnapshot?: () => StudyVideoPlaybackSnapshot;
  lectureResourceId: string;
  onDraftChange: (draft: LectureNoteDraft) => void;
  /** Статус автосейва рендерится в строке вкладок оверлея, а не в панели. */
  onSaveStatusChange?: (status: LectureNoteSaveStatus) => void;
  onTimestampClick: (startMs: number) => void;
  periodId: string;
  periodTitle: string;
  showTimestamps: boolean;
  videoTitle: string;
  /** Сегменты с отправленным вопросом «?» (id → горит постоянно). */
  questionedSegmentIds?: ReadonlySet<string>;
  /** Тоггл вопроса-снапшота по абзацу; не передан — «?» скрыты (гость). */
  onToggleSegmentQuestion?: (segment: LectureNoteSegment) => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export type LectureNoteSaveStatus =
  | 'signed-out'
  | 'idle'
  | 'saving'
  | 'saved'
  | 'dirty'
  | 'error';

export function VideoStudyNotesPanel({
  courseId,
  draft,
  getPlaybackSnapshot,
  lectureResourceId,
  onDraftChange,
  onSaveStatusChange,
  onTimestampClick,
  periodId,
  periodTitle,
  showTimestamps,
  videoTitle,
  questionedSegmentIds,
  onToggleSegmentQuestion,
}: VideoStudyNotesPanelProps) {
  const user = useAuthStore((state) => state.user);
  const { getLectureNote, upsertLectureNote } = useNotes(undefined, { subscribe: false });
  const lectureContext = useMemo(
    () => ({
      courseId,
      periodId,
      periodTitle: periodTitle.trim() || videoTitle,
      lectureTitle: videoTitle,
      lectureVideoId: lectureResourceId,
    }),
    [courseId, lectureResourceId, periodId, periodTitle, videoTitle]
  );

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const isDesktop = useIsDesktop();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    composer,
    finalizeComposer,
    persistedSegments,
    plainText,
    resetDraft,
    segments,
    updateComposerText,
    updateSegmentText,
    removeEmptySegment,
  } = useTimestampedLectureDraft({
    getPlaybackSnapshot,
    initialSegments: draft.segments,
  });
  const persistedSignature = useMemo(
    () => JSON.stringify(persistedSegments),
    [persistedSegments]
  );
  const hasContent = persistedSegments.length > 0;
  // Сигнатура последнего сейва живёт и в state (isDirty должен пересчитаться
  // рендером после сейва — setSaveState('saved') бэйлится, если значение не
  // менялось), и в ref — для чтения из колбэков без устаревших замыканий.
  const [lastSavedSignature, setLastSavedSignature] = useState(persistedSignature);
  const lastSavedSignatureRef = useRef(persistedSignature);
  const markSavedSignature = useCallback((signature: string) => {
    lastSavedSignatureRef.current = signature;
    setLastSavedSignature(signature);
  }, []);
  const isDirty = persistedSignature !== lastSavedSignature;
  // Последняя версия черновика, известная панели (локальные правки либо прокинутый prop).
  const latestDraftRef = useRef<LectureNoteDraft>(draft);
  const lastPublishedSignatureRef = useRef(persistedSignature);

  useEffect(() => {
    if (lastPublishedSignatureRef.current === persistedSignature) {
      return;
    }

    lastPublishedSignatureRef.current = persistedSignature;
    latestDraftRef.current = { segments: persistedSegments, updatedAtMs: Date.now() };
    onDraftChange(latestDraftRef.current);
  }, [onDraftChange, persistedSegments, persistedSignature]);

  const saveLectureNote = useCallback(
    async (
      nextContent: string,
      nextSegments: LectureNoteSegment[],
      options?: { silent?: boolean }
    ) => {
      if (!user) {
        return false;
      }

      if (!nextContent.trim() && lastSavedSignatureRef.current === '[]') {
        return false;
      }

      if (!options?.silent) {
        setSaveState('saving');
      }

      try {
        await upsertLectureNote(nextContent, lectureContext, {
          lectureSegments: nextSegments,
        });
        markSavedSignature(JSON.stringify(nextSegments));

        if (!options?.silent) {
          setSaveState(nextSegments.length > 0 ? 'saved' : 'idle');
        }

        return true;
      } catch (error) {
        debugError('[VideoStudyNotesPanel] Failed to save note', error);
        if (!options?.silent) {
          setSaveState('error');
        }
        return false;
      }
    },
    [lectureContext, markSavedSignature, upsertLectureNote, user]
  );

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setIsHydrating(false);
      setSaveState('idle');
      return undefined;
    }

    const loadSavedNote = async () => {
      setIsHydrating(true);
      try {
        const note = await getLectureNote(lectureContext);
        if (cancelled) {
          return;
        }

        const savedSegments = normalizeLectureNoteSegments(
          note?.lectureSegments,
          note?.content ?? ''
        );
        const savedSignature = JSON.stringify(savedSegments);
        markSavedSignature(savedSignature);

        // Локальный черновик побеждает, если он публиковался в этой сессии
        // (updatedAtMs выставлен) и реально отличается от сохранённой версии;
        // он станет dirty и уедет на сервер обычным автосейвом. Сознательно
        // НЕ сравниваем клиентские часы с серверным updatedAt: skew в пару
        // минут давал ложное «сервер новее» и тихо стирал свеженабранный
        // текст. Черновик живёт только в памяти вкладки, так что проиграть
        // он может лишь параллельной правке из другой вкладки — в этом
        // конфликте выбираем сохранность набранного ввода.
        const localDraft = latestDraftRef.current;
        const draftIsNewer =
          localDraft.updatedAtMs !== null &&
          JSON.stringify(localDraft.segments) !== savedSignature;

        if (!draftIsNewer) {
          resetDraft(savedSegments);
        }

        setSaveState(savedSegments.length > 0 ? 'saved' : 'idle');
      } catch (error) {
        debugError('[VideoStudyNotesPanel] Failed to load note', error);
        if (!cancelled) {
          setSaveState('error');
        }
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    };

    void loadSavedNote();

    return () => {
      cancelled = true;
    };
  }, [getLectureNote, lectureContext, markSavedSignature, resetDraft, user]);

  useEffect(() => {
    if (!user || isHydrating) {
      return undefined;
    }

    if (!isDirty) {
      setSaveState(hasContent ? 'saved' : 'idle');
      return undefined;
    }

    if (!plainText.trim() && lastSavedSignatureRef.current === '[]') {
      setSaveState('idle');
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void saveLectureNote(plainText, persistedSegments);
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    hasContent,
    isDirty,
    isHydrating,
    persistedSegments,
    plainText,
    saveLectureNote,
    user,
  ]);

  // При открытии/после гидрации показываем конец конспекта (там идёт запись).
  useEffect(() => {
    if (isHydrating || !scrollContainerRef.current) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isHydrating]);

  // Во время набора подскролливаем вниз только если пользователь и так у низа:
  // если он отмотал вверх перечитать конспект, ввод не должен выдёргивать его вниз.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !composer.text) {
      return undefined;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom > 120) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      const current = scrollContainerRef.current;
      if (current) {
        current.scrollTop = current.scrollHeight;
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [composer.text]);

  // Актуальные значения для финального сохранения: cleanup ниже намеренно
  // зарегистрирован с пустыми deps, чтобы срабатывать строго при размонтировании,
  // а не при каждой смене user/lectureContext.
  const unmountStateRef = useRef({ isHydrating, persistedSegments, saveLectureNote, user });
  useEffect(() => {
    unmountStateRef.current = { isHydrating, persistedSegments, saveLectureNote, user };
  });

  useEffect(() => {
    return () => {
      const { isHydrating: hydrating, persistedSegments: segments, saveLectureNote: save, user: currentUser } =
        unmountStateRef.current;

      if (
        !currentUser ||
        hydrating ||
        JSON.stringify(segments) === lastSavedSignatureRef.current ||
        (!segments.length && lastSavedSignatureRef.current === '[]')
      ) {
        return;
      }

      void save(buildLectureContentFromSegments(segments), segments, { silent: true });
    };
  }, []);

  useEffect(() => {
    if (!onSaveStatusChange) {
      return;
    }

    onSaveStatusChange(
      !user
        ? 'signed-out'
        : saveState === 'saving'
        ? 'saving'
        : saveState === 'error'
        ? 'error'
        : isDirty
        ? 'dirty'
        : hasContent
        ? 'saved'
        : 'idle'
    );
  }, [hasContent, isDirty, onSaveStatusChange, saveState, user]);

  return (
    <>
      <aside className="flex h-full min-h-0 flex-col px-4 py-4 text-white lg:px-5 lg:py-5">
        {!user ? (
          <div className="mb-4 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Войти
            </button>
          </div>
        ) : null}

        <div className="flex-1 min-h-0">
          <div className="relative h-full min-h-[18rem] rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4">
            <div ref={scrollContainerRef} className="h-full overflow-y-auto pr-2 pt-1">
              {!hasContent && !composer.text ? (
                isDesktop ? (
                  <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-5 text-white/50">
                    <p>Пишите тезисы по ходу лекции. Enter закрывает абзац, Shift+Enter — перенос строки.</p>
                    <p className="mt-1">
                      Каждый абзац привязывается к моменту видео — включите «Таймкоды в конспекте» в настройках ⚙ и кликните по метке, чтобы перемотать.
                    </p>
                  </div>
                ) : (
                  <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-5 text-white/50">
                    Конспект пока пуст. Набор конспекта доступен на компьютере.
                  </p>
                )
              ) : null}
              <LectureNoteSegmentsEditor
                composer={composer}
                onComposerChange={updateComposerText}
                onComposerSubmit={finalizeComposer}
                onSegmentBlur={removeEmptySegment}
                onSegmentChange={updateSegmentText}
                onTimestampClick={onTimestampClick}
                segments={segments}
                showTimestamps={showTimestamps}
                showComposer={isDesktop}
                questionedSegmentIds={questionedSegmentIds}
                onToggleSegmentQuestion={onToggleSegmentQuestion}
              />
            </div>
          </div>
        </div>

        {/* Видимый статус: цветной точки недостаточно — на таче и с клавиатуры
            hover-тултип недоступен, а потеря автосейва должна быть заметна. */}
        <p
          aria-live="polite"
          className={`mt-2 min-h-[1.25rem] text-xs leading-5 ${
            saveState === 'error' ? 'text-rose-300' : 'text-white/45'
          }`}
        >
          {!user
            ? 'Войдите, чтобы сохранять конспект'
            : saveState === 'error'
            ? 'Ошибка сохранения — последние правки не сохранены'
            : saveState === 'saving'
            ? 'Сохранение…'
            : ''}
        </p>
      </aside>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
