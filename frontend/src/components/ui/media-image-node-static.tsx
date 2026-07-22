import * as React from 'react';

import type { TCaptionProps, TImageElement, TResizableProps } from 'platejs';
import type { SlateElementProps } from 'platejs/static';

import { NodeApi } from 'platejs';
import { SlateElement } from 'platejs/static';

import { cn } from '@/app/api/ai/command/utils';

function getMediaAlignClass(align?: string | null) {
  if (align === 'left' || align === 'start') return 'mr-auto';
  if (align === 'right' || align === 'end') return 'ml-auto';
  return 'mx-auto';
}

export function ImageElementStatic(
  props: SlateElementProps<TImageElement & TCaptionProps & TResizableProps>
) {
  const { align = 'center', caption, url, width, height } = props.element;
  const heightStyle =
    height !== undefined && height !== null
      ? {
          height: typeof height === 'number' ? `${height}px` : height,
        }
      : undefined;

  return (
    <SlateElement {...props} className="py-2.5">
      <figure
        className={cn('group relative m-0 block max-w-full', getMediaAlignClass(align))}
        style={{ width }}
      >
        <div className="relative min-w-[92px] max-w-full">
          <img
            className={cn(
              'w-full max-w-full cursor-default rounded-sm object-cover px-0'
            )}
            style={heightStyle}
            alt={(props.attributes as { alt?: string }).alt}
            src={url}
          />
          {caption && (
            <figcaption
              className="mt-2 h-[24px] max-w-full"
              style={{ textAlign: align === 'left' || align === 'start' ? 'left' : align === 'right' || align === 'end' ? 'right' : 'center' }}
            >
              {NodeApi.string(caption[0])}
            </figcaption>
          )}
        </div>
      </figure>
      {props.children}
    </SlateElement>
  );
}
