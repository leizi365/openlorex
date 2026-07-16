import * as React from 'react';

import type { TCodeDrawingElement } from '@platejs/code-drawing';
import { VIEW_MODE } from '@platejs/code-drawing';
import type { SlateElementProps } from 'platejs/static';

import { cn } from '@/app/api/ai/command/utils';
import { SlateElement } from 'platejs/static';

const VIEW_MODE_LABELS = {
  [VIEW_MODE.Both]: '分栏',
  [VIEW_MODE.Code]: '代码',
  [VIEW_MODE.Image]: '视图',
} as const;

export function CodeDrawingElementStatic({
  children,
  ...props
}: SlateElementProps<TCodeDrawingElement>) {
  const drawingType = props.element.data?.drawingType || 'Mermaid';
  const drawingMode = props.element.data?.drawingMode || VIEW_MODE.Both;
  const code = (props.element.data?.code as string) || 'Enter your code here...';
  const showCode =
    drawingMode === VIEW_MODE.Both || drawingMode === VIEW_MODE.Code;
  const showImage =
    drawingMode === VIEW_MODE.Both || drawingMode === VIEW_MODE.Image;

  return (
    <SlateElement className="my-4 w-full" {...props}>
      <div className="overflow-hidden rounded-lg border bg-muted/50">
        <div className="flex items-center gap-2 border-b bg-muted/80 px-3 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {drawingType}
          </span>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">
            {VIEW_MODE_LABELS[drawingMode]}
          </span>
        </div>

        <div className={cn('flex', 'md:flex-row flex-col')}>
          {showCode && (
            <div
              className={cn(
                'min-w-0 flex-1 p-4',
                showImage && 'md:border-r'
              )}
            >
              <pre className="m-0 overflow-x-auto font-mono text-sm leading-[normal] [tab-size:2] print:break-inside-avoid">
                <code className="block w-full">{code}</code>
              </pre>
            </div>
          )}

          {showImage && (
            <div className="flex min-w-0 flex-1 items-center justify-center bg-muted/30 p-4">
              <div className="text-muted-foreground">{drawingType}</div>
            </div>
          )}
        </div>
      </div>
      {children}
    </SlateElement>
  );
}
