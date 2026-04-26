import type { AboutTab } from '../../../about/aboutContent';
import type { Partner } from '../../../about/partnersContent';

const INPUT_CLASS =
  'w-full rounded-lg border border-[#DDE5EE] bg-white px-3 py-2 text-sm text-[#2C3E50] outline-none transition focus:border-[#2F6DB5] focus:ring-2 focus:ring-[#2F6DB5]/20';
const LABEL_CLASS = 'text-xs font-semibold uppercase tracking-wide text-[#8A97AB]';

type PartnersTab = Extract<AboutTab, { kind: 'partners' }>;

function makePartnerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `partner-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `partner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function PartnerCard({
  partner,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  partner: Partner;
  index: number;
  total: number;
  onUpdate: (patch: Partial<Partner>) => void;
  onRemove: () => void;
  onMove: (dir: 'up' | 'down') => void;
}) {
  const updateDescription = (idx: number, value: string) => {
    const next = partner.description.map((p, i) => (i === idx ? value : p));
    onUpdate({ description: next });
  };
  const addDescription = () => onUpdate({ description: [...partner.description, ''] });
  const removeDescription = (idx: number) =>
    onUpdate({ description: partner.description.filter((_, i) => i !== idx) });

  return (
    <li className="rounded-2xl border border-[#E5ECF3] bg-[#FAFCFE] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-[#8A97AB]">
          Партнёр {index + 1} <span className="font-mono opacity-70">({partner.id})</span>
        </div>
        <div className="flex items-center gap-1">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>Название</label>
          <input
            type="text"
            value={partner.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>URL</label>
          <input
            type="url"
            value={partner.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className={LABEL_CLASS}>Описание (абзацы)</span>
          <button
            type="button"
            onClick={addDescription}
            className="rounded-md bg-[#EEF2F7] px-3 py-1 text-xs text-[#2C3E50] hover:bg-[#DDE5EE]"
          >
            + Абзац
          </button>
        </div>
        <ul className="mt-2 space-y-2">
          {partner.description.map((p, idx) => (
            <li key={idx} className="flex gap-2">
              <textarea
                value={p}
                onChange={(e) => updateDescription(idx, e.target.value)}
                rows={3}
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => removeDescription(idx)}
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

export function PartnersTabEditor({
  tab,
  partners,
  onTabChange,
  onPartnersChange,
}: {
  tab: PartnersTab;
  partners: Partner[];
  onTabChange: (patch: Partial<PartnersTab>) => void;
  onPartnersChange: (next: Partner[]) => void;
}) {
  const updatePartner = (idx: number, patch: Partial<Partner>) => {
    const next = partners.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    onPartnersChange(next);
  };
  const removePartner = (idx: number) =>
    onPartnersChange(partners.filter((_, i) => i !== idx));
  const addPartner = () =>
    onPartnersChange([
      ...partners,
      { id: makePartnerId(), name: '', url: '', description: [''] },
    ]);
  const movePartner = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= partners.length) return;
    const next = [...partners];
    [next[idx], next[target]] = [next[target], next[idx]];
    onPartnersChange(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLASS}>Intro вкладки</label>
        <textarea
          value={tab.intro}
          onChange={(e) => onTabChange({ intro: e.target.value })}
          rows={3}
          className={`${INPUT_CLASS} mt-1`}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className={LABEL_CLASS}>Партнёры</span>
          <button
            type="button"
            onClick={addPartner}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
          >
            + Партнёр
          </button>
        </div>
        <ul className="mt-2 space-y-3">
          {partners.map((partner, idx) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              index={idx}
              total={partners.length}
              onUpdate={(patch) => updatePartner(idx, patch)}
              onRemove={() => removePartner(idx)}
              onMove={(dir) => movePartner(idx, dir)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
