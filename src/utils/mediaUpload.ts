import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * Допустимые типы файлов
 */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Валидация файла изображения
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Поддерживаются только форматы: JPEG, PNG, GIF, WebP',
    };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Размер файла не должен превышать ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Валидация аудио файла
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Поддерживаются только форматы: MP3, WAV, OGG',
    };
  }

  if (file.size > MAX_AUDIO_SIZE) {
    return {
      valid: false,
      error: `Размер файла не должен превышать ${MAX_AUDIO_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Загрузка изображения в Storage
 */
export async function uploadQuestionImage(
  testId: string,
  questionId: string,
  file: File
): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const fileExtension = file.name.split('.').pop() || 'jpg';
  const storagePath = `tests/${testId}/questions/${questionId}/image.${fileExtension}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

/**
 * Загрузка аудио в Storage
 */
export async function uploadQuestionAudio(
  testId: string,
  questionId: string,
  file: File
): Promise<string> {
  const validation = validateAudioFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const fileExtension = file.name.split('.').pop() || 'mp3';
  const storagePath = `tests/${testId}/questions/${questionId}/audio.${fileExtension}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

/**
 * Удаление файла из Storage по URL
 */
export async function deleteMediaFile(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    // Не бросаем ошибку, т.к. файл может быть уже удалён
  }
}

/**
 * Извлечение YouTube video ID из URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Прямой ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Валидация YouTube URL
 */
export function validateYouTubeUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'Введите URL видео' };
  }

  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return {
      valid: false,
      error: 'Неверный формат YouTube URL',
    };
  }

  return { valid: true };
}

/**
 * Преобразование YouTube URL в embed URL
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
