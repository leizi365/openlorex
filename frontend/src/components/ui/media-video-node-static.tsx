import * as React from 'react';

import type { TCaptionElement, TResizableProps, TVideoElement } from 'platejs';
import type { SlateElementProps } from 'platejs/static';

import { NodeApi } from 'platejs';
import { SlateElement } from 'platejs/static';

import { cn } from '@/app/api/ai/command/utils';

function getMediaAlignClass(align?: string | null) {
  if (align === 'left' || align === 'start') return 'mr-auto';
  if (align === 'right' || align === 'end') return 'ml-auto';
  return 'mx-auto';
}

export function VideoElementStatic(
  props: SlateElementProps<TVideoElement & TCaptionElement & TResizableProps>
) {
  const { align = 'center', caption, url, width, height } = props.element;
  const heightStyle =
    height !== undefined && height !== null
      ? {
          height: typeof height === 'number' ? `${height}px` : height,
        }
      : undefined;

  return (
    <SlateElement className="py-2.5" {...props}>
      <figure
        className={cn(
          'group relative m-0 block max-w-full cursor-default',
          getMediaAlignClass(align)
        )}
        style={{ width }}
      >
        <div style={heightStyle}>
          <video
            className="h-full w-full max-w-full rounded-sm object-cover px-0"
            src={url}
            controls
          />
        </div>
        {caption && <figcaption>{NodeApi.string(caption[0])}</figcaption>}
      </figure>
      {props.children}
    </SlateElement>
  );
}
