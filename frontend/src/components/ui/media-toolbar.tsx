'use client';

import * as React from 'react';

import type { WithRequiredKey } from 'platejs';

import {
  FloatingMedia as FloatingMediaPrimitive,
  FloatingMediaStore,
  useFloatingMediaValue,
  useImagePreviewValue,
} from '@platejs/media/react';
import { cva } from 'class-variance-authority';
import { Link, Trash2Icon } from 'lucide-react';
import { KEYS } from 'platejs';
import {
  useEditorRef,
  useEditorSelector,
  useElement,
  useFocusedLast,
  useReadOnly,
  useRemoveNodeButton,
  useSelected,
} from 'platejs/react';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

import { CaptionButton } from './caption';
import {
  FileBackgroundColorButton,
  FileDownloadButton,
} from './media-file-appearance';
import {
  MediaSizeControls,
  mediaSupportsHeight,
} from './media-size-controls';

const inputVariants = cva(
  'flex h-[28px] w-full rounded-md border-none bg-transparent px-1.5 py-1 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-transparent md:text-sm'
);

export function MediaToolbar({
  children,
  plugin,
}: {
  children: React.ReactNode;
  plugin: WithRequiredKey;
}) {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const selected = useSelected();
  const isFocusedLast = useFocusedLast();
  const selectionCollapsed = useEditorSelector(
    (editor) => !editor.api.isExpanded(),
    []
  );
  const isImagePreviewOpen = useImagePreviewValue('isOpen', editor.id);
  const open =
    isFocusedLast &&
    selected &&
    selectionCollapsed &&
    !isImagePreviewOpen &&
    (!readOnly || isFile);
  const isEditing = useFloatingMediaValue('isEditing');

  React.useEffect(() => {
    if (!open && isEditing) {
      FloatingMediaStore.set('isEditing', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const element = useElement();
  const { props: buttonProps } = useRemoveNodeButton({ element });
  const showHeight = mediaSupportsHeight(element.type);
  const isImage = element.type === KEYS.img;
  const isFile = element.type === KEYS.file;

  return (
    <Popover open={open} modal={false}>
      <PopoverAnchor>{children}</PopoverAnchor>

      <PopoverContent
        className="w-auto p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isEditing ? (
          <div className="flex w-[330px] flex-col">
            <div className="flex items-center">
              <div className="flex items-center pr-1 pl-2 text-muted-foreground">
                <Link className="size-4" />
              </div>

              <FloatingMediaPrimitive.UrlInput
                className={inputVariants()}
                placeholder="粘贴嵌入链接…"
                options={{ plugin }}
              />
            </div>
          </div>
        ) : (
          <div className="box-content flex items-center gap-1">
            {isFile && !readOnly ? <FileBackgroundColorButton /> : null}

            {!readOnly ? (
              <MediaSizeControls showHeight={showHeight} className="px-1" />
            ) : null}

            {isFile ? <FileDownloadButton /> : null}

            {!readOnly && !isImage && !isFile ? (
              <FloatingMediaPrimitive.EditButton
                className={buttonVariants({ size: 'sm', variant: 'ghost' })}
              >
                Edit link
              </FloatingMediaPrimitive.EditButton>
            ) : null}

            {!readOnly ? (
              <CaptionButton size="sm" variant="ghost">
                Caption
              </CaptionButton>
            ) : null}

            {!readOnly ? (
              <>
                <Separator orientation="vertical" className="mx-1 h-6" />
                <Button size="sm" variant="ghost" {...buttonProps}>
                  <Trash2Icon />
                </Button>
              </>
            ) : null}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
