/**
 * Модальное окно массовой загрузки книг (до 20 PDF)
 */
import { useState, useRef, type ChangeEvent } from 'react';
import { BOOK_LANGUAGE_LABELS, BOOK_TAG_LABELS } from '../../../constants/books';
import type { BookLanguage, BookTag } from '../../../types/books';
import { useBulkUpload } from './useBulkUpload';

interface BulkUploadModalProps {
  onComplete: () => void;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BulkUploadModal({ onComplete, onClose }: BulkUploadModalProps) {
  const [language, setLanguage] = useState<BookLanguage>('ru');
  const [tags, setTags] = useState<BookTag[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    files,
    isRunning,
    result,
    validCount,
    addFiles,
    removeFile,
    updateTitle,
    startUpload,
    reset,
  } = useBulkUpload({ language, tags, onComplete });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    // Reset input so the same files can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isRunning) return;
    reset();
    onClose();
  };

  // ============================================================================
  // PHASE 3: Result
  // ============================================================================
  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="text-lg font-semibold">Результат загрузки</h2>
            <button
              onClick={handleClose}
              className="text-muted hover:text-foreground text-xl leading-none"
            >
              &times;
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-4">
            <p className="text-sm font-medium">
              Успешно: {result.success} из {result.total}
              {result.failed > 0 && (
                <span className="text-red-600 ml-2">
                  (ошибок: {result.failed})
                </span>
              )}
            </p>

            <div className="space-y-2">
              {result.items.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    item.status === 'done' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                  }`}
                >
                  <span className="flex-shrink-0">
                    {item.status === 'done' ? '\u2713' : '\u2717'}
                  </span>
                  <span className="truncate flex-1">{item.title}</span>
                  {item.error && (
                    <span className="text-xs text-red-600 flex-shrink-0">{item.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end p-5 border-t border-border">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE 1 & 2: File selection / Uploading
  // ============================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">Массовая загрузка книг</h2>
          {!isRunning && (
            <button
              onClick={handleClose}
              className="text-muted hover:text-foreground text-xl leading-none"
            >
              &times;
            </button>
          )}
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Settings */}
          {!isRunning && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Язык (для всех книг)</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as BookLanguage)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card"
                >
                  {Object.entries(BOOK_LANGUAGE_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Теги (для всех книг)</label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(BOOK_TAG_LABELS) as [BookTag, string][]).map(([tag, label]) => (
                    <label
                      key={tag}
                      className={`px-2.5 py-0.5 rounded-full text-xs cursor-pointer transition ${
                        tags.includes(tag)
                          ? 'bg-accent text-white'
                          : 'bg-card2 text-muted hover:bg-card2/80'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={tags.includes(tag)}
                        onChange={(e) => {
                          if (e.target.checked) setTags([...tags, tag]);
                          else setTags(tags.filter((t) => t !== tag));
                        }}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* File picker */}
          {!isRunning && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-dashed border-border rounded-lg hover:bg-card2 transition text-sm w-full"
              >
                Выбрать PDF файлы (до 20)
              </button>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {isRunning && (
                <p className="text-sm text-muted">
                  Загружено: {files.filter((f) => f.status === 'done').length} из {files.length}
                </p>
              )}

              {files.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm"
                >
                  {/* Title (editable when not running) */}
                  <div className="flex-1 min-w-0">
                    {!isRunning ? (
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateTitle(index, e.target.value)}
                        className="w-full px-2 py-1 border border-border rounded bg-card text-sm"
                      />
                    ) : (
                      <span className="truncate block">{item.title}</span>
                    )}
                  </div>

                  {/* Size */}
                  <span className="text-xs text-muted flex-shrink-0 w-16 text-right">
                    {formatFileSize(item.file.size)}
                  </span>

                  {/* Status / Progress */}
                  <div className="flex-shrink-0 w-24">
                    {item.status === 'pending' && !isRunning && (
                      <span className="text-xs text-muted">Готов</span>
                    )}
                    {item.status === 'pending' && isRunning && (
                      <span className="text-xs text-muted">В очереди</span>
                    )}
                    {(item.status === 'creating' || item.status === 'uploading' || item.status === 'processing') && (
                      <div className="w-full bg-card2 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            item.status === 'processing' ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                    {item.status === 'done' && (
                      <span className="text-xs text-emerald-600 font-medium">{'\u2713'} Обработка</span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-xs text-red-600" title={item.error ?? undefined}>
                        {'\u2717'} Ошибка
                      </span>
                    )}
                  </div>

                  {/* Remove button */}
                  {!isRunning && (
                    <button
                      onClick={() => removeFile(index)}
                      className="text-muted hover:text-red-600 flex-shrink-0"
                      title="Убрать"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Running warning */}
          {isRunning && (
            <p className="text-xs text-muted text-center">
              Не закрывайте это окно до завершения загрузки
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-5 border-t border-border">
          {!isRunning && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-border rounded-lg hover:bg-card2 transition"
              >
                Отмена
              </button>
              <button
                onClick={startUpload}
                disabled={validCount === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                Загрузить {validCount > 0 ? `${validCount} файл${validCount === 1 ? '' : validCount < 5 ? 'а' : 'ов'}` : ''}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
