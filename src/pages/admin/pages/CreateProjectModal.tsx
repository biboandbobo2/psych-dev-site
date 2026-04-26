import { useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { generateLessonId } from '../../../utils/transliterate';
import { debugError } from '../../../lib/debug';
import type { ProjectPageDocument } from '../../../types/pageContent';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const INPUT_CLASS =
  'w-full rounded-lg border border-[#DDE5EE] bg-white px-3 py-2 text-sm text-[#2C3E50] outline-none transition focus:border-[#2F6DB5] focus:ring-2 focus:ring-[#2F6DB5]/20';
const LABEL_CLASS = 'text-xs font-semibold uppercase tracking-wide text-[#8A97AB]';

export function CreateProjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (slug: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setSlug('');
      setSlugManuallyEdited(false);
      setBusy(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(generateLessonId(title));
    }
  }, [title, slugManuallyEdited]);

  if (!open) return null;

  const trimmedTitle = title.trim();
  const validSlug = SLUG_RE.test(slug);
  const canSubmit = trimmedTitle.length > 0 && validSlug && !busy;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const ref = doc(db, 'projectPages', slug);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        setError('Проект с таким slug уже существует.');
        setBusy(false);
        return;
      }
      const payload: ProjectPageDocument & { updatedAt: ReturnType<typeof serverTimestamp> } = {
        version: 1,
        lastModified: new Date().toISOString(),
        title: trimmedTitle,
        intro: '',
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, payload);
      onCreated(slug);
    } catch (err) {
      debugError('CreateProjectModal: create failed', err);
      setError('Не удалось создать проект. Возможно, нет прав super-admin.');
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-bold text-[#2C3E50]">Новый проект</h2>

        <div className="space-y-3">
          <div>
            <label className={LABEL_CLASS}>Название</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: «Тёплые ключи»"
              className={`${INPUT_CLASS} mt-1`}
              autoFocus
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>
              Slug (URL: /projects/<span className="font-mono">{slug || '…'}</span>)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                setSlug(e.target.value.toLowerCase());
              }}
              placeholder="warm-springs-2"
              className={`${INPUT_CLASS} mt-1 font-mono`}
            />
            <p className="mt-1 text-xs text-[#8A97AB]">
              Только латиница, цифры и дефисы. Авто-генерируется из названия.
            </p>
            {slug && !validSlug ? (
              <p className="mt-1 text-xs text-rose-700">
                Недопустимый slug. Разрешено: a–z, 0–9, дефис.
              </p>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md bg-[#EEF2F7] px-4 py-2 text-sm text-[#2C3E50] hover:bg-[#DDE5EE] disabled:opacity-40"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSubmit}
            className="rounded-md bg-[#2F6DB5] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F4F86] disabled:opacity-40"
          >
            {busy ? 'Создаём…' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}
