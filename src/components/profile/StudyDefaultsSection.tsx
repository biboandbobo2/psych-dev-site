import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../stores/useAuthStore';
import { debugError } from '../../lib/debug';
import type { LectureQuestionVisibility } from '../../types/lectureQuestions';
import type { LectureNoteVisibility } from '../../types/notes';

/**
 * Дефолты режима конспекта для аккаунта (users/{uid}.studyDefaults).
 * Per-lecture настройки в шестерёнке оверлея приоритетнее этих значений.
 */
export function StudyDefaultsSection() {
  const user = useAuthStore((s) => s.user);
  const questionsDefault = useAuthStore((s) => s.studyQuestionsDefaultVisibility);
  const noteDefault = useAuthStore((s) => s.studyNoteDefaultVisibility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questionsValue: LectureQuestionVisibility = questionsDefault ?? 'group';
  const noteValue: LectureNoteVisibility = noteDefault ?? 'private';

  const saveDefaults = async (
    patch: Partial<{ questionsVisibility: LectureQuestionVisibility; noteVisibility: LectureNoteVisibility }>
  ) => {
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Store обновится сам через onSnapshot userDoc в useAuthStore.
      await setDoc(doc(db, 'users', user.uid), { studyDefaults: patch }, { merge: true });
    } catch (err) {
      debugError('[StudyDefaultsSection] save error', err);
      setError('Не удалось сохранить настройку. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionsSelect = (next: LectureQuestionVisibility) => {
    if (next === questionsValue) return;
    void saveDefaults({ questionsVisibility: next });
  };

  const handleNoteSelect = (next: LectureNoteVisibility) => {
    if (next === noteValue) return;
    void saveDefaults({ noteVisibility: next });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
        <span role="img" aria-hidden="true">
          🎧
        </span>
        Режим конспекта
      </h2>

      <fieldset className="space-y-2" disabled={saving}>
        <legend className="text-sm font-medium text-gray-700">
          Мои вопросы по лекциям видят (дефолт для новых лекций)
        </legend>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            name="study-questions-visibility"
            checked={questionsValue === 'group'}
            onChange={() => handleQuestionsSelect('group')}
          />
          Моя группа и лекторы
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            name="study-questions-visibility"
            checked={questionsValue === 'lecturers'}
            onChange={() => handleQuestionsSelect('lecturers')}
          />
          Только лекторы курса
        </label>
      </fieldset>

      <fieldset className="mt-4 space-y-2" disabled={saving}>
        <legend className="text-sm font-medium text-gray-700">
          Мой конспект видят (дефолт для новых конспектов)
        </legend>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            name="study-note-visibility"
            checked={noteValue === 'private'}
            onChange={() => handleNoteSelect('private')}
          />
          Только я
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            name="study-note-visibility"
            checked={noteValue === 'group'}
            onChange={() => handleNoteSelect('group')}
          />
          Моя группа и лекторы
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            name="study-note-visibility"
            checked={noteValue === 'lecturers'}
            onChange={() => handleNoteSelect('lecturers')}
          />
          Только лекторы курса
        </label>
      </fieldset>

      <p className="mt-3 text-xs text-gray-500">
        Для конкретной лекции видимость можно поменять в настройках ⚙ режима конспекта —
        она приоритетнее этих дефолтов. Открытый конспект виден живьём: правки
        появляются сразу.
      </p>

      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
