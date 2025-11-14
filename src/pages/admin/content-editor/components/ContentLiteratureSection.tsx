import { EditableList } from './EditableList';
import { SELECTABLE_TEXT_STYLE } from '../utils/constants';

interface ContentLiteratureSectionProps {
  coreLiterature: Array<{ title: string; url: string }>;
  setCoreLiterature: (items: Array<{ title: string; url: string }>) => void;
  extraLiterature: Array<{ title: string; url: string }>;
  setExtraLiterature: (items: Array<{ title: string; url: string }>) => void;
  extraVideos: Array<{ title: string; url: string }>;
  setExtraVideos: (items: Array<{ title: string; url: string }>) => void;
  leisure: Array<{ title?: string; url?: string; type?: string; year?: string }>;
  setLeisure: (
    items: Array<{ title?: string; url?: string; type?: string; year?: string }>
  ) => void;
  selfQuestionsUrl: string;
  setSelfQuestionsUrl: (value: string) => void;
}

/**
 * Form section for literature and additional materials
 */
export function ContentLiteratureSection({
  coreLiterature,
  setCoreLiterature,
  extraLiterature,
  setExtraLiterature,
  extraVideos,
  setExtraVideos,
  leisure,
  setLeisure,
  selfQuestionsUrl,
  setSelfQuestionsUrl,
}: ContentLiteratureSectionProps) {
  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">📚 Основная литература</h2>
        <EditableList
          items={coreLiterature}
          onChange={(items) => setCoreLiterature(items as Array<{ title: string; url: string }>)}
          label="Обязательная литература для периода"
          placeholder="Название книги/статьи"
          maxItems={10}
          showUrl={true}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">📖 Дополнительная литература</h2>
        <EditableList
          items={extraLiterature}
          onChange={(items) => setExtraLiterature(items as Array<{ title: string; url: string }>)}
          label="Дополнительные материалы для изучения"
          placeholder="Название материала"
          maxItems={10}
          showUrl={true}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">🎬 Дополнительные видео</h2>
        <EditableList
          items={extraVideos}
          onChange={(items) => setExtraVideos(items as Array<{ title: string; url: string }>)}
          label="Дополнительные видео-материалы"
          placeholder="Название видео"
          maxItems={10}
          showUrl={true}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">🎲 Досуговое</h2>
        <EditableList
          items={leisure}
          onChange={(items) =>
            setLeisure(
              items as Array<{ title?: string; url?: string; type?: string; year?: string }>
            )
          }
          label="Рекомендации для вдохновения"
          placeholder="Название (книга, фильм, подкаст...)"
          maxItems={10}
          showUrl={true}
          extraFields={[
            { key: 'type', placeholder: 'Тип (книга, фильм, выставка...)' },
            { key: 'year', placeholder: 'Год или период (опционально)' },
          ]}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-2">
        <h2 className="text-xl font-bold">✏️ Вопросы для самопроверки</h2>
        <label className="block text-sm font-medium mb-2">Ссылка на квиз/рабочую тетрадь</label>
        <input
          type="url"
          value={selfQuestionsUrl}
          onChange={(event) => setSelfQuestionsUrl(event.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          style={SELECTABLE_TEXT_STYLE}
        />
        {selfQuestionsUrl && (
          <a
            href={selfQuestionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm text-blue-600 no-underline hover:no-underline focus-visible:no-underline"
          >
            🔗 Открыть материал
          </a>
        )}
      </div>
    </>
  );
}
