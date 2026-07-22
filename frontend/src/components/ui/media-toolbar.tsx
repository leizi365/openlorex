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
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  Link,
  Trash2Icon,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

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

type MediaAlign = 'left' | 'center' | 'right';

const mediaAlignItems: {
  icon: typeof AlignLeftIcon;
  label: string;
  value: MediaAlign;
}[] = [
  { icon: AlignLeftIcon, label: '居左', value: 'left' },
  { icon: AlignCenterIcon, label: '居中', value: 'center' },
  { icon: AlignRightIcon, label: '居右', value: 'right' },
];

function getMediaAlign(value?: string | null): MediaAlign {
  if (value === 'left' || value === 'right' || value === 'center') {
    return value;
  }

  if (value === 'start') return 'left';
  if (value === 'end') return 'right';

  return 'center';
}

function MediaAlignControls() {
  const editor = useEditorRef();
  const element = useElement<{ align?: string }>();
  const align = getMediaAlign(element.align);

  return (
    <div className="flex items-center gap-0.5">
      {mediaAlignItems.map(({ icon: Icon, label, value }) => (
        <Button
          key={value}
          size="sm"
          variant="ghost"
          className={cn('size-8 px-0', align === value && 'bg-accent')}
          title={label}
          aria-label={label}
          aria-pressed={align === value}
          onClick={() => {
            editor.tf.setNodes({ align: value }, { at: element });
          }}
        >
          <Icon className="size-4" />
        </Button>
      ))}
    </div>
  );
}

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
  const element = useElement();
  const isFile = element.type === KEYS.file;
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

  const { props: buttonProps } = useRemoveNodeButton({ element });
  const showHeight = mediaSupportsHeight(element.type);
  const isImage = element.type === KEYS.img;

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

            {!readOnly ? <MediaAlignControls /> : null}

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
