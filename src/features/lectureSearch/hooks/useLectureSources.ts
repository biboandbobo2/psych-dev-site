import { useCallback, useEffect, useState } from 'react';
import { buildAuthorizedHeaders } from '../../../lib/apiAuth';
import { debugError, debugLog } from '../../../lib/debug';
import { useAuthStore } from '../../../stores/useAuthStore';

export interface LectureSourceItem {
  lectureKey: string;
  youtubeVideoId: string;
  courseId: string;
  periodId: string;
  periodTitle: string;
  lectureTitle: string;
  chunkCount: number;
  durationMs: number | null;
}

export interface LectureCourseGroup {
  courseId: string;
  lectures: LectureSourceItem[];
}

interface UseLectureSourcesResult {
  courses: LectureCourseGroup[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLectureSources(): UseLectureSourcesResult {
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const [courses, setCourses] = useState<LectureCourseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setCourses([]);
      setLoading(false);
      setError('Нужно войти в аккаунт, чтобы работать с лекциями');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = await buildAuthorizedHeaders();
      const res = await fetch('/api/lectures?action=list', { headers });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Не удалось загрузить список лекций');
      }

      setCourses(data.courses || []);
      debugLog('[useLectureSources] Loaded courses:', data.courses?.length ?? 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить список лекций';
      setError(message);
      debugError('[useLectureSources] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    refresh();
  }, [authLoading, refresh]);

  return {
    courses,
    loading,
    error,
    refresh,
  };
}
