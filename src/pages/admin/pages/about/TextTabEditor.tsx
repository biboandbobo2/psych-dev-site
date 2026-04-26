import type { AboutTab, AboutTextSection } from '../../../about/aboutContent';

const INPUT_CLASS =
  'w-full rounded-lg border border-[#DDE5EE] bg-white px-3 py-2 text-sm text-[#2C3E50] outline-none transition focus:border-[#2F6DB5] focus:ring-2 focus:ring-[#2F6DB5]/20';
const LABEL_CLASS = 'text-xs font-semibold uppercase tracking-wide text-[#8A97AB]';

type TextTab = Extract<AboutTab, { kind: 'text' }>;

function SectionEditor({
  section,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  section: AboutTextSection;
  index: number;
  total: number;
  onUpdate: (patch: Partial<AboutTextSection>) => void;
  onRemove: () => void;
  onMove: (dir: 'up' | 'down') => void;
}) {
  const updateParagraph = (idx: number, value: string) => {
    const next = section.paragraphs.map((p, i) => (i === idx ? value : p));
    onUpdate({ paragraphs: next });
  };
  const addParagraph = () => onUpdate({ paragraphs: [...section.paragraphs, ''] });
  const removeParagraph = (idx: number) =>
    onUpdate({ paragraphs: section.paragraphs.filter((_, i) => i !== idx) });

  return (
    <li className="rounded-lg border border-[#E5ECF3] bg-[#FAFCFE] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <label className={LABEL_CLASS}>Заголовок секции (опционально)</label>
          <input
            type="text"
            value={section.heading ?? ''}
            onChange={(e) => onUpdate({ heading: e.target.value || undefined })}
            placeholder="Например: «Что это такое»"
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
        <div className="flex items-center gap-1 pt-5">
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={index === 0}
            className="rounded-md px-2 py-1 text-[#556476] hover:bg-[#EEF2F7] disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={index === total - 1}
            className="rounded-md px-2 py-1 text-[#556476] hover:bg-[#EEF2F7] disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md bg-rose-50 px-3 py-1 text-sm text-rose-700 hover:bg-rose-100"
          >
            Удалить
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className={LABEL_CLASS}>Абзацы</span>
          <button
            type="button"
            onClick={addParagraph}
            className="rounded-md bg-[#EEF2F7] px-3 py-1 text-xs text-[#2C3E50] hover:bg-[#DDE5EE]"
          >
            + Абзац
          </button>
        </div>
        <ul className="mt-2 space-y-2">
          {section.paragraphs.map((p, idx) => (
            <li key={idx} className="flex gap-2">
              <textarea
                value={p}
                onChange={(e) => updateParagraph(idx, e.target.value)}
                rows={3}
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => removeParagraph(idx)}
                className="self-start rounded bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

export function TextTabEditor({
  tab,
  onChange,
}: {
  tab: TextTab;
  onChange: (patch: Partial<TextTab>) => void;
}) {
  const updateSection = (idx: number, patch: Partial<AboutTextSection>) => {
    const next = tab.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ sections: next });
  };
  const removeSection = (idx: number) =>
    onChange({ sections: tab.sections.filter((_, i) => i !== idx) });
  const addSection = () =>
    onChange({ sections: [...tab.sections, { heading: '', paragraphs: [''] }] });
  const moveSection = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= tab.sections.length) return;
    const next = [...tab.sections];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ sections: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLASS}>Intro (опционально, до секций)</label>
        <textarea
          value={tab.intro ?? ''}
          onChange={(e) => onChange({ intro: e.target.value || undefined })}
          rows={3}
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className={LABEL_CLASS}>Секции</span>
          <button
            type="button"
            onClick={addSection}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
          >
            + Секция
          </button>
        </div>
        <ul className="mt-2 space-y-3">
          {tab.sections.map((section, idx) => (
            <SectionEditor
              key={idx}
              section={section}
              index={idx}
              total={tab.sections.length}
              onUpdate={(patch) => updateSection(idx, patch)}
              onRemove={() => removeSection(idx)}
              onMove={(dir) => moveSection(idx, dir)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
