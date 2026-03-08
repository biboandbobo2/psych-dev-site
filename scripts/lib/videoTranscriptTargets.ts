import { getYouTubeVideoId } from '../../src/lib/videoTranscripts';
import type { TranscriptImportTarget } from './videoTranscriptImportTypes';

function getVideoEntries(data: Record<string, any>, fallbackTitle: string) {
  const candidates: Array<{ title: string; url: string }> = [];
  const sections = data.sections ?? {};
  const sectionEntries = sections.video_section?.content ?? sections.video?.content;

  if (Array.isArray(sectionEntries)) {
    sectionEntries.forEach((entry: any) => {
      const url = typeof entry?.url === 'string' ? entry.url.trim() : '';
      if (!url) {
        return;
      }

      candidates.push({
        title: typeof entry?.title === 'string' && entry.title.trim() ? entry.title.trim() : fallbackTitle,
        url,
      });
    });
  }

  if (!candidates.length && typeof data.video_url === 'string' && data.video_url.trim()) {
    candidates.push({
      title: fallbackTitle,
      url: data.video_url.trim(),
    });
  }

  if (!candidates.length && Array.isArray(data.video_playlist)) {
    data.video_playlist.forEach((entry: any) => {
      const url = typeof entry?.url === 'string' ? entry.url.trim() : '';
      if (!url) {
        return;
      }

      candidates.push({
        title: typeof entry?.title === 'string' && entry.title.trim() ? entry.title.trim() : fallbackTitle,
        url,
      });
    });
  }

  return candidates;
}

export async function collectTranscriptTargets(db: FirebaseFirestore.Firestore) {
  const targets = new Map<string, TranscriptImportTarget>();

  const registerDocVideos = (
    docPath: string,
    courseId: string,
    lessonId: string,
    data: Record<string, any>
  ) => {
    const fallbackTitle =
      (typeof data.title === 'string' && data.title.trim()) ||
      (typeof data.label === 'string' && data.label.trim()) ||
      lessonId;

    getVideoEntries(data, fallbackTitle).forEach((video) => {
      const youtubeVideoId = getYouTubeVideoId(video.url);
      if (!youtubeVideoId) {
        return;
      }

      const current = targets.get(youtubeVideoId) ?? {
        youtubeVideoId,
        references: [],
      };

      current.references.push({
        courseId,
        lessonId,
        sourcePath: docPath,
        title: video.title,
        url: video.url,
      });
      targets.set(youtubeVideoId, current);
    });
  };

  const scanCollection = async (collectionName: string, courseId: string) => {
    const snapshot = await db.collection(collectionName).get();
    snapshot.forEach((docSnap) => {
      registerDocVideos(`${collectionName}/${docSnap.id}`, courseId, docSnap.id, docSnap.data());
    });
  };

  await scanCollection('periods', 'development');
  await scanCollection('clinical-topics', 'clinical');
  await scanCollection('general-topics', 'general');

  const introSingleton = await db.collection('intro').doc('singleton').get();
  if (introSingleton.exists) {
    registerDocVideos('intro/singleton', 'development', 'intro', introSingleton.data() ?? {});
  }

  const coursesSnapshot = await db.collection('courses').get();
  for (const courseSnap of coursesSnapshot.docs) {
    const lessonsSnapshot = await db.collection('courses').doc(courseSnap.id).collection('lessons').get();
    lessonsSnapshot.forEach((lessonSnap) => {
      registerDocVideos(
        `courses/${courseSnap.id}/lessons/${lessonSnap.id}`,
        courseSnap.id,
        lessonSnap.id,
        lessonSnap.data()
      );
    });
  }

  return [...targets.values()].sort((a, b) => a.youtubeVideoId.localeCompare(b.youtubeVideoId));
}
