import type { IconSummary } from '../types';
import { counted } from '../lib/format';
import { collectionSize, recognitionCollections } from '../lib/recognition';
import type { Collection } from '../lib/recognition';

/** Меньше двенадцати работ — это одно-два занятия: честнее сказать это вслух, чем делать вид, что подборка большая. */
const SMALL_COLLECTION = 12;

export function CollectionNote({ icons, collection, onAll }: {
  icons: IconSummary[];
  collection: Collection;
  onAll: () => void;
}) {
  if (collection === 'all') return null;
  const size = collectionSize(icons, collection);
  if (!size || size >= SMALL_COLLECTION) return null;
  const label = recognitionCollections.find((item) => item.id === collection)?.label ?? 'этой подборке';

  return (
    <p className="ico-collection-note" role="status">
      В подборке «{label}» всего {counted(size, 'икона', 'иконы', 'икон')} — повторы неизбежны.{' '}
      <button className="ico-link" onClick={onAll}>Все традиции</button>
    </p>
  );
}
