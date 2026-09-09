import type { CSSProperties } from 'react';

/**
 * Нативный `<select>` рисует стрелку вплотную к краю. Прячем её и рисуем свой
 * шеврон фоном с отступом; классы добавляются к обычному классу поля.
 */
export const SELECT_CHEVRON_CLASS =
  'appearance-none bg-no-repeat bg-[length:1rem_1rem] bg-[right_0.75rem_center] pr-9';

export const SELECT_CHEVRON_STYLE: CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%236B7280' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
};
