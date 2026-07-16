import * as React from 'react';

import type { TAudioElement, TResizableProps } from 'platejs';
import type { SlateElementProps } from 'platejs/static';

import { SlateElement } from 'platejs/static';

import { cn } from '@/app/api/ai/command/utils';

export function AudioElementStatic(
  props: SlateElementProps<TAudioElement & TResizableProps>
) {
  const { url, width, height } = props.element;
  const heightStyle =
    height !== undefined && height !== null
      ? {
          height: typeof height === 'number' ? `${height}px` : height,
        }
      : undefined;

  return (
    <SlateElement {...props} className="mb-1">
      <figure className="group relative cursor-default" style={{ width }}>
        <div className={cn('h-16 rounded-sm')} style={heightStyle}>
          <audio className="size-full" src={url} controls />
        </div>
      </figure>
      {props.children}
    </SlateElement>
  );
}
