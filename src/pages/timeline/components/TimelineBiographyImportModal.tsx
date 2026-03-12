import type { ChangeEvent, FormEvent } from 'react';
import { BaseModal, ModalCancelButton, ModalSaveButton } from '../../../components/ui/BaseModal';

interface TimelineBiographyImportModalProps {
  isOpen: boolean;
  sourceUrl: string;
  loading: boolean;
  error: string | null;
  onSourceUrlChange: (value: string) => void;
  onClose: () => void;
  onImport: () => void;
}

export function TimelineBiographyImportModal({
  isOpen,
  sourceUrl,
  loading,
  error,
  onSourceUrlChange,
  onClose,
  onImport,
}: TimelineBiographyImportModalProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onImport();
  };

  const handleUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSourceUrlChange(event.target.value);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Загрузить источник биографии"
      disabled={loading}
      maxWidth="md"
      footer={
        <>
          <ModalCancelButton onClick={onClose} disabled={loading}>
            Отмена
          </ModalCancelButton>
          <ModalSaveButton onClick={onImport} disabled={!sourceUrl.trim()} loading={loading}>
            Построить таймлайн
          </ModalSaveButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Пока поддерживаются только прямые ссылки на статьи Wikipedia. По биографии модель соберёт насыщенный
          таймлайн в формате текущего холста.
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-900">Ссылка на статью Wikipedia</span>
          <input
            type="url"
            value={sourceUrl}
            onChange={handleUrlChange}
            placeholder="https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич"
            autoFocus
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <p className="text-xs text-slate-500">
          Рекомендуется использовать полную URL-ссылку вида `https://ru.wikipedia.org/wiki/...`
        </p>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </form>
    </BaseModal>
  );
}
