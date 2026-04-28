import { useState, useRef } from 'react';
import {
  uploadQuestionImage,
  uploadQuestionAudio,
  deleteMediaFile,
  validateYouTubeUrl,
  getYouTubeEmbedUrl,
} from '../../../utils/mediaUpload';
import { debugError } from '../../../lib/debug';

interface QuestionMediaUploaderProps {
  questionId: string;
  testId: string | null | undefined;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  onImageChange: (url: string | undefined) => void;
  onAudioChange: (url: string | undefined) => void;
  onVideoChange: (url: string | undefined) => void;
}

export function QuestionMediaUploader({
  questionId,
  testId,
  imageUrl,
  audioUrl,
  videoUrl,
  onImageChange,
  onAudioChange,
  onVideoChange,
}: QuestionMediaUploaderProps) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState(videoUrl || '');
  const [videoUrlError, setVideoUrlError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !testId) return;

    try {
      setUploadingImage(true);
      const newImageUrl = await uploadQuestionImage(testId, questionId, file);
      onImageChange(newImageUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка загрузки изображения');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleImageRemove = async () => {
    if (!imageUrl) return;
    try {
      await deleteMediaFile(imageUrl);
      onImageChange(undefined);
    } catch (error) {
      debugError('Ошибка удаления изображения:', error);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !testId) return;

    try {
      setUploadingAudio(true);
      const newAudioUrl = await uploadQuestionAudio(testId, questionId, file);
      onAudioChange(newAudioUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка загрузки аудио');
    } finally {
      setUploadingAudio(false);
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  const handleAudioRemove = async () => {
    if (!audioUrl) return;
    try {
      await deleteMediaFile(audioUrl);
      onAudioChange(undefined);
    } catch (error) {
      debugError('Ошибка удаления аудио:', error);
    }
  };

  const handleVideoUrlChange = (value: string) => {
    setVideoUrlInput(value);
    setVideoUrlError(null);
  };

  const handleVideoUrlSave = () => {
    if (!videoUrlInput.trim()) {
      onVideoChange(undefined);
      setVideoUrlError(null);
      return;
    }

    const validation = validateYouTubeUrl(videoUrlInput);
    if (!validation.valid) {
      setVideoUrlError(validation.error || 'Неверный URL');
      return;
    }

    onVideoChange(videoUrlInput);
    setVideoUrlError(null);
  };

  return (
    <section className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2 text-xs font-medium text-gray-600">Медиа к вопросу</div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          disabled={!testId || uploadingImage}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioUpload}
          className="hidden"
          disabled={!testId || uploadingAudio}
        />

        {/* Картинка */}
        {imageUrl ? (
          <div className="flex items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs">
            <span className="text-green-700">🖼️ Картинка</span>
            <button
              onClick={handleImageRemove}
              className="ml-1 text-red-600 hover:text-red-800"
              title="Удалить"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={!testId || uploadingImage}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Добавить картинку"
          >
            {uploadingImage ? '⏳ Загрузка...' : '🖼️ Картинка'}
          </button>
        )}

        {/* Аудио */}
        {audioUrl ? (
          <div className="flex items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs">
            <span className="text-green-700">🔊 Аудио</span>
            <button
              onClick={handleAudioRemove}
              className="ml-1 text-red-600 hover:text-red-800"
              title="Удалить"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => audioInputRef.current?.click()}
            disabled={!testId || uploadingAudio}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Добавить аудио"
          >
            {uploadingAudio ? '⏳ Загрузка...' : '🔊 Аудио'}
          </button>
        )}

        {/* Видео URL */}
        <div className="flex flex-1 min-w-[200px] items-center gap-1">
          {videoUrl ? (
            <div className="flex flex-1 items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs">
              <span className="flex-1 truncate text-green-700" title={videoUrl}>
                🎬 {videoUrl}
              </span>
              <button
                onClick={() => {
                  setVideoUrlInput('');
                  onVideoChange(undefined);
                }}
                className="ml-1 text-red-600 hover:text-red-800"
                title="Удалить"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={videoUrlInput}
                onChange={(e) => handleVideoUrlChange(e.target.value)}
                onBlur={handleVideoUrlSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                placeholder="YouTube URL или ID"
                className={`flex-1 rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                  videoUrlError
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                    : 'border-gray-300 focus:border-blue-400 focus:ring-blue-200'
                }`}
              />
              {videoUrlError && (
                <span className="text-xs text-red-600">{videoUrlError}</span>
              )}
            </>
          )}
        </div>
      </div>
      {!testId && (
        <div className="mt-2 text-xs text-amber-600">
          ⚠️ Сначала сохраните тест, чтобы загрузить медиа
        </div>
      )}

      {/* Предпросмотр загруженных медиа */}
      {(imageUrl || audioUrl || videoUrl) && (
        <div className="mt-3 space-y-3">
          {imageUrl && (
            <div className="rounded-lg overflow-hidden border border-gray-300">
              <img
                src={imageUrl}
                alt="Предпросмотр изображения"
                className="w-full h-auto max-h-64 object-contain bg-gray-50"
              />
            </div>
          )}

          {audioUrl && (
            <div className="rounded-lg border border-gray-300 bg-gray-50 p-2">
              <audio controls className="w-full">
                <source src={audioUrl} />
                Ваш браузер не поддерживает аудио.
              </audio>
            </div>
          )}

          {videoUrl && getYouTubeEmbedUrl(videoUrl) && (
            <div className="rounded-lg overflow-hidden border border-gray-300 bg-gray-900">
              <div className="relative pb-[56.25%]">
                <iframe
                  src={getYouTubeEmbedUrl(videoUrl) || ''}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Предпросмотр видео"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
