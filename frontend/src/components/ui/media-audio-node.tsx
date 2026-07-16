'use client';

import * as React from 'react';

import type { TAudioElement } from 'platejs';
import type { PlateElementProps } from 'platejs/react';

import { AudioPlugin, useMediaState } from '@platejs/media/react';
import { ResizableProvider, useResizableValue } from '@platejs/resizable';
import { PlateElement, useElement, useFocusedLast, useSelected, withHOC } from 'platejs/react';

import { cn } from '@/app/api/ai/command/utils';

import { Caption, CaptionTextarea } from './caption';
import { MediaToolbar } from './media-toolbar';
import { MediaResizeContainer } from './media-dimension-handles';
import { useMediaSizeStyle } from './media-size-controls';
import {
  mediaResizeHandleVariants,
  Resizable,
  ResizeHandle,
} from './resize-handle';

export const AudioElement = withHOC(
  ResizableProvider,
  function AudioElement(props: PlateElementProps<TAudioElement>) {
    const { align = 'center', readOnly, unsafeUrl } = useMediaState();
    const selected = useSelected();
    const isFocusedLast = useFocusedLast();
    const width = useResizableValue('width');
    const element = useElement<TAudioElement>();
    const sizeStyle = useMediaSizeStyle(element);

    return (
      <MediaToolbar plugin={AudioPlugin}>
        <PlateElement {...props} className="mb-1">
          <figure
            className="relative cursor-default"
            contentEditable={false}
          >
            <MediaResizeContainer selected={selected && isFocusedLast}>
            <Resizable
              align={align}
              options={{
                align,
                readOnly,
              }}
            >
              <ResizeHandle
                className={mediaResizeHandleVariants({ direction: 'left' })}
                options={{ direction: 'left' }}
              />
              <div className={cn('h-16 rounded-sm')} style={sizeStyle} data-media-content>
                <audio className="size-full" src={unsafeUrl} controls />
              </div>
              <ResizeHandle
                className={mediaResizeHandleVariants({ direction: 'right' })}
                options={{ direction: 'right' }}
              />
            </Resizable>
            </MediaResizeContainer>

            <Caption style={{ width }} align={align}>
              <CaptionTextarea
                className="h-20"
                readOnly={readOnly}
                placeholder="添加说明…"
              />
            </Caption>
          </figure>
          {props.children}
        </PlateElement>
      </MediaToolbar>
    );
  }
);
