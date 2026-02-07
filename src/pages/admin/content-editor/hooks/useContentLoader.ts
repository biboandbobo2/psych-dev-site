import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { getPeriod as fetchPeriod, getIntro as fetchIntro } from '../../../../lib/firestoreHelpers';
import { DEFAULT_THEME } from '../../../../theme/periods';
import type { Period } from '../types';
import { createEmptyVideoEntry, createVideoEntryFromSource } from '../utils/videoHelpers';
import { debugError } from '../../../../lib/debug';
import { getCourseLessonDocRef } from '../../../../lib/courseLessons';
import { isCoreCourse } from '../../../../constants/courses';
import type { CourseType } from '../../../../types/tests';

interface UseContentLoaderParams {
  periodId: string | undefined;
  course: CourseType;
  placeholderDefaultEnabled: boolean;
  placeholderDisplayText: string;
  fallbackTitle: string;
  setTitle: (value: string) => void;
  setSubtitle: (value: string) => void;
  setPublished: (value: boolean) => void;
  setOrder: (value: number) => void;
  setAccent: (value: string) => void;
  setAccent100: (value: string) => void;
  setPlaceholderEnabled: (value: boolean) => void;
  setVideos: (value: any[]) => void;
  setConcepts: (value: Array<{ name: string; url?: string }>) => void;
  setAuthors: (value: Array<{ name: string; url?: string }>) => void;
  setCoreLiterature: (value: Array<{ title: string; url: string }>) => void;
  setExtraLiterature: (value: Array<{ title: string; url: string }>) => void;
  setExtraVideos: (value: Array<{ title: string; url: string }>) => void;
  setLeisure: (value: Array<{ title?: string; url?: string; type?: string; year?: string }>) => void;
  setSelfQuestionsUrl: (value: string) => void;
}

/**
 * Hook for loading period content from Firestore
 */
export function useContentLoader(params: UseContentLoaderParams) {
  const {
    periodId,
    course,
    placeholderDefaultEnabled,
    placeholderDisplayText,
    fallbackTitle,
    setTitle,
    setSubtitle,
    setPublished,
    setOrder,
    setAccent,
    setAccent100,
    setPlaceholderEnabled,
    setVideos,
    setConcepts,
    setAuthors,
    setCoreLiterature,
    setExtraLiterature,
    setExtraVideos,
    setLeisure,
    setSelfQuestionsUrl,
  } = params;

  const [period, setPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPeriod() {
      if (!periodId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let data: Period | null = null;

        // Для курса клинической психологии используем коллекцию clinical-topics
        if (course === 'clinical') {
          const collectionName = 'clinical-topics';
          const docRef = doc(db, collectionName, periodId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            data = {
              ...(docSnap.data() as any),
              period: periodId,
            } as Period;
          }
        } else if (course === 'general') {
          // Для курса общей психологии используем коллекцию general-topics
          const collectionName = 'general-topics';
          const docRef = doc(db, collectionName, periodId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            data = {
              ...(docSnap.data() as any),
              period: periodId,
            } as Period;
          }
        } else if (isCoreCourse(course)) {
          // Для курса психологии развития используем periods
          if (periodId === 'intro') {
            const intro = await fetchPeriod('intro');
            if (intro) {
              data = intro as Period;
            } else {
              const legacyIntro = await fetchIntro();
              if (legacyIntro) {
                data = legacyIntro as Period;
              }
            }
          } else {
            const fetched = await fetchPeriod(periodId);
            if (fetched) {
              data = fetched as Period;
            }
          }
        } else {
          const docRef = getCourseLessonDocRef(course, periodId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            data = {
              ...(docSnap.data() as any),
              period: periodId,
            } as Period;
          }
        }

        if (!data) {
          const safeTitle =
            (typeof fallbackTitle === 'string' && fallbackTitle.trim()) ||
            placeholderDisplayText ||
            'Новый период';
          const fallbackPeriod: Period = {
            period: periodId,
            title: safeTitle,
            subtitle: '',
            concepts: [],
            authors: [],
            core_literature: [],
            extra_literature: [],
            extra_videos: [],
            leisure: [],
            published: false,
            order: 0,
            accent: DEFAULT_THEME.accent,
            accent100: DEFAULT_THEME.accent100,
          };

          setPeriod(fallbackPeriod);
          setTitle(fallbackPeriod.title);
          setSubtitle('');
          setPublished(false);
          setOrder(0);
          setAccent(DEFAULT_THEME.accent);
          setAccent100(DEFAULT_THEME.accent100);
          setPlaceholderEnabled(placeholderDefaultEnabled);
          setVideos([createEmptyVideoEntry(0, safeTitle)]);
          setConcepts([]);
          setAuthors([]);
          setCoreLiterature([]);
          setExtraLiterature([]);
          setExtraVideos([]);
          setLeisure([]);
          setSelfQuestionsUrl('');
          return;
        }

        setPeriod(data);

        setTitle(data.title || data.label || '');
        setSubtitle(data.subtitle || '');
        setPublished(data.published ?? true);
        setOrder(typeof data.order === 'number' ? data.order : 0);
        setAccent(data.accent || DEFAULT_THEME.accent);
        setAccent100(data.accent100 || DEFAULT_THEME.accent100);
        setPlaceholderEnabled(
          typeof data.placeholder_enabled === 'boolean'
            ? data.placeholder_enabled
            : placeholderDefaultEnabled
        );

        // === LOAD CONTENT (Support both Legacy and Sections) ===

        // 1. Try to load from sections (New Format)
        const sections = data.sections || {};
        const hasSections = Object.keys(sections).length > 0;

        if (hasSections) {
          // Video Section
          const videoSection = sections.video_section || sections.video;
          if (videoSection && Array.isArray(videoSection.content)) {
            setVideos(
              videoSection.content.map((entry: any, index: number) =>
                createVideoEntryFromSource(entry, index, data.title || placeholderDisplayText)
              )
            );
          } else {
            setVideos([createEmptyVideoEntry(0, data.title || placeholderDisplayText)]);
          }

          // Concepts (backward compat: strings → { name })
          const conceptsSection = sections.concepts;
          if (conceptsSection && Array.isArray(conceptsSection.content)) {
            setConcepts(
              conceptsSection.content.map((item: any) =>
                typeof item === 'string' ? { name: item } : item
              )
            );
          } else {
            setConcepts([]);
          }

          // Authors
          const authorsSection = sections.authors;
          if (authorsSection && Array.isArray(authorsSection.content)) {
            setAuthors(authorsSection.content);
          } else {
            setAuthors([]);
          }

          // Core Literature
          const coreLitSection = sections.core_literature;
          if (coreLitSection && Array.isArray(coreLitSection.content)) {
            setCoreLiterature(coreLitSection.content);
          } else {
            setCoreLiterature([]);
          }

          // Extra Literature
          const extraLitSection = sections.extra_literature;
          if (extraLitSection && Array.isArray(extraLitSection.content)) {
            setExtraLiterature(extraLitSection.content);
          } else {
            setExtraLiterature([]);
          }

          // Extra Videos
          const extraVidSection = sections.extra_videos;
          if (extraVidSection && Array.isArray(extraVidSection.content)) {
            setExtraVideos(extraVidSection.content);
          } else {
            setExtraVideos([]);
          }

          // Leisure
          const leisureSection = sections.leisure;
          if (leisureSection && Array.isArray(leisureSection.content)) {
            setLeisure(leisureSection.content);
          } else {
            setLeisure([]);
          }

          // Self Questions
          const selfQSection = sections.self_questions;
          if (selfQSection && Array.isArray(selfQSection.content) && selfQSection.content[0]) {
            setSelfQuestionsUrl(selfQSection.content[0]);
          } else {
            setSelfQuestionsUrl('');
          }

        } else {
          // 2. Fallback to Legacy Fields
          const playlist = Array.isArray(data.video_playlist) ? data.video_playlist : [];
          if (playlist.length) {
            setVideos(
              playlist.map((entry, index) =>
                createVideoEntryFromSource(entry, index, data.title || placeholderDisplayText)
              )
            );
          } else {
            const fallbackVideoUrl =
              (typeof data.video_url === 'string' && data.video_url.trim()) ||
              (typeof (data as any).videoUrl === 'string' && (data as any).videoUrl.trim()) ||
              '';

            if (fallbackVideoUrl) {
              setVideos([
                createVideoEntryFromSource(
                  {
                    title: data.title,
                    url: fallbackVideoUrl,
                    deckUrl: data.deck_url || (data as any).deckUrl,
                    audioUrl: data.audio_url || (data as any).audioUrl,
                  },
                  0,
                  data.title || placeholderDisplayText
                ),
              ]);
            } else {
              setVideos([createEmptyVideoEntry(0, data.title || placeholderDisplayText)]);
            }
          }

          setConcepts(
            (data.concepts || []).map((item: any) =>
              typeof item === 'string' ? { name: item } : item
            )
          );
          setAuthors(data.authors || []);
          setCoreLiterature(data.core_literature || []);
          setExtraLiterature(data.extra_literature || []);
          setExtraVideos(data.extra_videos || []);
          setLeisure(data.leisure || []);
          setSelfQuestionsUrl(data.self_questions_url || '');
        }
      } catch (error: any) {
        debugError('Error loading period', error);
        alert('Ошибка загрузки: ' + (error?.message || error));
      } finally {
        setLoading(false);
      }
    }

    loadPeriod();
  }, [periodId, course, placeholderDefaultEnabled, placeholderDisplayText, fallbackTitle]);

  return { period, loading };
}
