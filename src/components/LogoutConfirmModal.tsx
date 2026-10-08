import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { debugError } from '../lib/debug';
import { BaseModal } from './ui/BaseModal';

/** Подтверждение выхода — своё окно вместо window.confirm. */
export function LogoutConfirmModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await signOut(auth);
      onClose();
    } catch (error) {
      debugError('[LogoutConfirmModal] signOut failed', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Выйти из аккаунта?"
      maxWidth="sm"
      disabled={busy}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-fg hover:border-fg"
          >
            Остаться
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-60"
          >
            {busy ? 'Выходим…' : 'Выйти'}
          </button>
        </div>
      }
    >
      <p className="text-sm text-muted">Конспекты, прогресс и наклейки сохранятся — они привязаны к аккаунту.</p>
    </BaseModal>
  );
}
