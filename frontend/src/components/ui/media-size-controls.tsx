'use client';

import * as React from 'react';

import { useResizableSet, useResizableValue } from '@platejs/resizable';
import { KEYS } from 'platejs';
import { useEditorRef, useElement, usePath } from 'platejs/react';

import { cn } from '@/lib/utils';

import {
  getStoredAspectRatio,
  isAspectRatioLocked,
  MediaAspectRatioLockButton,
} from './media-dimension-handles';

type MediaSizeElement = {
  width?: number | string;
  height?: number | string;
  lockAspectRatio?: boolean;
  type?: string;
};

function formatSizeForInput(size: number | string | undefined) {
  if (size === undefined || size === null) {
    return '';
  }

  if (typeof size === 'number') {
    return String(size);
  }

  return size;
}

function parseSizeInput(input: string): number | string | undefined {
  const trimmed = input.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.endsWith('%')) {
    return trimmed;
  }

  const numeric = Number(trimmed);

  if (!Number.isNaN(numeric) && numeric > 0) {
    return numeric;
  }

  return undefined;
}

export function MediaSizeControls({
  showHeight = false,
  className,
}: {
  showHeight?: boolean;
  className?: string;
}) {
  const editor = useEditorRef();
  const element = useElement<MediaSizeElement>();
  const path = usePath();
  const setResizableWidth = useResizableSet('width');
  const resizableWidth = useResizableValue('width');

  const [widthInput, setWidthInput] = React.useState(() =>
    formatSizeForInput(element.width)
  );
  const [heightInput, setHeightInput] = React.useState(() =>
    formatSizeForInput(element.height)
  );

  React.useEffect(() => {
    setWidthInput(formatSizeForInput(element.width));
  }, [element.width]);

  React.useEffect(() => {
    setHeightInput(formatSizeForInput(element.height));
  }, [element.height]);

  const commitWidth = React.useCallback(
    (rawValue: string) => {
      const nextWidth = parseSizeInput(rawValue) ?? '100%';
      const ratio =
        showHeight && isAspectRatioLocked(element)
          ? getStoredAspectRatio(element)
          : null;

      if (showHeight && typeof nextWidth === 'number' && ratio) {
        const nextHeight = Math.round(nextWidth / ratio);

        editor.tf.setNodes(
          { width: nextWidth, height: nextHeight },
          { at: path }
        );
        setResizableWidth(nextWidth);
        setWidthInput(String(nextWidth));
        setHeightInput(String(nextHeight));
        return;
      }

      editor.tf.setNodes({ width: nextWidth }, { at: path });
      setResizableWidth(nextWidth);
      setWidthInput(formatSizeForInput(nextWidth));
    },
    [editor, element, path, setResizableWidth, showHeight]
  );

  const commitHeight = React.useCallback(
    (rawValue: string) => {
      const nextHeight = parseSizeInput(rawValue);
      const ratio =
        showHeight && isAspectRatioLocked(element)
          ? getStoredAspectRatio(element)
          : null;

      if (nextHeight === undefined) {
        editor.tf.unsetNodes(['height'], { at: path });
        setHeightInput('');
        return;
      }

      if (showHeight && typeof nextHeight === 'number' && ratio) {
        const nextWidth = Math.round(nextHeight * ratio);

        editor.tf.setNodes(
          { width: nextWidth, height: nextHeight },
          { at: path }
        );
        setResizableWidth(nextWidth);
        setWidthInput(String(nextWidth));
        setHeightInput(String(nextHeight));
        return;
      }

      editor.tf.setNodes({ height: nextHeight }, { at: path });
      setHeightInput(formatSizeForInput(nextHeight));
    },
    [editor, element, path, setResizableWidth, showHeight]
  );

  const handleWidthKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitWidth(widthInput);
      event.currentTarget.blur();
    }
  };

  const handleHeightKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitHeight(heightInput);
      event.currentTarget.blur();
    }
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {showHeight ? <MediaAspectRatioLockButton /> : null}

      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>W</span>
        <input
          type="text"
          inputMode="numeric"
          value={widthInput}
          placeholder={
            typeof resizableWidth === 'number'
              ? String(resizableWidth)
              : '100%'
          }
          onChange={(event) => setWidthInput(event.target.value)}
          onBlur={() => commitWidth(widthInput)}
          onKeyDown={handleWidthKeyDown}
          className="h-7 w-16 rounded-md border bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {showHeight ? (
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>H</span>
          <input
            type="text"
            inputMode="numeric"
            value={heightInput}
            placeholder="auto"
            onChange={(event) => setHeightInput(event.target.value)}
            onBlur={() => commitHeight(heightInput)}
            onKeyDown={handleHeightKeyDown}
            className="h-7 w-16 rounded-md border bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      ) : null}
    </div>
  );
}

export function useMediaSizeStyle(element: MediaSizeElement) {
  return React.useMemo(() => {
    const style: React.CSSProperties = {};

    if (element.height !== undefined && element.height !== null) {
      style.height =
        typeof element.height === 'number'
          ? `${element.height}px`
          : element.height;
    }

    return style;
  }, [element.height]);
}

export function mediaSupportsHeight(type?: string) {
  return type === KEYS.img;
}
