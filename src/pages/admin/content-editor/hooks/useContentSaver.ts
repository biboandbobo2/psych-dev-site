import { useState } from 'react';
import { doc, setDoc, deleteDoc, deleteField, serverTimestamp, collection, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import type { VideoFormEntry } from '../types';
import {
  normalizeConcepts,
  normalizeAuthors,
  normalizeLiterature,
  normalizeVideos,
} from '../utils/contentNormalizers';

interface SaveParams {
  periodId: string | undefined;
  title: string;
  subtitle: string;
  published: boolean;
  order: number;
  accent: string;
  accent100: string;
  placeholderEnabled: boolean;
  normalizedPlaceholderText: string;
  videos: VideoFormEntry[];
  concepts: string[];
  authors: Array<{ name: string; url?: string }>;
  coreLiterature: Array<{ title: string; url: string }>;
  extraLiterature: Array<{ title: string; url: string }>;
  extraVideos: Array<{ title: string; url: string }>;
  selfQuestionsUrl: string;
}

/**
 * Hook for saving and deleting content
 */
export function useContentSaver(onNavigate: () => void) {
  const [saving, setSaving] = useState(false);

  const handleSave = async (params: SaveParams) => {
    const {
      periodId,
      title,
      subtitle,
      published,
      order,
      accent,
      accent100,
      placeholderEnabled,
      normalizedPlaceholderText,
      videos,
      concepts,
      authors,
      coreLiterature,
      extraLiterature,
      extraVideos,
      selfQuestionsUrl,
    } = params;

    if (!title.trim()) {
      alert('Название обязательно!');
      return;
    }

    try {
      setSaving(true);

      const normalizedConcepts = normalizeConcepts(concepts);
      const normalizedAuthors = normalizeAuthors(authors);
      const normalizedCoreLiterature = normalizeLiterature(coreLiterature);
      const normalizedExtraLiterature = normalizeLiterature(extraLiterature);
      const normalizedExtraVideos = normalizeLiterature(extraVideos);

      const trimmedTitle = title.trim();
      const normalizedVideos = normalizeVideos(videos);
      const trimmedSelfQuestionsUrl = selfQuestionsUrl.trim();

      const data: Record<string, unknown> = {
        period: periodId,
        title: trimmedTitle,
        published,
        order,
        accent,
        accent100,
        placeholder_enabled: placeholderEnabled,
        concepts: normalizedConcepts,
        authors: normalizedAuthors,
        core_literature: normalizedCoreLiterature,
        extra_literature: normalizedExtraLiterature,
        extra_videos: normalizedExtraVideos,
        status: published ? 'published' : 'draft',
        updatedAt: serverTimestamp(),
      };

      if (placeholderEnabled && normalizedPlaceholderText.length) {
        data.placeholder = normalizedPlaceholderText;
        data.placeholder_text = normalizedPlaceholderText;
        data.placeholderText = normalizedPlaceholderText;
      } else {
        data.placeholder = deleteField();
        data.placeholder_text = deleteField();
        data.placeholderText = deleteField();
      }

      const primaryVideo = normalizedVideos[0];

      data.video_url = primaryVideo?.url ? primaryVideo.url : deleteField();
      data.deck_url = primaryVideo?.deckUrl ? primaryVideo.deckUrl : deleteField();
      data.audio_url = primaryVideo?.audioUrl ? primaryVideo.audioUrl : deleteField();
      data.self_questions_url = trimmedSelfQuestionsUrl ? trimmedSelfQuestionsUrl : deleteField();

      const trimmedSubtitle = subtitle.trim();
      data.subtitle = trimmedSubtitle ? trimmedSubtitle : deleteField();

      if (normalizedVideos.length) {
        data.video_playlist = normalizedVideos.map((video) => ({
          title: video.title || trimmedTitle || 'Видео-лекция',
          url: video.url,
          ...(video.deckUrl ? { deckUrl: video.deckUrl } : {}),
          ...(video.audioUrl ? { audioUrl: video.audioUrl } : {}),
        }));
      } else {
        data.video_playlist = deleteField();
      }

      if (periodId === 'intro') {
        const singletonRef = doc(db, 'intro', 'singleton');
        const singletonSnap = await getDoc(singletonRef);
        if (singletonSnap.exists()) {
          await setDoc(singletonRef, data, { merge: true });
        } else {
          const introCol = collection(db, 'intro');
          const introSnap = await getDocs(introCol);
          if (!introSnap.empty) {
            await setDoc(introSnap.docs[0].ref, data, { merge: true });
          } else {
            await setDoc(singletonRef, data, { merge: true });
          }
        }
      } else {
        const docRef = doc(db, 'periods', periodId!);
        await setDoc(docRef, data, { merge: true });
      }

      alert('✅ Изменения сохранены!');
      onNavigate();
    } catch (error: any) {
      console.error('Error saving:', error);
      alert('❌ Ошибка сохранения: ' + (error?.message || error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (periodId: string | undefined, title: string) => {
    if (periodId === 'intro') {
      alert('⚠️ Вводное занятие нельзя удалить, только редактировать.');
      return;
    }

    const confirmed = window.confirm(
      `Вы уверены что хотите удалить период "${title}"?\n\n` + 'Это действие нельзя отменить!'
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      const docRef = doc(db, 'periods', periodId!);
      await deleteDoc(docRef);
      alert('🗑️ Период удалён');
      onNavigate();
    } catch (error: any) {
      console.error('Error deleting:', error);
      alert('❌ Ошибка удаления: ' + (error?.message || error));
    } finally {
      setSaving(false);
    }
  };

  return { saving, handleSave, handleDelete };
}
