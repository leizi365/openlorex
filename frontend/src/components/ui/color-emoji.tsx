import * as React from 'react';

import { cn } from '@/lib/utils';

const TWEMOJI_BASE =
  'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg';

/** Convert a native emoji string to Twemoji codepoint path (e.g. 😀 → 1f600). */
export function emojiToCodePoints(emoji: string): string {
  const points: string[] = [];

  for (const char of emoji) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    // Skip text-style variation selector so Twemoji resolves color glyphs
    if (code === 0xfe0f) continue;
    points.push(code.toString(16));
  }

  return points.join('-');
}

export function getTwemojiUrl(emoji: string): string {
  return `${TWEMOJI_BASE}/${emojiToCodePoints(emoji)}.svg`;
}

type ColorEmojiProps = {
  children: string;
  className?: string;
  /** CSS size, e.g. 1.25em or 72px. Defaults to 1em. */
  size?: string | number;
  alt?: string;
};

/**
 * Always-colorful emoji via Twemoji (works on Linux/WSL where system emoji is often monochrome).
 */
export function ColorEmoji({
  children,
  className,
  size,
  alt,
}: ColorEmojiProps) {
  const emoji = children.trim();
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [emoji]);

  if (!emoji) return null;

  const resolvedSize =
    typeof size === 'number' ? `${size}px` : (size ?? '1em');

  if (failed) {
    return (
      <span
        className={cn('emoji inline-block leading-none', className)}
        data-emoji="true"
        style={{
          fontFamily:
            '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", emoji',
          fontSize: resolvedSize,
        }}
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={getTwemojiUrl(emoji)}
      alt={alt ?? emoji}
      draggable={false}
      className={cn('emoji inline-block shrink-0 object-contain', className)}
      data-emoji="true"
      style={{
        width: resolvedSize,
        height: resolvedSize,
      }}
      onError={() => setFailed(true)}
    />
  );
}
