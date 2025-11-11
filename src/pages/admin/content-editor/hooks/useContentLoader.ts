import { useEffect, useState } from 'react';
import { getPeriod as fetchPeriod, getIntro as fetchIntro } from '../../../../lib/firestoreHelpers';
import { DEFAULT_THEME } from '../../../../theme/periods';
import type { Period } from '../types';
import { createEmptyVideoEntry, createVideoEntryFromSource } from '../utils/videoHelpers';

interface UseContentLoaderParams {
  periodId: string | undefined;
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
  setConcepts: (value: string[]) => void;
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

        setTitle(data.title || '');
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

        // Load video playlist
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

        setConcepts(data.concepts || []);
        setAuthors(data.authors || []);
        setCoreLiterature(data.core_literature || []);
        setExtraLiterature(data.extra_literature || []);
        setExtraVideos(data.extra_videos || []);
        setLeisure(data.leisure || []);
        setSelfQuestionsUrl(data.self_questions_url || '');
      } catch (error: any) {
        console.error('Error loading period', error);
        alert('Ошибка загрузки: ' + (error?.message || error));
      } finally {
        setLoading(false);
      }
    }

    loadPeriod();
  }, [periodId, placeholderDefaultEnabled, placeholderDisplayText, fallbackTitle]);

  return { period, loading };
}
