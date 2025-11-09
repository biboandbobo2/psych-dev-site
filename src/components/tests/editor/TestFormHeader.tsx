interface TestFormHeaderProps {
  title: string;
  onClose: () => void;
}

/**
 * Simple header for the test editor form
 */
export function TestFormHeader({ title, onClose }: TestFormHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-gray-700 px-4 py-2"
        type="button"
      >
        Закрыть
      </button>
    </div>
  );
}
