import { useState } from 'react';
import {
  doc,
  setDoc,
  deleteDoc,
  deleteField,
  serverTimestamp,
  collection,
  getDocs,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
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
import { getCourseLessonDocRef, getCourseLessonsCollectionRef } from '../../../../lib/courseLessons';
import { isCoreCourse } from '../../../../constants/courses';
import { getCourseCollectionName } from '../utils/courseCollectionRef';
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
  concepts: Array<{ name: string; url?: string }>;
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

  const normalizeLessonOrder = async () => {
    const collectionRef = getCourseLessonsCollectionRef(course);

    const snapshot = await getDocs(collectionRef);
    const docs = [...snapshot.docs].sort((a, b) => {
      const orderA = typeof a.data().order === 'number' ? a.data().order : Number.MAX_SAFE_INTEGER;
      const orderB = typeof b.data().order === 'number' ? b.data().order : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.id.localeCompare(b.id, 'ru');
    });
    const batch = writeBatch(db);
    let changedCount = 0;

    docs.forEach((docSnap, index) => {
      const currentOrder = docSnap.data().order;
      if (typeof currentOrder === 'number' && currentOrder === index) {
        return;
      }

      batch.set(
        docSnap.ref,
        {
          order: index,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      changedCount += 1;
    });

    if (changedCount > 0) {
      await batch.commit();
    }
  };

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
      const sections: Record<string, unknown> = {};

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
      if (isCoreCourse(course) && periodId === 'intro') {
        // Intro can live in both legacy and current locations.
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
        const collectionName = getCourseCollectionName(course);
        if (!collectionName) {
          data.courseId = course;
        }
        const docRef = collectionName
          ? doc(db, collectionName, periodId!)
          : getCourseLessonDocRef(course, periodId!);
        await setDoc(docRef, data, { merge: true });
      }

      alert('✅ Изменения сохранены!');
      onNavigate();
    } catch (error: unknown) {
      debugError('Error saving:', error);
      const message = error instanceof Error ? error.message : String(error);
      alert('❌ Ошибка сохранения: ' + message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (periodId: string | undefined, title: string) => {
    if (!periodId) {
      alert('⚠️ Не удалось определить ID занятия для удаления.');
      return;
    }

    const itemType = course === 'clinical' ? 'тему' : isCoreCourse(course) ? 'период' : 'занятие';
    const confirmed = window.confirm(
      `Вы уверены что хотите удалить ${itemType} "${title}"?\n\n` + 'Это действие нельзя отменить!'
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      if (isCoreCourse(course) && periodId === 'intro') {
        // Intro can live in both legacy and current locations.
        const introDocs = await getDocs(collection(db, 'intro'));
        const deletionTasks = [
          deleteDoc(doc(db, 'periods', 'intro')),
          ...introDocs.docs.map((docSnap) => deleteDoc(docSnap.ref)),
        ];
        await Promise.allSettled(deletionTasks);
      } else {
        const collectionName = getCourseCollectionName(course);
        const docRef = collectionName
          ? doc(db, collectionName, periodId)
          : getCourseLessonDocRef(course, periodId);
        await deleteDoc(docRef);
      }

      await normalizeLessonOrder();

      alert(`🗑️ ${course === 'clinical' ? 'Тема удалена' : isCoreCourse(course) ? 'Период удалён' : 'Занятие удалено'}`);
      onNavigate();
    } catch (error: unknown) {
      debugError('Error deleting:', error);
      const message = error instanceof Error ? error.message : String(error);
      alert('❌ Ошибка удаления: ' + message);
    } finally {
      setSaving(false);
    }
  };

  return { saving, handleSave, handleDelete };
}
