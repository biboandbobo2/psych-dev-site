import { useState } from 'react';

interface AnnouncementAdminFormProps {
  onSubmitAnnouncement: (text: string) => Promise<void>;
  onSubmitEvent: (date: string, text: string) => Promise<void>;
}

export function AnnouncementAdminForm({ onSubmitAnnouncement, onSubmitEvent }: AnnouncementAdminFormProps) {
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const [eventDateDraft, setEventDateDraft] = useState('');
  const [eventTextDraft, setEventTextDraft] = useState('');
  const [isAnnouncementSaving, setIsAnnouncementSaving] = useState(false);
  const [isEventSaving, setIsEventSaving] = useState(false);

  const handleSubmitAnnouncement = async () => {
    if (isAnnouncementSaving) return;
    setIsAnnouncementSaving(true);
    try {
      await onSubmitAnnouncement(announcementDraft);
      setAnnouncementDraft('');
    } catch {
      // Ошибку показывает родитель через feedActionError; черновик сохраняем.
    } finally {
      setIsAnnouncementSaving(false);
    }
  };

  const handleSubmitEvent = async () => {
    if (isEventSaving) return;
    setIsEventSaving(true);
    try {
      await onSubmitEvent(eventDateDraft, eventTextDraft);
      setEventDateDraft('');
      setEventTextDraft('');
    } catch {
      // Ошибку показывает родитель через feedActionError; черновики сохраняем.
    } finally {
      setIsEventSaving(false);
    }
  };

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <div className="space-y-2 rounded-xl border border-[#DFE7F3] bg-[#FAFCFF] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4A5FA5]">Добавить объявление</p>
        <textarea
          value={announcementDraft}
          onChange={(event) => setAnnouncementDraft(event.target.value)}
          rows={3}
          maxLength={400}
          placeholder="Текст объявления..."
          className="w-full rounded-lg border border-[#C9D6E6] px-3 py-2 text-sm text-[#243447] focus:border-[#5B7FD1] focus:outline-none focus:ring-2 focus:ring-[#DCE7FF]"
        />
        <button
          type="button"
          onClick={handleSubmitAnnouncement}
          disabled={isAnnouncementSaving}
          className="inline-flex rounded-lg bg-[#3359CB] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2A49A8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAnnouncementSaving ? 'Сохранение...' : 'Опубликовать'}
        </button>
      </div>
      <div className="space-y-2 rounded-xl border border-[#DFE7F3] bg-[#FAFCFF] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4A5FA5]">Добавить событие</p>
        <input
          type="date"
          value={eventDateDraft}
          onChange={(event) => setEventDateDraft(event.target.value)}
          className="w-full rounded-lg border border-[#C9D6E6] px-3 py-2 text-sm text-[#243447] focus:border-[#5B7FD1] focus:outline-none focus:ring-2 focus:ring-[#DCE7FF]"
        />
        <textarea
          value={eventTextDraft}
          onChange={(event) => setEventTextDraft(event.target.value)}
          rows={2}
          maxLength={400}
          placeholder="Описание события..."
          className="w-full rounded-lg border border-[#C9D6E6] px-3 py-2 text-sm text-[#243447] focus:border-[#5B7FD1] focus:outline-none focus:ring-2 focus:ring-[#DCE7FF]"
        />
        <button
          type="button"
          onClick={handleSubmitEvent}
          disabled={isEventSaving}
          className="inline-flex rounded-lg bg-[#3359CB] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2A49A8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isEventSaving ? 'Сохранение...' : 'Опубликовать'}
        </button>
      </div>
    </div>
  );
}
