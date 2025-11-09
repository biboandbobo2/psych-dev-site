import type { CSSProperties } from 'react';

/**
 * CSS style to make text inputs selectable (for copy-paste)
 */
export const SELECTABLE_TEXT_STYLE: CSSProperties = {
  WebkitUserSelect: 'text',
  MozUserSelect: 'text',
  msUserSelect: 'text',
  userSelect: 'text',
};
