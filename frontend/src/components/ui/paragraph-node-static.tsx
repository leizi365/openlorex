import * as React from 'react';

import type { SlateElementProps } from 'platejs/static';

import { SlateElement } from 'platejs/static';

import { cn } from '@/app/api/ai/command/utils';
import { DEFAULT_FONT_SIZE_PX } from '@/lib/editor-font-size';

export function ParagraphElementStatic(props: SlateElementProps) {
  const lineHeight = (props.element as { lineHeight?: number | string })
    .lineHeight;

  return (
    <SlateElement
      {...props}
      className={cn('m-0 px-0 py-1', props.className)}
      style={{
        lineHeight: lineHeight ?? 1.75,
        ...props.style,
        fontSize: DEFAULT_FONT_SIZE_PX,
      }}
    >
      {props.children}
    </SlateElement>
  );
}
