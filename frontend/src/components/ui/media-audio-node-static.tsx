import * as React from 'react';

import type { TAudioElement, TResizableProps } from 'platejs';
import type { SlateElementProps } from 'platejs/static';

import { SlateElement } from 'platejs/static';

import { cn } from '@/app/api/ai/command/utils';

function getMediaAlignClass(align?: string | null) {
  if (align === 'left' || align === 'start') return 'mr-auto';
  if (align === 'right' || align === 'end') return 'ml-auto';
  return 'mx-auto';
}

export function AudioElementStatic(
  props: SlateElementProps<TAudioElement & TResizableProps>
) {
  const { align = 'center', url, width, height } = props.element as TAudioElement &
    TResizableProps & { align?: string };
  const heightStyle =
    height !== undefined && height !== null
      ? {
          height: typeof height === 'number' ? `${height}px` : height,
        }
      : undefined;

  return (
    <SlateElement {...props} className="mb-1">
      <figure
        className={cn(
          'group relative block max-w-full cursor-default',
          getMediaAlignClass(align)
        )}
        style={{ width }}
      >
        <div className={cn('h-16 rounded-sm')} style={heightStyle}>
          <audio className="size-full" src={url} controls />
        </div>
      </figure>
      {props.children}
    </SlateElement>
  );
}
