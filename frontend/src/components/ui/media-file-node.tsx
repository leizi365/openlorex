'use client';

import * as React from 'react';

import type { TFileElement } from 'platejs';
import type { PlateElementProps } from 'platejs/react';

import { FilePlugin, useMediaState } from '@platejs/media/react';
import { ResizableProvider } from '@platejs/resizable';
import { PlateElement, useElement, useFocusedLast, useReadOnly, useSelected, withHOC } from 'platejs/react';

import { cn } from '@/lib/utils';
import { Caption, CaptionTextarea } from './caption';
import { MediaToolbar } from './media-toolbar';
import { MediaResizeContainer } from './media-dimension-handles';
import { useMediaSizeStyle } from './media-size-controls';
import {
  ColoredFileIcon,
  downloadMediaFile,
  getFileBlockStyle,
  type TFileElementWithStyle,
} from './media-file-appearance';
import {
  mediaResizeHandleVariants,
  Resizable,
  ResizeHandle,
} from './resize-handle';

function FileBlockContent({
  name,
  readOnly,
}: {
  name: string;
  readOnly: boolean;
}) {
  return (
    <>
      <ColoredFileIcon />
      <div className="min-w-0 truncate text-sm font-medium">{name}</div>
      <Caption align="left">
        <CaptionTextarea
          className="text-left"
          readOnly={readOnly}
          placeholder="添加说明…"
        />
      </Caption>
    </>
  );
}

export const FileElement = withHOC(
  ResizableProvider,
  function FileElement(props: PlateElementProps<TFileElement>) {
    const readOnly = useReadOnly();
    const selected = useSelected();
    const isFocusedLast = useFocusedLast();
    const { name, unsafeUrl } = useMediaState();
    const element = useElement<TFileElementWithStyle>();
    const sizeStyle = useMediaSizeStyle(element);
    const url = unsafeUrl || element.url;
    const blockClassName = cn(
      'group relative m-0 inline-flex items-center gap-2 rounded-md px-2 py-0.5 no-underline transition-opacity hover:opacity-95',
      url ? 'cursor-pointer hover:bg-muted/40' : 'cursor-default'
    );
    const blockStyle = {
      ...sizeStyle,
      ...getFileBlockStyle(element),
    };

    const handleDownload = React.useCallback(
      (event: React.MouseEvent) => {
        if (!url) {
          return;
        }

        event.preventDefault();
        downloadMediaFile(url, name);
      },
      [name, url]
    );

    return (
      <MediaToolbar plugin={FilePlugin}>
        <PlateElement className="my-px rounded-sm" {...props}>
          <MediaResizeContainer selected={selected && isFocusedLast}>
          <Resizable
            align="left"
            options={{
              align: 'left',
              readOnly,
            }}
          >
            <ResizeHandle
              className={mediaResizeHandleVariants({ direction: 'left' })}
              options={{ direction: 'left' }}
            />
            {url ? (
              <a
                className={blockClassName}
                contentEditable={false}
                href={url}
                rel="noopener noreferrer"
                style={blockStyle}
                data-media-content
                title={readOnly ? '点击下载附件' : '点击下载附件（选中后可编辑样式）'}
                onClick={handleDownload}
              >
                <FileBlockContent name={name} readOnly={readOnly} />
              </a>
            ) : (
              <div
                className={blockClassName}
                contentEditable={false}
                role="presentation"
                style={blockStyle}
                data-media-content
              >
                <FileBlockContent name={name} readOnly={readOnly} />
              </div>
            )}
            <ResizeHandle
              className={mediaResizeHandleVariants({ direction: 'right' })}
              options={{ direction: 'right' }}
            />
          </Resizable>
          </MediaResizeContainer>
          {props.children}
        </PlateElement>
      </MediaToolbar>
    );
  }
);
