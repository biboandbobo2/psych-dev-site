import { useMemo, useState } from 'react';
import { BaseModal, ModalCancelButton, ModalSaveButton } from '../../../components/ui/BaseModal';
import { bulkEnrollStudents } from '../../../lib/adminFunctions';
import { isValidEmail, splitEmails } from '../../../lib/emailList';
import { reportAppError } from '../../../lib/errorHandler';
import { plural } from './courseStudentsHelpers';

interface InviteResult {
  updatedExisting: number;
  createdPending: number;
}

interface InviteStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  /** Вызывается после успешного приглашения — страница перечитывает список. */
  onInvited: () => void;
}

/**
 * Приглашение студентов на свой курс. Ходит в `bulkEnrollStudents`, которому
 * админу курса разрешены только курсы из его `editableCourses`; кто ещё не
 * регистрировался, получает pending-доступ и попадает на курс при первом входе.
 */
export function InviteStudentsModal({
  isOpen,
  onClose,
  courseId,
  courseName,
  onInvited,
}: InviteStudentsModalProps) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);

  const { valid, invalid } = useMemo(() => {
    const parsed = splitEmails(value);
    return {
      valid: parsed.filter(isValidEmail),
      invalid: parsed.filter((email) => !isValidEmail(email)),
    };
  }, [value]);

  const close = () => {
    if (submitting) return;
    setValue('');
    setError(null);
    setResult(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (valid.length === 0) {
      setError('Добавьте хотя бы один корректный email');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await bulkEnrollStudents({ emails: valid, courseIds: [courseId] });
      setResult({
        updatedExisting: response.updatedExisting,
        createdPending: response.createdPending,
      });
      setValue('');
      onInvited();
    } catch (err) {
      reportAppError({
        message: 'Не удалось пригласить студентов на курс',
        error: err,
        context: 'CourseStudents.invite',
      });
      setError(err instanceof Error ? err.message : 'Не удалось выдать доступ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={close}
      title={`Пригласить на курс «${courseName}»`}
      maxWidth="lg"
      disabled={submitting}
      footer={
        <>
          <ModalCancelButton onClick={close} disabled={submitting}>
            Закрыть
          </ModalCancelButton>
          <ModalSaveButton
            onClick={handleSubmit}
            loading={submitting}
            disabled={valid.length === 0}
          >
            Пригласить · {valid.length}
          </ModalSaveButton>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="block text-sm font-medium text-fg">
            Email студентов — по одному в строке или через запятую
          </span>
          <textarea
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            rows={7}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 font-mono text-sm text-fg"
            placeholder={'student1@gmail.com\nstudent2@gmail.com'}
          />
        </label>

        <p className="text-sm text-muted">
          Нашли адресов: {valid.length}. Кто ещё не регистрировался, получит доступ при первом
          входе через Google.
        </p>

        {invalid.length > 0 && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Не похоже на почту и будет пропущено: {invalid.join(', ')}
          </p>
        )}

        {result && (
          <p className="rounded-xl border border-accent/30 bg-accent-100 px-4 py-3 text-sm text-fg">
            Доступ открыт: {result.updatedExisting}{' '}
            {plural(result.updatedExisting, ['студенту', 'студентам', 'студентам'])} · ждут
            регистрации: {result.createdPending}
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </div>
    </BaseModal>
  );
}
