import { useCallback, useEffect, useState } from 'react';
import { debugError, debugLog } from '../../../lib/debug';

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
  const [courses, setCourses] = useState<LectureCourseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/lectures?action=list');
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
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    courses,
    loading,
    error,
    refresh,
  };
}
