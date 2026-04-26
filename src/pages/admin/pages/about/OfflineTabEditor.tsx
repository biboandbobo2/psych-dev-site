import type { AboutTab } from '../../../about/aboutContent';

const INPUT_CLASS =
  'w-full rounded-lg border border-[#DDE5EE] bg-white px-3 py-2 text-sm text-[#2C3E50] outline-none transition focus:border-[#2F6DB5] focus:ring-2 focus:ring-[#2F6DB5]/20';
const LABEL_CLASS = 'text-xs font-semibold uppercase tracking-wide text-[#8A97AB]';

type OfflineTab = Extract<AboutTab, { kind: 'offline' }>;

export function OfflineTabEditor({
  tab,
  onChange,
}: {
  tab: OfflineTab;
  onChange: (patch: Partial<OfflineTab>) => void;
}) {
  const updateParagraph = (idx: number, value: string) => {
    const next = tab.paragraphs.map((p, i) => (i === idx ? value : p));
    onChange({ paragraphs: next });
  };
  const addParagraph = () => onChange({ paragraphs: [...tab.paragraphs, ''] });
  const removeParagraph = (idx: number) =>
    onChange({ paragraphs: tab.paragraphs.filter((_, i) => i !== idx) });
  const moveParagraph = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= tab.paragraphs.length) return;
    const next = [...tab.paragraphs];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ paragraphs: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLASS}>Intro (выделенная строка)</label>
        <textarea
          value={tab.intro}
          onChange={(e) => onChange({ intro: e.target.value })}
          rows={2}
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className={LABEL_CLASS}>Абзацы</span>
          <button
            type="button"
            onClick={addParagraph}
            className="rounded-md bg-[#EEF2F7] px-3 py-1.5 text-sm text-[#2C3E50] hover:bg-[#DDE5EE]"
          >
            + Абзац
          </button>
        </div>
        <ul className="mt-2 space-y-2">
          {tab.paragraphs.map((p, idx) => (
            <li key={idx} className="rounded-lg border border-[#E5ECF3] bg-[#FAFCFE] p-2">
              <textarea
                value={p}
                onChange={(e) => updateParagraph(idx, e.target.value)}
                rows={3}
                className={INPUT_CLASS}
              />
              <div className="mt-1 flex justify-end gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => moveParagraph(idx, 'up')}
                  disabled={idx === 0}
                  className="rounded px-2 py-1 text-[#556476] hover:bg-[#EEF2F7] disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveParagraph(idx, 'down')}
                  disabled={idx === tab.paragraphs.length - 1}
                  className="rounded px-2 py-1 text-[#556476] hover:bg-[#EEF2F7] disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeParagraph(idx)}
                  className="rounded bg-rose-50 px-2 py-1 text-rose-700 hover:bg-rose-100"
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>Booking path</label>
          <input
            type="text"
            value={tab.bookingPath}
            onChange={(e) => onChange({ bookingPath: e.target.value })}
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Booking label</label>
          <input
            type="text"
            value={tab.bookingLabel}
            onChange={(e) => onChange({ bookingLabel: e.target.value })}
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Instagram URL</label>
          <input
            type="url"
            value={tab.instagramUrl}
            onChange={(e) => onChange({ instagramUrl: e.target.value })}
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Instagram label</label>
          <input
            type="text"
            value={tab.instagramLabel}
            onChange={(e) => onChange({ instagramLabel: e.target.value })}
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
      </div>
    </div>
  );
}
