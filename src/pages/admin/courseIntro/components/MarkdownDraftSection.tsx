import { MarkdownView } from '../../../../lib/MarkdownView';
import { INPUT_CLASS, SECTION_CLASS } from './styles';

interface MarkdownDraftSectionProps {
  title: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  placeholder?: string;
  // AI-черновик
  aiLabel: string;
  generating: boolean;
  onGenerate: () => void;
}

/**
 * Секция «Идея курса» / «Программа» — textarea с markdown + кнопкой
 * AI-черновика и preview-пэйном. Используется дважды на странице
 * CourseIntroEditor.
 */
export function MarkdownDraftSection({
  title,
  hint,
  value,
  onChange,
  rows,
  placeholder,
  aiLabel,
  generating,
  onGenerate,
}: MarkdownDraftSectionProps) {
  return (
    <section className={SECTION_CLASS}>
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[#2C3E50]">{title}</h2>
          <p className="text-xs text-[#8A97AB]">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="rounded-md bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
          title="Сгенерировать черновик через Gemini Flash"
        >
          {generating ? 'Генерируем…' : aiLabel}
        </button>
      </header>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`${INPUT_CLASS} font-mono text-sm`}
      />
      {value.trim() ? (
        <details className="text-sm text-[#556476]">
          <summary className="cursor-pointer text-xs text-[#8A97AB]">Предпросмотр</summary>
          <MarkdownView
            source={value}
            className="mt-2 space-y-2 rounded-md bg-[#F9FBFF] p-3 [&_p]:leading-relaxed"
          />
        </details>
      ) : null}
    </section>
  );
}
