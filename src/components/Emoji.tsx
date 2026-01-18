import type { ReactNode } from 'react';
import emojiIndex from '../data/emojiIndex.json';

export type EmojiEntry = {
  token: string;
  file: string;
};

const EMOJI_ENTRIES = emojiIndex as EmojiEntry[];
const EMOJI_MAP = new Map<string, string>();
const EMOJI_TOKENS: string[] = [];

for (const entry of EMOJI_ENTRIES) {
  const src = `/emoji/${entry.file}`;
  EMOJI_MAP.set(entry.token, src);
  EMOJI_TOKENS.push(entry.token);
}

const EMOJI_REGEX = new RegExp(
  EMOJI_TOKENS
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((token) => token.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .join('|'),
  'g'
);

type EmojiSize = number | string;

interface EmojiProps {
  token: string;
  size?: EmojiSize;
  className?: string;
  title?: string;
}

export function getEmojiSrc(token: string): string | null {
  return EMOJI_MAP.get(token) ?? null;
}

export function Emoji({ token, size = '1em', className, title }: EmojiProps) {
  const src = getEmojiSrc(token);
  if (!src) return <span>{token}</span>;

  const dimension = typeof size === 'number' ? `${size}px` : size;
  const ariaLabel = title ?? token;

  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: dimension,
        height: dimension,
        verticalAlign: '-0.125em',
      }}
      aria-label={ariaLabel}
      role="img"
    >
      <img
        src={src}
        alt={ariaLabel}
        width={dimension}
        height={dimension}
        loading="lazy"
        style={{ width: '100%', height: '100%' }}
      />
    </span>
  );
}

interface EmojiTextProps {
  text: string;
  size?: EmojiSize;
  className?: string;
  imageClassName?: string;
}

export function EmojiText({ text, size, className, imageClassName }: EmojiTextProps) {
  if (!text) return null;

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;

  for (const match of text.matchAll(EMOJI_REGEX)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }
    nodes.push(
      <Emoji
        key={`${token}-${index}-${matchIndex}`}
        token={token}
        size={size}
        className={imageClassName}
      />
    );
    lastIndex = index + token.length;
    matchIndex += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <span className={className}>{nodes}</span>;
}
