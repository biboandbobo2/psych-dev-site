import { useEffect, useMemo, useState } from "react";
import {
  bulkEnrollStudents,
  getStudentEmailLists,
  saveStudentEmailList,
  type StudentEmailList,
} from "../lib/adminFunctions";

interface CourseOption {
  id: string;
  name: string;
}

interface BulkStudentAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseOptions: CourseOption[];
}

const splitEmails = (value: string): string[] => {
  const dedupe = new Set<string>();
  value
    .split(/[\n,;\s]+/g)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .forEach((email) => dedupe.add(email));
  return Array.from(dedupe);
};

export function BulkStudentAccessModal({ isOpen, onClose, courseOptions }: BulkStudentAccessModalProps) {
  const [lists, setLists] = useState<StudentEmailList[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [selectedListId, setSelectedListId] = useState("");
  const [emailsInput, setEmailsInput] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<Record<string, boolean>>({});
  const [saveListEnabled, setSaveListEnabled] = useState(false);
  const [listName, setListName] = useState("");
  const [savingList, setSavingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedEmails = useMemo(() => splitEmails(emailsInput), [emailsInput]);
  const selectedCourseIds = useMemo(
    () => courseOptions.filter((course) => selectedCourses[course.id]).map((course) => course.id),
    [courseOptions, selectedCourses]
  );

  useEffect(() => {
    if (!isOpen) return;
    setLoadingLists(true);
    getStudentEmailLists()
      .then((result) => setLists(result.lists ?? []))
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Не удалось загрузить списки";
        setError(message);
      })
      .finally(() => setLoadingLists(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const initialSelection: Record<string, boolean> = {};
    courseOptions.forEach((course) => {
      initialSelection[course.id] = false;
    });
    setSelectedCourses(initialSelection);
  }, [courseOptions, isOpen]);

  if (!isOpen) return null;

  const handleSelectList = (listId: string) => {
    setSelectedListId(listId);
    setError(null);
    const list = lists.find((item) => item.id === listId);
    if (!list) return;
    setEmailsInput(list.emails.join("\n"));
    setListName((current) => current || list.name);
  };

  const handleSaveList = async () => {
    const trimmedName = listName.trim();
    if (!trimmedName) {
      setError("Укажите название списка");
      return;
    }
    if (!parsedEmails.length) {
      setError("Добавьте хотя бы один email");
      return;
    }

    setSavingList(true);
    setError(null);
    try {
      await saveStudentEmailList({
        name: trimmedName,
        emails: parsedEmails,
      });
      const updated = await getStudentEmailLists();
      setLists(updated.lists ?? []);
      window.alert("Список сохранён");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сохранить список";
      setError(message);
    } finally {
      setSavingList(false);
    }
  };

  const handleSubmit = async () => {
    if (!parsedEmails.length) {
      setError("Добавьте хотя бы один email");
      return;
    }
    if (!selectedCourseIds.length) {
      setError("Выберите хотя бы один курс");
      return;
    }
    if (saveListEnabled && !listName.trim()) {
      setError("Укажите название списка для сохранения");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await bulkEnrollStudents({
        emails: parsedEmails,
        courseIds: selectedCourseIds,
        saveList: saveListEnabled
          ? {
              enabled: true,
              name: listName.trim(),
            }
          : { enabled: false },
      });

      const summary = [
        `Обработано: ${result.totalProcessed}`,
        `Обновлено существующих: ${result.updatedExisting}`,
        `Добавлено ожидание регистрации: ${result.createdPending}`,
      ].join("\n");
      window.alert(`Готово!\n\n${summary}`);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось выдать доступы";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-bold">Массовое открытие курсов</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-gray-400 transition hover:text-gray-600"
            disabled={submitting || savingList}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Сохранённые списки (опционально)</label>
            <select
              value={selectedListId}
              onChange={(event) => handleSelectList(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              disabled={loadingLists}
            >
              <option value="">Выберите список</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.emailCount})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Email студентов (через запятую или с новой строки)
            </label>
            <textarea
              value={emailsInput}
              onChange={(event) => {
                setEmailsInput(event.target.value);
                setError(null);
              }}
              rows={8}
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
              placeholder={"student1@gmail.com\nstudent2@gmail.com"}
            />
            <p className="text-xs text-gray-500">Найдено email: {parsedEmails.length}</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Курсы для открытия</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {courseOptions.map((course) => (
                <label key={course.id} className="flex items-center gap-2 rounded border border-gray-200 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedCourses[course.id])}
                    onChange={(event) =>
                      setSelectedCourses((prev) => ({ ...prev, [course.id]: event.target.checked }))
                    }
                  />
                  <span className="text-sm">{course.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3">
            <label className="block text-sm font-medium text-gray-700">Сохранение списка email</label>
            <input
              type="text"
              value={listName}
              onChange={(event) => setListName(event.target.value)}
              placeholder='Например: "Студенты второго потока"'
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saveListEnabled}
                  onChange={(event) => setSaveListEnabled(event.target.checked)}
                />
                Сохранить этот список при выдаче доступов
              </label>
              <button
                type="button"
                onClick={handleSaveList}
                disabled={savingList || submitting}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm transition hover:bg-gray-100 disabled:bg-gray-100"
              >
                {savingList ? "Сохранение..." : "Сохранить список сейчас"}
              </button>
            </div>
          </div>

          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-100"
            disabled={submitting || savingList}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-400"
            disabled={submitting || savingList}
          >
            {submitting ? "Выдача..." : "Открыть курсы"}
          </button>
        </div>
      </div>
    </div>
  );
}
