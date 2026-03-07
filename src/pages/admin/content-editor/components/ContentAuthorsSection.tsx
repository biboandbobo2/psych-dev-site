import { EditableList } from './EditableList';

interface ContentAuthorsSectionProps {
  authors: Array<{ name: string; url?: string }>;
  setAuthors: (items: Array<{ name: string; url?: string }>) => void;
}

/**
 * Form section for key authors
 */
export function ContentAuthorsSection({ authors, setAuthors }: ContentAuthorsSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-2">
      <h2 className="text-xl font-bold">👤 Ключевые авторы</h2>
      <EditableList
        items={authors}
        onChange={(items) => setAuthors(items as Array<{ name: string; url?: string }>)}
        label="Авторы исследований"
        placeholder="Имя автора"
        maxItems={10}
        showUrl={true}
        primaryField="name"
      />
      <p className="text-xs text-gray-500">URL необязателен — можно указать только имя</p>
    </div>
  );
}
