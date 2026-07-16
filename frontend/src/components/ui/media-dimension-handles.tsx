'use client';

import * as React from 'react';

import type { ResizeEvent } from '@platejs/resizable';
import { resizeLengthClampStatic } from '@platejs/resizable';
import { useResizableSet } from '@platejs/resizable';
import { Lock, LockOpen } from 'lucide-react';
import { useEditorRef, useElement, usePath, useReadOnly } from 'platejs/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { ResizeHandle, mediaResizeHandleVariants } from './resize-handle';

export type MediaSizeElement = {
  width?: number | string;
  height?: number | string;
  lockAspectRatio?: boolean;
};

export type MediaPreviewSize = {
  width: number;
  height: number;
};

const MIN_HEIGHT = 48;
const MAX_HEIGHT = 1200;
const MIN_WIDTH = 92;
const MAX_WIDTH = 1600;

function clampHeight(value: number) {
  return resizeLengthClampStatic(value, { min: MIN_HEIGHT, max: MAX_HEIGHT });
}

function clampWidth(value: number) {
  return resizeLengthClampStatic(value, { min: MIN_WIDTH, max: MAX_WIDTH });
}

export function isAspectRatioLocked(element: MediaSizeElement) {
  return element.lockAspectRatio !== false;
}

function getElementHeight(
  element: MediaSizeElement,
  node: HTMLElement | null
): number {
  if (typeof element.height === 'number') {
    return element.height;
  }

  return node?.offsetHeight ?? MIN_HEIGHT;
}

function getElementWidth(
  element: MediaSizeElement,
  node: HTMLElement | null
): number {
  if (typeof element.width === 'number') {
    return element.width;
  }

  return node?.offsetWidth ?? MIN_WIDTH;
}

export function getMediaAspectRatio(
  element: MediaSizeElement,
  node: HTMLElement | null
): number {
  const width = getElementWidth(element, node);
  const height = getElementHeight(element, node);

  if (width > 0 && height > 0) {
    return width / height;
  }

  const img = node?.querySelector('img');

  if (img instanceof HTMLImageElement && img.naturalWidth && img.naturalHeight) {
    return img.naturalWidth / img.naturalHeight;
  }

  const video = node?.querySelector('video');

  if (
    video instanceof HTMLVideoElement &&
    video.videoWidth &&
    video.videoHeight
  ) {
    return video.videoWidth / video.videoHeight;
  }

  return 16 / 9;
}

export function getStoredAspectRatio(element: MediaSizeElement): number | null {
  if (
    typeof element.width === 'number' &&
    typeof element.height === 'number' &&
    element.height > 0
  ) {
    return element.width / element.height;
  }

  return null;
}

function fitProportionalSize(width: number, height: number, ratio: number) {
  let nextWidth = clampWidth(width);
  let nextHeight = clampHeight(nextWidth / ratio);

  if (nextHeight >= MAX_HEIGHT || nextHeight <= MIN_HEIGHT) {
    nextHeight = clampHeight(height);
    nextWidth = clampWidth(nextHeight * ratio);
  }

  return { width: nextWidth, height: nextHeight };
}

function computeWidthDelta(
  delta: number,
  direction: 'left' | 'right',
  align: 'center' | 'left' | 'right'
) {
  return delta * (align === 'center' ? 2 : 1) * (direction === 'left' ? -1 : 1);
}

export function MediaResizeContainer({
  children,
  selected = false,
  className,
}: {
  children: React.ReactNode;
  selected?: boolean;
  className?: string;
}) {
  const readOnly = useReadOnly();

  return (
    <div
      className={cn('group/media-resize relative', className)}
      data-selected={selected && !readOnly ? 'true' : undefined}
    >
      {children}
    </div>
  );
}

export function useMediaPreviewSize(element: MediaSizeElement) {
  const [previewHeight, setPreviewHeight] = React.useState<number | null>(
    null
  );
  const [previewWidth, setPreviewWidth] = React.useState<number | null>(null);

  const sizeStyle = React.useMemo(() => {
    const style: React.CSSProperties = {};

    const height = previewHeight ?? element.height;
    const width = previewWidth ?? element.width;

    if (height !== undefined && height !== null) {
      style.height =
        typeof height === 'number' ? `${height}px` : height;
    }

    if (typeof width === 'number') {
      style.width = `${width}px`;
    }

    return style;
  }, [element.height, element.width, previewHeight, previewWidth]);

  const setPreviewSize = React.useCallback((size: MediaPreviewSize) => {
    setPreviewWidth(size.width);
    setPreviewHeight(size.height);
  }, []);

  return {
    sizeStyle,
    setPreviewHeight,
    setPreviewWidth,
    setPreviewSize,
    clearPreview: React.useCallback(() => {
      setPreviewHeight(null);
      setPreviewWidth(null);
    }, []),
  };
}

function useMediaResizeCommit({
  onPreview,
  onClearPreview,
  onPreviewHeight,
  onPreviewWidth,
}: {
  onPreview?: (size: MediaPreviewSize) => void;
  onClearPreview?: () => void;
  onPreviewHeight?: (height: number) => void;
  onPreviewWidth?: (width: number) => void;
}) {
  const editor = useEditorRef();
  const path = usePath();
  const setResizableWidth = useResizableSet('width');

  const commitSize = React.useCallback(
    (size: MediaPreviewSize, finished: boolean) => {
      if (finished) {
        editor.tf.setNodes(
          { width: size.width, height: size.height },
          { at: path }
        );
        setResizableWidth(size.width);
        onClearPreview?.();
        return;
      }

      onPreview?.(size);
      setResizableWidth(size.width);
    },
    [editor, onClearPreview, onPreview, path, setResizableWidth]
  );

  const commitWidthOnly = React.useCallback(
    (width: number, finished: boolean) => {
      if (finished) {
        editor.tf.setNodes({ width }, { at: path });
        setResizableWidth(width);
        onClearPreview?.();
        return;
      }

      onPreviewWidth?.(width);
      setResizableWidth(width);
    },
    [editor, onClearPreview, onPreviewWidth, path, setResizableWidth]
  );

  const commitHeightOnly = React.useCallback(
    (height: number, finished: boolean) => {
      if (finished) {
        editor.tf.setNodes({ height }, { at: path });
        onClearPreview?.();
        return;
      }

      onPreviewHeight?.(height);
    },
    [editor, onClearPreview, onPreviewHeight, path]
  );

  return { commitSize, commitWidthOnly, commitHeightOnly };
}

export function useMediaResizeHandles({
  contentRef,
  align = 'center',
  onPreview,
  onClearPreview,
  onPreviewHeight,
  onPreviewWidth,
}: {
  contentRef: React.RefObject<HTMLElement | null>;
  align?: 'center' | 'left' | 'right';
  onPreview?: (size: MediaPreviewSize) => void;
  onClearPreview?: () => void;
  onPreviewHeight?: (height: number) => void;
  onPreviewWidth?: (width: number) => void;
}) {
  const element = useElement<MediaSizeElement>();
  const locked = isAspectRatioLocked(element);
  const { commitSize, commitWidthOnly, commitHeightOnly } = useMediaResizeCommit({
    onPreview,
    onClearPreview,
    onPreviewHeight,
    onPreviewWidth,
  });

  const createWidthHandleOptions = React.useCallback(
    (direction: 'left' | 'right') => ({
      direction,
      onResize: ({ delta, finished, initialSize }: ResizeEvent) => {
        const widthDelta = computeWidthDelta(delta, direction, align);
        const nextWidth = clampWidth(initialSize + widthDelta);

        if (locked) {
          const ratio = getMediaAspectRatio(element, contentRef.current);
          commitSize(
            fitProportionalSize(nextWidth, nextWidth / ratio, ratio),
            finished
          );
          return;
        }

        commitWidthOnly(nextWidth, finished);
      },
    }),
    [align, commitSize, commitWidthOnly, contentRef, element, locked]
  );

  const bottomResizeOptions = React.useMemo(
    () => ({
      direction: 'bottom' as const,
      onResize: ({ delta, finished, initialSize }: ResizeEvent) => {
        const nextHeight = clampHeight(initialSize + delta);

        if (locked) {
          const ratio = getMediaAspectRatio(element, contentRef.current);
          commitSize(
            fitProportionalSize(nextHeight * ratio, nextHeight, ratio),
            finished
          );
          return;
        }

        commitHeightOnly(nextHeight, finished);
      },
    }),
    [commitHeightOnly, commitSize, contentRef, element, locked]
  );

  return {
    leftResizeOptions: createWidthHandleOptions('left'),
    rightResizeOptions: createWidthHandleOptions('right'),
    bottomResizeOptions,
    lockAspectRatio: locked,
  };
}

export function MediaHeightResizeHandle({
  options,
  lockAspectRatio = true,
}: {
  options: {
    direction: 'bottom';
    onResize: (event: ResizeEvent) => void;
  };
  lockAspectRatio?: boolean;
}) {
  const readOnly = useReadOnly();

  if (readOnly) {
    return null;
  }

  return (
    <ResizeHandle
      className={cn(
        'absolute right-0 bottom-0 left-0 z-40 flex h-4 items-end justify-center pb-0.5',
        lockAspectRatio ? 'cursor-nwse-resize' : 'cursor-row-resize',
        "after:h-[3px] after:w-16 after:rounded-[6px] after:bg-ring after:opacity-0 after:content-['_']",
        'group-hover/media-resize:after:opacity-100 group-data-[selected=true]/media-resize:after:opacity-100',
        'data-[resizing=true]:after:opacity-100'
      )}
      options={options}
    />
  );
}

export function MediaCornerResizeHandle({
  onPreview,
  onClearPreview,
  onPreviewHeight,
  onPreviewWidth,
  contentRef,
}: {
  onPreview?: (size: MediaPreviewSize) => void;
  onClearPreview?: () => void;
  onPreviewHeight?: (height: number) => void;
  onPreviewWidth?: (width: number) => void;
  contentRef: React.RefObject<HTMLElement | null>;
}) {
  const element = useElement<MediaSizeElement>();
  const locked = isAspectRatioLocked(element);
  const readOnly = useReadOnly();
  const { commitSize } = useMediaResizeCommit({
    onPreview,
    onClearPreview,
    onPreviewHeight,
    onPreviewWidth,
  });
  const [isResizing, setIsResizing] = React.useState(false);

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const content = contentRef.current;

      if (!content) {
        return;
      }

      const startX = event.clientX;
      const startY = event.clientY;
      const initialWidth = getElementWidth(element, content);
      const initialHeight = getElementHeight(element, content);
      const ratio = getMediaAspectRatio(element, content);

      setIsResizing(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        if (locked) {
          const useWidth = Math.abs(deltaX) >= Math.abs(deltaY);
          const size = useWidth
            ? fitProportionalSize(initialWidth + deltaX, initialHeight, ratio)
            : fitProportionalSize(initialWidth, initialHeight + deltaY, ratio);

          commitSize(size, false);
          return;
        }

        commitSize(
          {
            width: clampWidth(initialWidth + deltaX),
            height: clampHeight(initialHeight + deltaY),
          },
          false
        );
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        const deltaX = upEvent.clientX - startX;
        const deltaY = upEvent.clientY - startY;

        if (locked) {
          const useWidth = Math.abs(deltaX) >= Math.abs(deltaY);
          const size = useWidth
            ? fitProportionalSize(initialWidth + deltaX, initialHeight, ratio)
            : fitProportionalSize(initialWidth, initialHeight + deltaY, ratio);

          commitSize(size, true);
        } else {
          commitSize(
            {
              width: clampWidth(initialWidth + deltaX),
              height: clampHeight(initialHeight + deltaY),
            },
            true
          );
        }

        setIsResizing(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [commitSize, contentRef, element, locked]
  );

  if (readOnly) {
    return null;
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={handleMouseDown}
      className={cn(
        'absolute right-0 bottom-0 z-50 size-4',
        locked ? 'cursor-nwse-resize' : 'cursor-nwse-resize',
        'after:absolute after:right-0.5 after:bottom-0.5 after:size-2.5 after:rounded-[2px] after:border-r-2 after:border-b-2 after:border-ring after:opacity-0 after:content-[""]',
        'group-hover/media-resize:after:opacity-100 group-data-[selected=true]/media-resize:after:opacity-100',
        isResizing && 'after:opacity-100'
      )}
    />
  );
}

export function MediaAspectRatioLockButton() {
  const editor = useEditorRef();
  const element = useElement<MediaSizeElement>();
  const path = usePath();
  const locked = isAspectRatioLocked(element);

  return (
    <Button
      type="button"
      size="icon"
      variant={locked ? 'secondary' : 'ghost'}
      className="size-8 shrink-0"
      title={locked ? '解锁宽高比' : '锁定宽高比'}
      onClick={() => {
        editor.tf.setNodes({ lockAspectRatio: !locked }, { at: path });
      }}
    >
      {locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
    </Button>
  );
}
