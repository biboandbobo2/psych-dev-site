import { SectionMuted } from '../../../components/ui/Section';

export function EmptyState() {
  return (
    <div className="bg-bg text-fg min-h-screen flex items-center justify-center px-4">
      <SectionMuted className="max-w-lg mx-auto !mb-0">
        <h2 className="text-3xl font-semibold leading-snug text-fg">Нет данных для отображения</h2>
        <p className="text-lg leading-8 text-muted">
          Проверьте файл CSV с периодами. Похоже, там пусто.
        </p>
      </SectionMuted>
    </div>
  );
}
