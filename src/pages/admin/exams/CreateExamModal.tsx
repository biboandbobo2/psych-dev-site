import { useState } from 'react';
import { createPortal } from 'react-dom';
import { debugError } from '../../../lib/debug';
import { createExam } from '../../../lib/exams/examsFirestore';
import type { Group } from '../../../types/groups';

interface CreateExamModalProps {
  groups: Group[];
  createdBy: string;
  onClose: () => void;
  onCreated: (examId: string) => void;
}

export function CreateExamModal({
  groups,
  createdBy,
  onClose,
  onCreated,
}: CreateExamModalProps) {
  const [title, setTitle] = useState('Зачёт по курсу общей психологии');
  const [courseId, setCourseId] = useState('general');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(40);
  const [essayMinChars, setEssayMinChars] = useState(1000);
  const [essayMaxChars, setEssayMaxChars] = useState(3500);
  const [cancelLeadTimeHours, setCancelLeadTimeHours] = useState(48);
  const [announcementTitle, setAnnouncementTitle] = useState('Запись на экзамен');
  const [announcementBody, setAnnouncementBody] = useState(
    'Открыта запись на экзамен. Выберите удобный слот и приложите эссе.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGroup = (gid: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(gid) ? prev.filter((x) => x !== gid) : [...prev, gid]
    );
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Введите название');
      return;
    }
    if (!courseId.trim()) {
      setError('Введите courseId');
      return;
    }
    if (selectedGroupIds.length === 0) {
      setError('Выберите хотя бы одну группу');
      return;
    }
    if (essayMinChars >= essayMaxChars) {
      setError('Минимальная длина должна быть меньше максимальной');
      return;
    }
    setSubmitting(true);
    try {
      const id = await createExam(
        {
          title: title.trim(),
          courseId: courseId.trim(),
          groupIds: selectedGroupIds,
          slotDurationMinutes,
          essayMinChars,
          essayMaxChars,
          cancelLeadTimeHours,
          timezone: 'Asia/Tbilisi',
          announcement: {
            title: announcementTitle.trim(),
            body: announcementBody.trim(),
          },
        },
        createdBy
      );
      onCreated(id);
    } catch (err) {
      debugError('CreateExamModal: createExam failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось создать');
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-card p-6 shadow-brand"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 rounded-full p-1 text-muted transition hover:bg-card2"
        >
          ✕
        </button>
        <h3 className="text-lg font-bold text-fg">Новый экзамен</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold sm:col-span-2">
            Название
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-card2 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold">
            Course ID
            <input
              type="text"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-card2 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold">
            Длительность слота, мин
            <input
              type="number"
              min={5}
              max={480}
              value={slotDurationMinutes}
              onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-card2 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold">
            Эссе, мин. символов
            <input
              type="number"
              min={0}
              value={essayMinChars}
              onChange={(e) => setEssayMinChars(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-card2 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold">
            Эссе, макс. символов
            <input
              type="number"
              min={1}
              value={essayMaxChars}
              onChange={(e) => setEssayMaxChars(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-card2 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold">
            Окно отмены, часов
            <input
              type="number"
              min={0}
              value={cancelLeadTimeHours}
              onChange={(e) => setCancelLeadTimeHours(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-card2 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-4">
          <p className="text-sm font-semibold">Группы участников</p>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            {groups.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedGroupIds.includes(g.id)}
                  onChange={() => toggleGroup(g.id)}
                />
                <span>{g.name}</span>
                <span className="text-xs text-muted">({g.id})</span>
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold sm:col-span-2">
            Заголовок объявления студентам
            <input
              type="text"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-card2 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold sm:col-span-2">
            Текст объявления
            <textarea
              value={announcementBody}
              onChange={(e) => setAnnouncementBody(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-card2 px-3 py-2 text-sm"
            />
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1 text-sm font-semibold"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Создаю…' : 'Создать экзамен'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
