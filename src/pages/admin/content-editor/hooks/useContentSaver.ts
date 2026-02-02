import { useState } from 'react';
import { doc, setDoc, deleteDoc, deleteField, serverTimestamp, collection, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import type { VideoFormEntry } from '../types';
import {
  normalizeConcepts,
  normalizeAuthors,
  normalizeLiterature,
  normalizeVideos,
  normalizeLeisure,
} from '../utils/contentNormalizers';
import { debugError } from '../../../../lib/debug';
import { getCourseLessonDocRef } from '../../../../lib/courseLessons';
import { isCoreCourse } from '../../../../constants/courses';
import type { CourseType } from '../../../../types/tests';

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
  leisure: Array<{ title?: string; url?: string; type?: string; year?: string }>;
  selfQuestionsUrl: string;
}

/**
 * Hook for saving and deleting content
 */
export function useContentSaver(onNavigate: () => void, course: CourseType = 'development') {
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
      leisure,
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
      const normalizedLeisure = normalizeLeisure(leisure);

      const trimmedTitle = title.trim();
      const normalizedVideos = normalizeVideos(videos);
      const trimmedSelfQuestionsUrl = selfQuestionsUrl.trim();

      const data: Record<string, unknown> = {
        period: periodId,
        title: trimmedTitle,
        label: trimmedTitle,
        published,
        order,
        accent,
        accent100,
        placeholder_enabled: placeholderEnabled,
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

      // Explicitly delete legacy camelCase field to prevent conflicts
      data.placeholderEnabled = deleteField();

      // === SECTIONS CONSTRUCTION (New Format) ===
      const sections: Record<string, any> = {};

      // Video Section
      if (normalizedVideos.length) {
        sections.video_section = {
          title: 'Видео',
          content: normalizedVideos.map((video) => ({
            title: video.title || trimmedTitle || 'Видео-лекция',
            url: video.url,
            ...(video.deckUrl ? { deckUrl: video.deckUrl } : {}),
            ...(video.audioUrl ? { audioUrl: video.audioUrl } : {}),
            ...(video.isPublic ? { isPublic: true } : {}),
          })),
        };
      }

      // Concepts
      if (normalizedConcepts.length) {
        sections.concepts = {
          title: 'Основные понятия',
          content: normalizedConcepts,
        };
      }

      // Authors
      if (normalizedAuthors.length) {
        sections.authors = {
          title: 'Персоналии',
          content: normalizedAuthors,
        };
      }

      // Core Literature
      if (normalizedCoreLiterature.length) {
        sections.core_literature = {
          title: 'Основная литература',
          content: normalizedCoreLiterature,
        };
      }

      // Extra Literature
      if (normalizedExtraLiterature.length) {
        sections.extra_literature = {
          title: 'Дополнительная литература',
          content: normalizedExtraLiterature,
        };
      }

      // Extra Videos
      if (normalizedExtraVideos.length) {
        sections.extra_videos = {
          title: 'Дополнительные видео',
          content: normalizedExtraVideos,
        };
      }

      // Leisure
      if (normalizedLeisure.length) {
        sections.leisure = {
          title: 'Досуг',
          content: normalizedLeisure,
        };
      }

      // Self Questions
      if (trimmedSelfQuestionsUrl) {
        sections.self_questions = {
          title: 'Вопросы для самопроверки',
          content: [trimmedSelfQuestionsUrl],
        };
      }

      data.sections = sections;

      // === LEGACY FIELDS CLEANUP ===
      // We delete legacy fields to avoid confusion and force usage of sections
      data.video_url = deleteField();
      data.deck_url = deleteField();
      data.audio_url = deleteField();
      data.self_questions_url = deleteField();
      data.video_playlist = deleteField();
      data.concepts = deleteField();
      data.authors = deleteField();
      data.core_literature = deleteField();
      data.extra_literature = deleteField();
      data.extra_videos = deleteField();
      data.leisure = deleteField();

      const trimmedSubtitle = subtitle.trim();
      data.subtitle = trimmedSubtitle ? trimmedSubtitle : deleteField();

      // Определяем коллекцию в зависимости от курса
      if (course === 'clinical') {
        // Для клинической психологии используем коллекцию clinical-topics
        const docRef = doc(db, 'clinical-topics', periodId!);
        await setDoc(docRef, data, { merge: true });
      } else if (course === 'general') {
        // Для общей психологии используем коллекцию general-topics
        const docRef = doc(db, 'general-topics', periodId!);
        await setDoc(docRef, data, { merge: true });
      } else if (isCoreCourse(course)) {
        // Для психологии развития используем periods и intro
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
      } else {
        data.courseId = course;
        const docRef = getCourseLessonDocRef(course, periodId!);
        await setDoc(docRef, data, { merge: true });
      }

      alert('✅ Изменения сохранены!');
      onNavigate();
    } catch (error: any) {
      debugError('Error saving:', error);
      alert('❌ Ошибка сохранения: ' + (error?.message || error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (periodId: string | undefined, title: string) => {
    if (periodId === 'intro' || periodId === 'clinical-intro') {
      alert('⚠️ Вводное занятие нельзя удалить, только редактировать.');
      return;
    }

    const itemType = course === 'clinical' ? 'тему' : isCoreCourse(course) ? 'период' : 'занятие';
    const confirmed = window.confirm(
      `Вы уверены что хотите удалить ${itemType} "${title}"?\n\n` + 'Это действие нельзя отменить!'
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      const collectionName = course === 'clinical' ? 'clinical-topics' :
        course === 'general' ? 'general-topics' :
        isCoreCourse(course) ? 'periods' :
        null;
      const docRef = collectionName
        ? doc(db, collectionName, periodId!)
        : getCourseLessonDocRef(course, periodId!);
      await deleteDoc(docRef);
      alert(`🗑️ ${course === 'clinical' ? 'Тема удалена' : isCoreCourse(course) ? 'Период удалён' : 'Занятие удалено'}`);
      onNavigate();
    } catch (error: any) {
      debugError('Error deleting:', error);
      alert('❌ Ошибка удаления: ' + (error?.message || error));
    } finally {
      setSaving(false);
    }
  };

  return { saving, handleSave, handleDelete };
}
