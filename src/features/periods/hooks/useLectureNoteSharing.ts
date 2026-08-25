import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { LectureNoteVisibility } from '../../../types/notes';

interface UseLectureNoteSharingOptions {
  lectureKey: string | null;
  /** Целевая группа для visibility='group' (первая учебная группа). */
  targetGroupId: string | null;
}

export interface LectureNoteShare {
  visibility: LectureNoteVisibility;
  groupId: string | null;
  authorName: string | null;
}

/**
 * Настройка «мой конспект видят» из шестерёнки оверлея. Значение живёт в самой
 * заметке; приоритет: выбор в сессии > загруженная заметка > дефолт аккаунта
 * (users/{uid}.studyDefaults.noteVisibility) > 'private'. Без группы выбор
 * «группа и лекторы» деградирует до «только лекторы» (как у вопросов).
 */
export function useLectureNoteSharing({
  lectureKey,
  targetGroupId,
}: UseLectureNoteSharingOptions) {
  const user = useAuthStore((state) => state.user);
  const accountDefault = useAuthStore((state) => state.studyNoteDefaultVisibility);

  const [loadedVisibility, setLoadedVisibility] = useState<LectureNoteVisibility | null>(null);
  const [override, setOverride] = useState<LectureNoteVisibility | null>(null);

  useEffect(() => {
    setLoadedVisibility(null);
    setOverride(null);
  }, [lectureKey]);

  const selectedVisibility: LectureNoteVisibility =
    override ?? loadedVisibility ?? accountDefault ?? 'private';
  const noteVisibility: LectureNoteVisibility =
    selectedVisibility === 'group' && !targetGroupId ? 'lecturers' : selectedVisibility;

  /** Панель конспекта репортит видимость загруженной заметки (null — заметки нет). */
  const onNoteVisibilityLoaded = useCallback((value: LectureNoteVisibility | null) => {
    setLoadedVisibility(value);
  }, []);

  const noteShare = useMemo<LectureNoteShare | undefined>(() => {
    if (!user) {
      return undefined;
    }

    return {
      visibility: noteVisibility,
      groupId: noteVisibility === 'group' ? targetGroupId : null,
      authorName: user.displayName ?? null,
    };
  }, [noteVisibility, targetGroupId, user]);

  return {
    noteVisibility,
    setNoteVisibility: setOverride,
    onNoteVisibilityLoaded,
    noteShare,
  };
}
