import { useRef, useState } from 'react';
import { uploadCourseAuthorPhoto, validateImageFile } from '../../../../utils/mediaUpload';
import { debugError } from '../../../../lib/debug';
import { MarkdownView } from '../../../../lib/MarkdownView';
import type { AuthorFormState } from '../useCourseIntroEditor';
import { AuthorLinksEditor } from './AuthorLinksEditor';
import { INPUT_CLASS, LABEL_CLASS } from './styles';

interface AuthorCardEditorProps {
  author: AuthorFormState;
  index: number;
  total: number;
  courseId: string;
  onUpdate: (patch: Partial<AuthorFormState>) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

export function AuthorCardEditor({
  author,
  index,
  total,
  courseId,
  onUpdate,
  onRemove,
  onMove,
}: AuthorCardEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error ?? 'Неподдерживаемый файл.');
      e.target.value = '';
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadCourseAuthorPhoto(courseId, author.id, file);
      onUpdate({ photoUrl: url });
    } catch (err) {
      debugError('uploadCourseAuthorPhoto failed', err);
      setUploadError('Не удалось загрузить фото.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <li className="rounded-2xl border border-[#E5ECF3] bg-[#FAFCFE] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-[#8A97AB]">
          Автор {index + 1}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={index === 0}
            aria-label="Поднять"
            className="rounded-md px-2 py-1 text-[#556476] hover:bg-[#EEF2F7] disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={index === total - 1}
            aria-label="Опустить"
            className="rounded-md px-2 py-1 text-[#556476] hover:bg-[#EEF2F7] disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md bg-rose-50 px-3 py-1 text-sm text-rose-700 hover:bg-rose-100"
          >
            Удалить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>Имя</label>
          <input
            type="text"
            value={author.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Алексей Зыков"
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Роль / должность</label>
          <input
            type="text"
            value={author.role}
            onChange={(e) => onUpdate({ role: e.target.value })}
            placeholder="Автор курса, PhD"
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Фото</label>
        <div className="mt-1 flex items-start gap-3">
          {author.photoUrl ? (
            <img
              src={author.photoUrl}
              alt=""
              className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[#E5ECF3] text-xs text-[#8A97AB]">
              нет фото
            </div>
          )}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-md bg-[#2F6DB5] px-3 py-1.5 text-sm text-white hover:bg-[#1F4F86] disabled:opacity-50"
              >
                {uploading ? 'Загружаем…' : '📁 Загрузить фото'}
              </button>
              {author.photoUrl ? (
                <button
                  type="button"
                  onClick={() => onUpdate({ photoUrl: '' })}
                  className="rounded-md bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
                >
                  Очистить
                </button>
              ) : null}
            </div>
            <input
              type="url"
              value={author.photoUrl}
              onChange={(e) => onUpdate({ photoUrl: e.target.value })}
              placeholder="Или вставьте URL"
              className={INPUT_CLASS}
            />
            {uploadError ? (
              <p className="text-xs text-rose-700">{uploadError}</p>
            ) : (
              <p className="text-xs text-[#8A97AB]">
                JPEG / PNG / GIF / WebP, до 5 MB. Без фото — показаны инициалы.
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Биография (markdown)</label>
        <textarea
          value={author.bio}
          onChange={(e) => onUpdate({ bio: e.target.value })}
          rows={4}
          placeholder="Короткий текст о профессиональном пути. Можно использовать **жирный** и ссылки [текст](https://...)."
          className={`${INPUT_CLASS} mt-1 font-mono text-sm`}
        />
        {author.bio.trim() ? (
          <details className="mt-2 text-sm text-[#556476]">
            <summary className="cursor-pointer text-xs text-[#8A97AB]">Предпросмотр</summary>
            <MarkdownView
              source={author.bio}
              className="mt-2 space-y-2 rounded-md bg-white p-3 [&_p]:leading-relaxed"
            />
          </details>
        ) : null}
      </div>

      <AuthorLinksEditor author={author} onChange={onUpdate} />
    </li>
  );
}
