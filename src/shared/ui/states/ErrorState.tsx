import { SectionMuted } from '../../../components/ui/Section';

interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="bg-bg text-fg min-h-screen flex items-center justify-center px-4">
      <SectionMuted className="max-w-lg mx-auto !mb-0">
        <h2 className="text-3xl font-semibold leading-snug text-fg">Не удалось загрузить данные</h2>
        <p className="text-lg leading-8 text-muted">{message}</p>
      </SectionMuted>
    </div>
  );
}
