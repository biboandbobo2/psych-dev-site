import type { ReactNode } from 'react';

interface FieldProps {
  htmlFor: string;
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}

export function Field({ htmlFor, label, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col">
      <label htmlFor={htmlFor} className="mb-1 text-sm font-medium text-zinc-800">
        {label}
      </label>
      {children}
      <div className="mt-1 min-h-[20px] text-xs text-zinc-500">
        {error ? <span className="text-red-600">{error}</span> : hint}
      </div>
    </div>
  );
}
