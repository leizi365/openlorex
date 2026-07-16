'use client';

import * as React from 'react';

import type { TFileElement } from 'platejs';
import { useMediaState } from '@platejs/media/react';
import { Download } from 'lucide-react';
import { useEditorRef, useElement, usePath } from 'platejs/react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PAGE_COVER_COLORS } from '@/features/pages/cover-colors';
import { cn } from '@/lib/utils';

export type TFileElementWithStyle = TFileElement & {
  backgroundColor?: string;
};

export function getFileBackgroundColor(
  element: { backgroundColor?: string }
): string | undefined {
  return element.backgroundColor;
}

export function getFileBlockStyle(
  element: { backgroundColor?: string }
): React.CSSProperties {
  const backgroundColor = getFileBackgroundColor(element);

  return backgroundColor ? { backgroundColor } : {};
}

export function ColoredFileIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-5 shrink-0', className)}
      aria-hidden
    >
      <path
        d="M8 3C6.343 3 5 4.343 5 6v20c0 1.657 1.343 3 3 3h16c1.657 0 3-1.343 3-3V11.414a2 2 0 0 0-.586-1.414l-5.414-5.414A2 2 0 0 0 20.586 4H8Z"
        fill="#5B9FD4"
      />
      <path
        d="M20 4v5a2 2 0 0 0 2 2h5"
        fill="#3D7FB8"
      />
      <path
        d="M20 4 27 11h-5a2 2 0 0 1-2-2V4Z"
        fill="#7BB8E8"
      />
      <rect x="10" y="15" width="12" height="2" rx="1" fill="white" fillOpacity="0.95" />
      <rect x="10" y="19.5" width="9" height="2" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="10" y="24" width="11" height="2" rx="1" fill="white" fillOpacity="0.8" />
    </svg>
  );
}

export function FileBackgroundColorButton() {
  const editor = useEditorRef();
  const element = useElement<TFileElementWithStyle>();
  const path = usePath();
  const [open, setOpen] = React.useState(false);
  const backgroundColor = element.backgroundColor;

  const updateBackgroundColor = React.useCallback(
    (value: string | null) => {
      if (value === null) {
        editor.tf.unsetNodes('backgroundColor', { at: path });
        return;
      }

      editor.tf.setNodes({ backgroundColor: value }, { at: path });
    },
    [editor, path]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors hover:bg-accent"
          title="背景色"
          aria-label="背景色"
        >
          <span
            className={cn(
              'size-4 rounded-full border border-black/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]',
              !backgroundColor &&
                'bg-[linear-gradient(to_bottom_right,transparent_46%,#e03e3e_48%,#e03e3e_52%,transparent_54%)] bg-muted'
            )}
            style={
              backgroundColor ? { backgroundColor } : undefined
            }
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          背景
        </p>
        <div className="grid grid-cols-5 gap-2">
          <button
            type="button"
            title="无"
            onClick={() => {
              updateBackgroundColor(null);
              setOpen(false);
            }}
            className={cn(
              'size-8 rounded-md border transition-transform hover:scale-105',
              backgroundColor == null
                ? 'border-foreground ring-2 ring-foreground/20'
                : 'border-black/10',
              'bg-[linear-gradient(to_bottom_right,transparent_46%,#e03e3e_48%,#e03e3e_52%,transparent_54%)] bg-muted'
            )}
          />
          {PAGE_COVER_COLORS.filter((color) => color.value).map((color) => {

            const isActive = backgroundColor === color.value;

            return (
              <button
                key={color.name}
                type="button"
                title={color.name}
                onClick={() => {
                  updateBackgroundColor(color.value ?? null);
                  setOpen(false);
                }}
                className={cn(
                  'size-8 rounded-md border transition-transform hover:scale-105',
                  isActive
                    ? 'border-foreground ring-2 ring-foreground/20'
                    : 'border-black/10'
                )}
                style={{ backgroundColor: color.value }}
              />
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function downloadMediaFile(url: string, name?: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = name || 'file';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function FileDownloadButton() {
  const { name, unsafeUrl } = useMediaState();

  const handleDownload = React.useCallback(() => {
    if (!unsafeUrl) {
      return;
    }

    downloadMediaFile(unsafeUrl, name);
  }, [name, unsafeUrl]);

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      title="下载"
      aria-label="下载"
      onClick={handleDownload}
    >
      <Download className="size-4" />
    </Button>
  );
}
