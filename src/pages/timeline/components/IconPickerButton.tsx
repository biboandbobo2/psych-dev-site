import { useState, useEffect, useRef } from 'react';
import { Icon, type EventIconId } from '../../../components/Icon';
import { EVENT_ICONS } from '../../../data/eventIcons';

export type IconPickerTone = 'emerald' | 'sky';

interface IconPickerButtonProps {
  value: EventIconId | null;
  onChange: (value: EventIconId | null) => void;
  tone: IconPickerTone;
}

const TRIGGER_ICON_SRC = '/icons/icon-picker-trigger.png';

const TONE_STYLES: Record<IconPickerTone, {
  button: string;
  active: string;
  header: string;
  popover: string;
  reset: string;
}> = {
  emerald: {
    button: 'border-emerald-200 hover:border-emerald-300',
    active: 'border-emerald-400 shadow-md',
    header: 'text-emerald-700',
    popover: 'border-emerald-200',
    reset: 'border-emerald-200 text-emerald-600 hover:bg-emerald-50',
  },
  sky: {
    button: 'border-sky-200 hover:border-sky-300',
    active: 'border-sky-400 shadow-md',
    header: 'text-sky-700',
    popover: 'border-sky-200',
    reset: 'border-slate-200 text-slate-600 hover:bg-slate-100',
  },
};

export function IconPickerButton({ value, onChange, tone }: IconPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const styles = TONE_STYLES[tone];

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border bg-white/85 transition ${styles.button}`}
        title="Выбрать пиктограмму события"
      >
        {value ? (
          <Icon name={value} size={24} />
        ) : (
          <img src={TRIGGER_ICON_SRC} alt="Выбрать иконку" className="h-6 w-6" loading="lazy" />
        )}
      </button>
      {open && (
        <div
          ref={popoverRef}
          className={`absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border ${styles.popover} bg-white/95 p-3 shadow-2xl backdrop-blur-md`}
        >
          <div className={`mb-2 text-xs font-semibold uppercase tracking-[0.2em] ${styles.header}`}>Пиктограмма</div>
          <div className="grid grid-cols-5 gap-2">
            {EVENT_ICONS.map((icon) => {
              const isActive = value === icon.id;
              return (
                <button
                  type="button"
                  key={icon.id}
                  onClick={() => {
                    onChange(icon.id);
                    setOpen(false);
                  }}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-white/85 transition ${isActive ? styles.active : 'border-transparent hover:border-slate-200'}`}
                >
                  <Icon name={icon.id} size={30} />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`mt-3 w-full rounded-xl border bg-white/85 px-3 py-1.5 text-xs font-medium transition ${styles.reset}`}
          >
            Без пиктограммы
          </button>
        </div>
      )}
    </div>
  );
}
