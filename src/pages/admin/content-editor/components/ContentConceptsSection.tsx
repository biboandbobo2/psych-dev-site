import { EditableList } from './EditableList';

interface ContentConceptsSectionProps {
  concepts: Array<{ name: string; url?: string }>;
  setConcepts: (items: Array<{ name: string; url?: string }>) => void;
}

/**
 * Form section for key concepts (with optional URLs)
 */
export function ContentConceptsSection({ concepts, setConcepts }: ContentConceptsSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-2">
      <h2 className="text-xl font-bold">💡 Понятия</h2>
      <EditableList
        items={concepts}
        onChange={(items) => setConcepts(items as Array<{ name: string; url?: string }>)}
        label="Ключевые понятия периода"
        placeholder="Введите понятие"
        maxItems={10}
        showUrl={true}
      />
      <p className="text-xs text-gray-500">URL необязателен — можно указать только название</p>
    </div>
  );
}
