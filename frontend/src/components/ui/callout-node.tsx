'use client';

import * as React from 'react';

import { PlateElement, useEditorRef, useElement } from 'platejs/react';

import { ColorEmoji } from '@/components/ui/color-emoji';
import { StandaloneEmojiPicker } from '@/components/ui/standalone-emoji-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PAGE_COVER_COLORS } from '@/features/pages/cover-colors';
import { cn } from '@/lib/utils';

export function CalloutElement({
  attributes,
  children,
  className,
  ...props
}: React.ComponentProps<typeof PlateElement>) {
  const editor = useEditorRef();
  const element = useElement();
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [colorOpen, setColorOpen] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);

  const icon = (element.icon as string | undefined) || '💡';
  const backgroundColor = element.backgroundColor as string | undefined;
  const showColorButton = hovered || colorOpen;

  const updateCallout = React.useCallback(
    (patch: { icon?: string; backgroundColor?: string | null }) => {
      const path = editor.api.findPath(element);
      if (!path) return;

      if (patch.backgroundColor === null) {
        editor.tf.unsetNodes('backgroundColor', { at: path });
        if (patch.icon !== undefined) {
          editor.tf.setNodes({ icon: patch.icon }, { at: path });
        }
        return;
      }

      editor.tf.setNodes(patch, { at: path });
    },
    [editor, element]
  );

  return (
    <PlateElement
      className={cn(
        'relative my-1 flex rounded-md p-4 pl-3',
        !backgroundColor && 'bg-muted',
        className
      )}
      style={{
        backgroundColor: backgroundColor || undefined,
      }}
      attributes={{
        ...attributes,
        'data-plate-open-context-menu': true,
      }}
      {...props}
    >
      <div
        className="flex w-full gap-2 rounded-md"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="flex shrink-0 flex-col items-center gap-1 pt-0.5"
          contentEditable={false}
        >
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex size-7 select-none items-center justify-center rounded-md p-0.5 transition-colors hover:bg-black/5"
                aria-label="更换标注图标"
                title="更换图标"
              >
                <ColorEmoji size={20}>{icon}</ColorEmoji>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <StandaloneEmojiPicker
                onSelect={(native) => {
                  updateCallout({ icon: native });
                  setEmojiOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>

          <Popover open={colorOpen} onOpenChange={setColorOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex size-7 items-center justify-center rounded-md transition-all hover:bg-black/5',
                  showColorButton
                    ? 'pointer-events-auto opacity-100'
                    : 'pointer-events-none h-0 opacity-0'
                )}
                aria-label="更换标注背景"
                title="背景色"
                tabIndex={showColorButton ? 0 : -1}
              >
                <span
                  className={cn(
                    'size-3.5 rounded-full border border-black/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]',
                    !backgroundColor &&
                      'bg-[linear-gradient(to_bottom_right,transparent_46%,#e03e3e_48%,#e03e3e_52%,transparent_54%)] bg-muted'
                  )}
                  style={
                    backgroundColor ? { backgroundColor } : undefined
                  }
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="bottom"
              sideOffset={6}
              className="w-[220px] border border-[rgba(55,53,47,0.09)] bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.02)]"
            >
              <p className="mb-2.5 text-xs font-medium text-[rgba(55,53,47,0.65)]">
                背景色
              </p>
              <div className="grid grid-cols-5 gap-2">
                {PAGE_COVER_COLORS.map((color) => {
                  const isDefault = !color.value;
                  const isActive = isDefault
                    ? !backgroundColor
                    : backgroundColor === color.value;

                  return (
                    <button
                      key={color.name}
                      type="button"
                      title={color.name}
                      aria-label={color.name}
                      aria-pressed={isActive}
                      onClick={() => {
                        updateCallout({
                          backgroundColor: color.value ?? null,
                        });
                        setColorOpen(false);
                      }}
                      className={cn(
                        'size-8 rounded-md border transition-transform hover:scale-105',
                        isActive
                          ? 'border-foreground ring-2 ring-foreground/20'
                          : 'border-black/10',
                        isDefault &&
                          'bg-[linear-gradient(to_bottom_right,transparent_46%,#e03e3e_48%,#e03e3e_52%,transparent_54%)] bg-muted'
                      )}
                      style={
                        color.value
                          ? { backgroundColor: color.value }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-full min-w-0">{children}</div>
      </div>
    </PlateElement>
  );
}
