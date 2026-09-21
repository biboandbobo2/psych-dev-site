/**
 * Окно «Добавить»: один ввод email на три сценария — в поток (основной),
 * курсы лично (исключения) и права администратора курса (только супер-админ).
 * Заменило три отдельные модалки (массовое открытие курсов, добавить админа,
 * добавить со-админа).
 */
import { useMemo, useState } from 'react';
import type { CourseOption } from '../../../../hooks/useCourses';
import type { Group } from '../../../../types/groups';
import {
  addGroupMembersByEmail,
  bulkEnrollStudents,
  makeUserAdmin,
} from '../../../../lib/adminFunctions';
import { reportAppError } from '../../../../lib/errorHandler';
import { parseEmailList } from '../utils';
import { CloseIcon } from './icons';

type InviteMode = 'stream' | 'courses' | 'admin';

interface InviteResult {
  summary: string;
  errors: string[];
}

const MODE_TITLES: Record<InviteMode, { title: string; hint: string }> = {
  stream: {
    title: 'В поток',
    hint: 'Курсы потока, объявления и календарь. Это основной способ.',
  },
  courses: { title: 'Курсы лично', hint: 'Для исключений: выбрать курсы без потока.' },
  admin: {
    title: 'Права администратора курса',
    hint: 'Редактирование выбранных курсов. Только супер-админ.',
  },
};

export function InviteModal({
  streams,
  courses,
  isSuperAdmin,
  onClose,
}: {
  streams: Group[];
  courses: CourseOption[];
  isSuperAdmin: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<InviteMode>('stream');
  const [emailsInput, setEmailsInput] = useState('');
  const [groupId, setGroupId] = useState(streams[0]?.id ?? '');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseEmailList(emailsInput), [emailsInput]);
  const modes: InviteMode[] = isSuperAdmin ? ['stream', 'courses', 'admin'] : ['stream', 'courses'];
  const streamName = streams.find((stream) => stream.id === groupId)?.name ?? '';

  const actionLabel =
    mode === 'stream'
      ? `Добавить в «${streamName}»`
      : mode === 'courses'
        ? 'Открыть курсы'
        : 'Выдать права';
  const canSubmit =
    parsed.emails.length > 0 &&
    !busy &&
    (mode === 'stream' ? Boolean(groupId) : selectedCourses.length > 0);

  const toggleCourse = (id: string) =>
    setSelectedCourses((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      if (mode === 'stream') {
        const response = await addGroupMembersByEmail({ groupId, emails: parsed.emails });
        setResult({
          summary: `В «${streamName}»: добавлено ${response.resolvedExisting}, ждут регистрации ${response.createdPending}.`,
          errors: [],
        });
      } else if (mode === 'courses') {
        const response = await bulkEnrollStudents({
          emails: parsed.emails,
          courseIds: selectedCourses,
        });
        setResult({
          summary: `Курсы открыты: обновлено ${response.updatedExisting}, ждут регистрации ${response.createdPending}.`,
          errors: [],
        });
      } else {
        const errors: string[] = [];
        let granted = 0;
        for (const email of parsed.emails) {
          try {
            await makeUserAdmin({ targetEmail: email, editableCourses: selectedCourses });
            granted++;
          } catch (err) {
            errors.push(`${email}: ${err instanceof Error ? err.message : 'ошибка'}`);
          }
        }
        setResult({ summary: `Права выданы: ${granted} из ${parsed.emails.length}.`, errors });
      }
      setEmailsInput('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось добавить пользователей';
      setError(message);
      reportAppError({ message, error: err, context: 'admin-users' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 sm:p-8">
      <div className="w-full max-w-[560px] rounded-2xl bg-card shadow-brand">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-fg">Добавить пользователей</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-card2 hover:text-fg"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-fg">Email, один или несколько</span>
            <textarea
              rows={3}
              value={emailsInput}
              onChange={(event) => setEmailsInput(event.target.value)}
              aria-label="Email пользователей"
              className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
            />
            <span className="text-xs text-muted">
              Кто ещё не регистрировался, получит всё при первом входе через Google.
            </span>
            {parsed.invalid.length > 0 && (
              <span className="text-xs text-pastel-blue-deep">
                Не похоже на email: {parsed.invalid.join(', ')}
              </span>
            )}
          </label>

          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2 text-sm font-semibold text-fg">Что открыть</legend>
            {modes.map((item) => (
              <label
                key={item}
                className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition ${
                  mode === item ? 'border-accent bg-accent-100' : 'border-border'
                }`}
              >
                <input
                  type="radio"
                  name="invite-mode"
                  checked={mode === item}
                  onChange={() => setMode(item)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-fg">{MODE_TITLES[item].title}</span>
                    <span className="text-xs text-muted">{MODE_TITLES[item].hint}</span>
                  </span>

                  {mode === item && item === 'stream' && (
                    <select
                      aria-label="Поток"
                      value={groupId}
                      onChange={(event) => setGroupId(event.target.value)}
                      className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm font-semibold text-fg"
                    >
                      {streams.map((stream) => (
                        <option key={stream.id} value={stream.id}>
                          {stream.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {mode === item && item !== 'stream' && (
                    <span className="flex flex-col gap-1">
                      {courses.map((course) => (
                        <label key={course.id} className="flex items-center gap-2 text-sm text-fg">
                          <input
                            type="checkbox"
                            checked={selectedCourses.includes(course.id)}
                            onChange={() => toggleCourse(course.id)}
                            className="h-4 w-4 accent-accent"
                          />
                          {course.name}
                        </label>
                      ))}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>

          {result && (
            <div className="rounded-xl border border-border bg-card2 p-3 text-sm text-fg">
              <p>{result.summary}</p>
              {result.errors.map((item) => (
                <p key={item} className="mt-1 text-xs text-muted">
                  {item}
                </p>
              ))}
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-pastel-terracotta bg-pastel-terracotta p-3 text-sm text-ink">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-fg transition hover:bg-card2"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Добавляем…' : `${actionLabel} · ${parsed.emails.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}
