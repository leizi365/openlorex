'use client';

import * as React from 'react';

import type { PlateElementProps } from 'platejs/react';

import { PlateElement } from 'platejs/react';

import { cn } from '@/app/api/ai/command/utils';
import { DEFAULT_FONT_SIZE_PX } from '@/lib/editor-font-size';

export function ParagraphElement(props: PlateElementProps) {
  const lineHeight = (props.element as { lineHeight?: number | string })
    .lineHeight;

  return (
    <PlateElement
      {...props}
      className={cn('m-0 px-0 py-[3px]', props.className)}
      style={{
        ...props.style,
        fontSize: DEFAULT_FONT_SIZE_PX,
        ...(lineHeight != null ? { lineHeight } : null),
      }}
    >
      {props.children}
    </PlateElement>
  );
}
