interface NewRoleFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export function NewRoleForm({ value, onChange, onSubmit, disabled }: NewRoleFormProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Новая роль
      </label>
      <div className="flex flex-col gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Например: Контент-редактор"
          className="w-full rounded-2xl border border-slate-200/70 bg-white/90 px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white/90 disabled:opacity-60"
        >
          Добавить роль
        </button>
      </div>
    </div>
  );
}
