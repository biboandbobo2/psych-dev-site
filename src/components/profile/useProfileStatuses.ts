import { useEffect, useState } from 'react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { debugError } from '../../lib/debug';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCourses } from '../../hooks/useCourses';
import { useMyGroups } from '../../hooks/useMyGroups';
import { useContinueCourses } from '../../hooks/useContinueCourses';
import { pluralizeRu } from '../../pages/timeline/utils';

export interface ProfileStatuses {
  history: string | null;
  courses: string | null;
  study: string;
  aiConnected: boolean;
}

/** Короткие статусы под пунктами меню профиля. */
export function useProfileStatuses(): ProfileStatuses {
  const user = useAuthStore((s) => s.user);
  const geminiKey = useAuthStore((s) => s.geminiApiKey);
  const questionsDefault = useAuthStore((s) => s.studyQuestionsDefaultVisibility);
  const { courses } = useCourses();
  const { groups } = useMyGroups(Boolean(user));
  const { resolution } = useContinueCourses(courses, groups);
  const [historyCount, setHistoryCount] = useState<number | null>(null);

  // Только число записей: сама история тяжёлая (ответы AI), её грузит раздел.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getCountFromServer(query(collection(db, 'searchHistory'), where('userId', '==', user.uid)))
      .then((snap) => !cancelled && setHistoryCount(snap.data().count))
      .catch((error) => debugError('[useProfileStatuses] history count failed', error));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const coursesCount = resolution.isFallback ? 0 : resolution.ids.length;

  return {
    history:
      historyCount === null
        ? null
        : historyCount === 0
          ? 'Пока пусто'
          : `${historyCount} ${pluralizeRu(historyCount, ['запрос', 'запроса', 'запросов'])}`,
    courses: coursesCount ? `${coursesCount} ${pluralizeRu(coursesCount, ['курс', 'курса', 'курсов'])}` : null,
    study: (questionsDefault ?? 'group') === 'group' ? 'Вопросы видит группа' : 'Вопросы видят лекторы',
    aiConnected: Boolean(geminiKey),
  };
}
