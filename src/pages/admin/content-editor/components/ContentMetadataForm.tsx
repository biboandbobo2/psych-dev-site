import { SELECTABLE_TEXT_STYLE } from '../utils/constants';

interface ContentMetadataFormProps {
  periodId: string | undefined;
  title: string;
  setTitle: (value: string) => void;
  subtitle: string;
  setSubtitle: (value: string) => void;
  order: number;
  setOrder: (value: number) => void;
  published: boolean;
  setPublished: (value: boolean) => void;
  placeholderEnabled: boolean;
  setPlaceholderEnabled: (value: boolean) => void;
  placeholderDisplayText: string;
}

/**
 * Form section for basic content metadata
 */
export function ContentMetadataForm({
  periodId,
  title,
  setTitle,
  subtitle,
  setSubtitle,
  order,
  setOrder,
  published,
  setPublished,
  placeholderEnabled,
  setPlaceholderEnabled,
  placeholderDisplayText,
}: ContentMetadataFormProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-xl font-bold">📋 Основная информация</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Название *</label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={SELECTABLE_TEXT_STYLE}
            placeholder="Пренатальный период"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Подзаголовок</label>
          <input
            type="text"
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={SELECTABLE_TEXT_STYLE}
            placeholder="Дополнительное описание (необязательно)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Порядок отображения</label>
          <input
            type="number"
            value={order}
            min={0}
            onChange={(event) => setOrder(parseInt(event.target.value, 10) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={SELECTABLE_TEXT_STYLE}
          />
          <p className="text-xs text-gray-500 mt-1">Меньшее число — выше в списке</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="published"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="published" className="text-sm font-medium cursor-pointer">
            Опубликовано (видно студентам)
          </label>
        </div>
        <p className="text-xs text-gray-500 max-w-prose">
          При отключении период скрывается из меню и недоступен студентам, но вы можете продолжать
          редактирование. Включите, когда материалы готовы.
        </p>

        {periodId !== 'intro' && (
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="placeholderEnabled"
              checked={placeholderEnabled}
              onChange={(event) => setPlaceholderEnabled(event.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <label htmlFor="placeholderEnabled" className="text-sm font-medium cursor-pointer">
                Показывать заглушку «Скоро обновление»
              </label>
              <p className="text-xs text-gray-500 mt-1 max-w-prose">
                Когда заглушка включена, пользователи увидят сообщение: <em>"{placeholderDisplayText}"</em>{' '}
                вместо контента раздела. Отключите, когда материалы готовы к публикации.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
