import type { CSSProperties } from 'react';
import type { DisorderTableEntry } from '../../../features/disorderTable';
import { buildPreviewText, renderHighlightedText } from '../utils/highlight';

const TEXT_CLAMP_STYLE: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

interface CellProps {
  rowId: string;
  columnId: string;
  cellEntries: DisorderTableEntry[];
  cellCommentCount: number;
  isSelected: boolean;
  isCellSelectionMode: boolean;
  isMobile: boolean;
  normalizedSearch: string;
  onClick: (rowId: string, columnId: string) => void;
}

/** Одна ячейка disorder-table (превью первой записи + бэйджи треков + счётчик комментариев). */
export function Cell({
  rowId,
  columnId,
  cellEntries,
  cellCommentCount,
  isSelected,
  isCellSelectionMode,
  isMobile,
  normalizedSearch,
  onClick,
}: CellProps) {
  const previewText =
    cellEntries.length > 0 ? buildPreviewText(cellEntries[0].text, normalizedSearch, 120) : '';
  const hasPatopsychology = cellEntries.some((entry) => entry.track === 'patopsychology');
  const hasPsychiatry = cellEntries.some((entry) => entry.track === 'psychiatry');
  const isMixedTrack = hasPatopsychology && hasPsychiatry;

  const cellToneClass = isMixedTrack
    ? 'border-violet-300'
    : hasPatopsychology
      ? 'border-sky-300 bg-sky-50/80'
      : hasPsychiatry
        ? 'border-fuchsia-300 bg-fuchsia-50/80'
        : 'border-slate-200 bg-white';

  const cellToneStyle = isMixedTrack
    ? {
        backgroundImage:
          'linear-gradient(135deg, rgb(224 242 254) 0%, rgb(224 242 254) 50%, rgb(250 232 255) 50%, rgb(250 232 255) 100%)',
      }
    : undefined;

  return (
    <td className="border-b border-r border-slate-200 bg-white p-1.5 align-top">
      <button
        type="button"
        onClick={() => onClick(rowId, columnId)}
        className={`relative min-h-[72px] w-full rounded-lg border px-2 py-2 text-left text-[11px] transition ${cellToneClass} ${
          isSelected ? 'ring-2 ring-amber-300' : 'hover:border-blue-300 hover:bg-blue-50/40'
        }`}
        style={cellToneStyle}
      >
        {isCellSelectionMode && !isMobile && (
          <span
            className={`absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
              isSelected
                ? 'border-amber-500 bg-amber-200 text-amber-900'
                : 'border-slate-300 bg-white text-slate-400'
            }`}
          >
            {isSelected ? '✓' : ''}
          </span>
        )}

        {cellEntries.length === 0 ? (
          <p className="text-slate-400">Пусто</p>
        ) : (
          <>
            <p
              className="break-words pr-5 text-slate-700 [overflow-wrap:anywhere]"
              style={TEXT_CLAMP_STYLE}
            >
              {renderHighlightedText(previewText, normalizedSearch)}
            </p>
            <div className="mt-1 flex flex-wrap gap-1 pr-5">
              {hasPatopsychology && (
                <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-semibold text-sky-800">
                  Патопсихология
                </span>
              )}
              {hasPsychiatry && (
                <span className="rounded-full bg-fuchsia-100 px-1.5 py-0.5 text-[9px] font-semibold text-fuchsia-800">
                  Психиатрия
                </span>
              )}
            </div>
            {cellEntries.length > 1 && (
              <p className="mt-1 text-[10px] font-medium text-blue-700">
                +{cellEntries.length - 1} ещё
              </p>
            )}
            {cellCommentCount > 0 && (
              <p className="mt-1 text-[10px] font-medium text-emerald-700">💬 {cellCommentCount}</p>
            )}
          </>
        )}
      </button>
    </td>
  );
}
