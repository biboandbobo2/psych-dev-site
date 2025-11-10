import { Skeleton } from '../../../components/ui/Skeleton';

export function LoadingSplash() {
  return (
    <div className="bg-bg text-fg min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <p className="text-sm leading-6 text-muted uppercase tracking-[0.2em]">Загрузка</p>
          <p className="text-4xl md:text-5xl font-semibold tracking-tight">Psych-Dev</p>
          <p className="text-sm leading-6 text-muted max-w-sm mx-auto">
            Собираем материалы и структуры разделов. Пожалуйста, подождите.
          </p>
        </div>
        <div className="space-y-3 w-72 mx-auto">
          <Skeleton className="h-3" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}
