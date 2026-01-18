import { useEffect, useRef } from 'react';
import { AiAssistantBlock } from './AiAssistantBlock';
import { Emoji } from '../../../components/Emoji';

interface AiAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AiAssistantDrawer({ open, onClose }: AiAssistantDrawerProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <section
        className="relative h-full max-h-screen w-full max-w-[600px] overflow-y-auto bg-white shadow-2xl border-l border-border translate-x-0 transition-transform duration-200"
        aria-label="AI помощник"
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">AI помощник</p>
            <h2 className="text-lg font-semibold text-fg">Вопросы и поиск по книгам</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:text-fg hover:bg-card transition"
            aria-label="Закрыть"
          >
            <Emoji token="✕" size={16} />
          </button>
        </header>

        <div className="px-6 py-4">
          <AiAssistantBlock />
        </div>
      </section>
    </div>
  );
}
