import type { FC } from 'react';

export const PageLoader: FC<{ label?: string }> = ({ label = 'Загрузка...' }) => (
  <div className="flex w-full flex-1 items-center justify-center px-4 py-10">
    <div className="flex items-center gap-3 text-base font-medium text-muted">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      <span className="text-lg text-fg">{label}</span>
    </div>
  </div>
);
