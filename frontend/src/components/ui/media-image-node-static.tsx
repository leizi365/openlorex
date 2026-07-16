import * as React from 'react';

import type { TCaptionProps, TImageElement, TResizableProps } from 'platejs';
import type { SlateElementProps } from 'platejs/static';

import { NodeApi } from 'platejs';
import { SlateElement } from 'platejs/static';

import { cn } from '@/app/api/ai/command/utils';

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
      <figure className="group relative m-0 inline-block" style={{ width }}>
        <div
          className="relative min-w-[92px] max-w-full"
          style={{ textAlign: align }}
        >
          <div>
            <img
              className={cn(
                'w-full max-w-full cursor-default px-0',
                height ? 'object-cover' : 'object-cover',
                'rounded-sm'
              )}
              style={heightStyle}
              alt={(props.attributes as { alt?: string }).alt}
              src={url}
            />
          </div>
          {caption && (
            <figcaption
              className="mx-auto mt-2 h-[24px] max-w-full"
              style={{ textAlign: 'center' }}
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
