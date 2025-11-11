import { useState } from 'react';
import type { VideoFormEntry } from '../types';
import { DEFAULT_THEME } from '../../../../theme/periods';

/**
 * Hook for managing content editor form state
 */
export function useContentForm(placeholderDefaultEnabled: boolean) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [published, setPublished] = useState(true);
  const [order, setOrder] = useState(0);
  const [accent, setAccent] = useState(DEFAULT_THEME.accent);
  const [accent100, setAccent100] = useState(DEFAULT_THEME.accent100);
  const [placeholderEnabled, setPlaceholderEnabled] = useState(placeholderDefaultEnabled);
  const [videos, setVideos] = useState<VideoFormEntry[]>([]);
  const [concepts, setConcepts] = useState<string[]>([]);
  const [authors, setAuthors] = useState<Array<{ name: string; url?: string }>>([]);
  const [coreLiterature, setCoreLiterature] = useState<Array<{ title: string; url: string }>>([]);
  const [extraLiterature, setExtraLiterature] = useState<Array<{ title: string; url: string }>>([]);
  const [extraVideos, setExtraVideos] = useState<Array<{ title: string; url: string }>>([]);
  const [leisure, setLeisure] = useState<Array<{ title?: string; url?: string; type?: string; year?: string }>>([]);
  const [selfQuestionsUrl, setSelfQuestionsUrl] = useState('');

  return {
    // State values
    title,
    subtitle,
    published,
    order,
    accent,
    accent100,
    placeholderEnabled,
    videos,
    concepts,
    authors,
    coreLiterature,
    extraLiterature,
    extraVideos,
    leisure,
    selfQuestionsUrl,

    // Setters
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
  };
}
