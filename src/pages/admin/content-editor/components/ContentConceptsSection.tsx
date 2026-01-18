import { EmojiText } from '../../../../components/Emoji';
import { SimpleList } from './SimpleList';

interface ContentConceptsSectionProps {
  concepts: string[];
  setConcepts: (items: string[]) => void;
}

/**
 * Form section for key concepts
 */
export function ContentConceptsSection({ concepts, setConcepts }: ContentConceptsSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-xl font-bold">
        <EmojiText text="💡 Понятия" />
      </h2>
      <SimpleList
        items={concepts}
        onChange={setConcepts}
        label="Ключевые понятия периода"
        placeholder="Введите понятие"
        maxItems={10}
      />
    </div>
  );
}
