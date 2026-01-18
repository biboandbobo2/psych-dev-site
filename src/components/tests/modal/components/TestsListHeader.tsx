import { Emoji } from '../../../Emoji';

interface TestsListHeaderProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  onCreateNew: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
}

/**
 * Header component with create/import/export controls
 */
export function TestsListHeader({
  fileInputRef,
  onCreateNew,
  onFileChange,
  onDownloadTemplate,
}: TestsListHeaderProps) {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={onFileChange}
        className="hidden"
      />

      <div className="w-full rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 transition hover:border-blue-400">
        <div className="flex items-stretch">
          <button
            onClick={onCreateNew}
            className="flex flex-1 items-center gap-3 px-6 py-4 text-left transition hover:bg-blue-100"
          >
            <Emoji token="➕" size={24} />
            <div>
              <h3 className="text-lg font-bold text-blue-700">
                Создать новый тест
              </h3>
              <p className="text-sm text-blue-600">
                Создайте тест для курса или возрастного периода
              </p>
            </div>
          </button>

          <div className="flex flex-col border-l-2 border-blue-300">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-4 py-2 text-blue-700 transition hover:bg-blue-100"
              title="Импортировать тест из JSON"
            >
              <Emoji token="📥" size={18} />
            </button>
            <button
              onClick={onDownloadTemplate}
              className="flex-1 border-t-2 border-blue-300 px-4 py-2 text-blue-700 transition hover:bg-blue-100"
              title="Скачать шаблон JSON теста"
            >
              <Emoji token="📄" size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
