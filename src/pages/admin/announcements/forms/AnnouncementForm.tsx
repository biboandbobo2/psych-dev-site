import { useState, type FormEvent } from 'react';
import type { GroupAnnouncement, PlatformNewsType } from '../../../../types/groupFeed';

export interface AnnouncementFormValue {
  text: string;
  newsType: PlatformNewsType | null;
}

export interface AnnouncementFormSubmitPayload {
  text: string;
  newsType: PlatformNewsType | null;
}

export const EMPTY_ANNOUNCEMENT_FORM: AnnouncementFormValue = {
  text: '',
  newsType: 'tech',
};

export function announcementToFormValue(item: GroupAnnouncement): AnnouncementFormValue {
  return {
    text: item.text ?? '',
    newsType: item.newsType ?? null,
  };
}

interface AnnouncementFormProps {
  initialValue?: AnnouncementFormValue;
  /** Если true — показываем выбор типа новости (для группы 'everyone'). */
  isEveryone: boolean;
  saving: boolean;
  errorMessage: string | null;
  submitLabel: string;
  onSubmit: (value: AnnouncementFormSubmitPayload) => void;
}

export function AnnouncementForm({
  initialValue,
  isEveryone,
  saving,
  errorMessage,
  submitLabel,
  onSubmit,
}: AnnouncementFormProps) {
  const seed: AnnouncementFormValue = initialValue ?? EMPTY_ANNOUNCEMENT_FORM;
  const [text, setText] = useState(seed.text);
  const [newsType, setNewsType] = useState<PlatformNewsType>(
    (seed.newsType === 'content' || seed.newsType === 'tech') ? seed.newsType : 'tech'
  );

  const canSubmit = text.trim().length >= 3;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({
      text: text.trim(),
      newsType: isEveryone ? newsType : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {isEveryone && (
        <fieldset className="space-y-1 rounded-md border border-dashed border-gray-300 bg-[#F9FBFF] p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-[#8A97AB]">
            Тип новости
          </legend>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-[#2C3E50]">
            <input
              type="radio"
              name="newsType"
              value="tech"
              checked={newsType === 'tech'}
              onChange={() => setNewsType('tech')}
              disabled={saving}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">Техническая</span>
              <span className="ml-1 text-xs text-[#6B7A8D]">
                (новая кнопка, фича, улучшение платформы)
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-[#2C3E50]">
            <input
              type="radio"
              name="newsType"
              value="content"
              checked={newsType === 'content'}
              onChange={() => setNewsType('content')}
              disabled={saving}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">Контентная</span>
              <span className="ml-1 text-xs text-[#6B7A8D]">
                (новая лекция, курс, книга в RAG)
              </span>
            </span>
          </label>
        </fieldset>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={
          isEveryone
            ? 'Например: «Добавили книгу Выготского в RAG — теперь можно задавать вопросы по ней»'
            : 'Например: «В субботу пробный экзамен по клинической психологии»'
        }
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        disabled={saving}
      />
      {errorMessage && <p className="text-xs text-rose-700">{errorMessage}</p>}
      <button
        type="submit"
        disabled={saving || !canSubmit}
        className="rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {saving ? 'Сохраняем…' : submitLabel}
      </button>
    </form>
  );
}
