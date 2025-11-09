import type { TestResource } from '../../../types/tests';

interface QuestionFeedbackEditorProps {
  customRightMsg: string | undefined;
  customWrongMsg: string | undefined;
  resourcesRight: TestResource[];
  resourcesWrong: TestResource[];
  onCustomRightMessageChange: (message: string) => void;
  onCustomWrongMessageChange: (message: string) => void;
  onResourceChange: (
    key: 'resourcesRight' | 'resourcesWrong',
    index: number,
    field: keyof TestResource,
    value: string
  ) => void;
  onAddResource: (key: 'resourcesRight' | 'resourcesWrong') => void;
  onRemoveResource: (key: 'resourcesRight' | 'resourcesWrong', index: number) => void;
}

export function QuestionFeedbackEditor({
  customRightMsg,
  customWrongMsg,
  resourcesRight,
  resourcesWrong,
  onCustomRightMessageChange,
  onCustomWrongMessageChange,
  onResourceChange,
  onAddResource,
  onRemoveResource,
}: QuestionFeedbackEditorProps) {
  return (
    <section className="space-y-3">
      <details className="group rounded-lg border border-gray-200 bg-gray-50">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-800 transition group-open:bg-gray-100">
          Кастомные сообщения
        </summary>
        <div className="space-y-3 px-4 pb-4 pt-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Сообщение при правильном ответе
            </label>
            <textarea
              value={customRightMsg ?? ''}
              onChange={(event) => onCustomRightMessageChange(event.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Сообщение при неправильном ответе
            </label>
            <textarea
              value={customWrongMsg ?? ''}
              onChange={(event) => onCustomWrongMessageChange(event.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
      </details>

      <details className="group rounded-lg border border-gray-200 bg-gray-50">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-800 transition group-open:bg-gray-100">
          Рекомендуемые материалы
        </summary>
        <div className="space-y-4 px-4 pb-4 pt-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Для правильного ответа
              </span>
              <button
                type="button"
                onClick={() => onAddResource('resourcesRight')}
                className="text-xs font-medium text-green-700 hover:text-green-900"
              >
                + Добавить ресурс
              </button>
            </div>
            {resourcesRight.length === 0 ? (
              <p className="text-xs text-gray-500">
                Добавьте ссылки, которые появятся после правильного ответа.
              </p>
            ) : (
              <div className="space-y-3">
                {resourcesRight.map((resource, index) => (
                  <div
                    key={index}
                    className="space-y-2 rounded-md border border-green-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-semibold text-green-700">
                        Ресурс {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveResource('resourcesRight', index)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Удалить
                      </button>
                    </div>
                    <input
                      type="text"
                      value={resource.title}
                      onChange={(event) =>
                        onResourceChange('resourcesRight', index, 'title', event.target.value)
                      }
                      placeholder="Название материала"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                    />
                    <input
                      type="url"
                      value={resource.url}
                      onChange={(event) =>
                        onResourceChange('resourcesRight', index, 'url', event.target.value)
                      }
                      placeholder="https://..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                Для неправильного ответа
              </span>
              <button
                type="button"
                onClick={() => onAddResource('resourcesWrong')}
                className="text-xs font-medium text-orange-700 hover:text-orange-900"
              >
                + Добавить ресурс
              </button>
            </div>
            {resourcesWrong.length === 0 ? (
              <p className="text-xs text-gray-500">
                Укажите ссылки, которые помогут участнику разобраться с ошибкой.
              </p>
            ) : (
              <div className="space-y-3">
                {resourcesWrong.map((resource, index) => (
                  <div
                    key={index}
                    className="space-y-2 rounded-md border border-orange-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-semibold text-orange-700">
                        Ресурс {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveResource('resourcesWrong', index)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Удалить
                      </button>
                    </div>
                    <input
                      type="text"
                      value={resource.title}
                      onChange={(event) =>
                        onResourceChange('resourcesWrong', index, 'title', event.target.value)
                      }
                      placeholder="Название материала"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                    <input
                      type="url"
                      value={resource.url}
                      onChange={(event) =>
                        onResourceChange('resourcesWrong', index, 'url', event.target.value)
                      }
                      placeholder="https://..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}
