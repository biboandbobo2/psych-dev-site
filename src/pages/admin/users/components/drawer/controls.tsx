/** Мелкие контролы карточки: тумблер и двухшаговое подтверждение. */
import { useState, type ReactNode } from 'react';

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Доступное имя тумблера (в DOM не показывается). */
  label: string;
  /** Подпись слева от тумблера. */
  hint?: ReactNode;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      {hint}
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-border-cool transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-card after:transition-transform checked:bg-accent checked:after:translate-x-4 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </span>
  );
}

const BUTTON = 'h-8 rounded-lg px-3 text-[13px] font-semibold transition disabled:opacity-60';

/**
 * Опасное действие в два шага вместо window.confirm: клик по кнопке
 * раскрывает вопрос с подтверждением и отменой.
 */
export function ConfirmAction({
  label,
  question,
  confirmLabel,
  onConfirm,
  disabled,
  danger,
}: {
  label: string;
  question: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  disabled?: boolean;
  danger?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setArmed(true)}
        className={`${BUTTON} border ${
          danger
            ? 'border-pastel-terracotta bg-card text-ink hover:bg-pastel-terracotta'
            : 'border-border bg-card text-fg hover:bg-card2'
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted">{question}</span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
            setArmed(false);
          } finally {
            setBusy(false);
          }
        }}
        className={`${BUTTON} bg-accent text-white hover:opacity-90`}
      >
        {busy ? 'Ждите…' : confirmLabel}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setArmed(false)}
        className={`${BUTTON} border border-border bg-card text-fg hover:bg-card2`}
      >
        Отмена
      </button>
    </span>
  );
}
