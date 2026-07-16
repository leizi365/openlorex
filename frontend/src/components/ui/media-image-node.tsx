'use client';

import * as React from 'react';

import type { TImageElement } from 'platejs';
import type { PlateElementProps } from 'platejs/react';

import { useDraggable } from '@platejs/dnd';
import { Image, ImagePlugin, useMediaState } from '@platejs/media/react';
import { ResizableProvider, useResizableValue } from '@platejs/resizable';
import { PlateElement, useElement, withHOC } from 'platejs/react';

import { cn } from '@/lib/utils';

import { Caption, CaptionTextarea } from './caption';
import { MediaToolbar } from './media-toolbar';
import {
  isAspectRatioLocked,
  MediaCornerResizeHandle,
  MediaHeightResizeHandle,
  MediaResizeContainer,
  useMediaPreviewSize,
  useMediaResizeHandles,
} from './media-dimension-handles';
import {
  mediaResizeHandleVariants,
  Resizable,
  ResizeHandle,
} from './resize-handle';

export const ImageElement = withHOC(
  ResizableProvider,
  function ImageElement(props: PlateElementProps<TImageElement>) {
    const { align = 'center', focused, readOnly, selected } = useMediaState();
    const width = useResizableValue('width');
    const element = useElement<TImageElement & { lockAspectRatio?: boolean }>();
    const contentRef = React.useRef<HTMLDivElement>(null);
    const {
      sizeStyle,
      setPreviewSize,
      setPreviewHeight,
      setPreviewWidth,
      clearPreview,
    } = useMediaPreviewSize(element);
    const { leftResizeOptions, rightResizeOptions, bottomResizeOptions, lockAspectRatio } =
      useMediaResizeHandles({
        contentRef,
        align,
        onPreview: setPreviewSize,
        onClearPreview: clearPreview,
        onPreviewHeight: setPreviewHeight,
        onPreviewWidth: setPreviewWidth,
      });
    const locked = isAspectRatioLocked(element);

    const { isDragging, handleRef } = useDraggable({
      element: props.element,
    });

    return (
      <MediaToolbar plugin={ImagePlugin}>
        <PlateElement {...props} className="py-2.5">
          <figure className="relative m-0" contentEditable={false}>
            <MediaResizeContainer selected={selected && focused}>
              <Resizable
                align={align}
                options={{
                  align,
                  readOnly,
                }}
              >
                <ResizeHandle
                  className={mediaResizeHandleVariants({ direction: 'left' })}
                  options={leftResizeOptions}
                />
                <div className="relative" data-media-content ref={contentRef}>
                  <Image
                    ref={handleRef}
                    className={cn(
                      'block w-full max-w-full cursor-pointer px-0',
                      'rounded-sm',
                      locked ? 'object-contain' : 'object-fill',
                      focused && selected && 'ring-2 ring-ring ring-offset-2',
                      isDragging && 'opacity-50'
                    )}
                    style={sizeStyle}
                    alt={props.attributes.alt as string | undefined}
                  />
                  <MediaHeightResizeHandle
                    options={bottomResizeOptions}
                    lockAspectRatio={lockAspectRatio}
                  />
                  <MediaCornerResizeHandle
                    contentRef={contentRef}
                    onPreview={setPreviewSize}
                    onClearPreview={clearPreview}
                    onPreviewHeight={setPreviewHeight}
                    onPreviewWidth={setPreviewWidth}
                  />
                </div>
                <ResizeHandle
                  className={mediaResizeHandleVariants({ direction: 'right' })}
                  options={rightResizeOptions}
                />
              </Resizable>
            </MediaResizeContainer>

            <Caption style={{ width }} align={align}>
              <CaptionTextarea
                readOnly={readOnly}
                onFocus={(e) => {
                  e.preventDefault();
                }}
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
