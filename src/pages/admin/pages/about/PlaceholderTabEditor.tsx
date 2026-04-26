import type { AboutTab } from '../../../about/aboutContent';

const INPUT_CLASS =
  'w-full rounded-lg border border-[#DDE5EE] bg-white px-3 py-2 text-sm text-[#2C3E50] outline-none transition focus:border-[#2F6DB5] focus:ring-2 focus:ring-[#2F6DB5]/20';
const LABEL_CLASS = 'text-xs font-semibold uppercase tracking-wide text-[#8A97AB]';

type PlaceholderTab = Extract<AboutTab, { kind: 'placeholder' }>;

export function PlaceholderTabEditor({
  tab,
  onChange,
}: {
  tab: PlaceholderTab;
  onChange: (patch: Partial<PlaceholderTab>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className={LABEL_CLASS}>Intro</label>
        <textarea
          value={tab.intro}
          onChange={(e) => onChange({ intro: e.target.value })}
          rows={3}
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>
      <div>
        <label className={LABEL_CLASS}>Note (плашка-заглушка)</label>
        <input
          type="text"
          value={tab.note ?? ''}
          onChange={(e) => onChange({ note: e.target.value || undefined })}
          placeholder="Информация скоро появится."
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>
    </div>
  );
}
