'use client';

import * as React from 'react';

import type { DropdownMenuProps } from '@radix-ui/react-dropdown-menu';
import type { TRange } from 'platejs';

import { LineHeightPlugin } from '@platejs/basic-styles/react';
import { CheckIcon, WrapText } from 'lucide-react';
import {
  useEditorPlugin,
  useSelectionFragmentProp,
} from 'platejs/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { ToolbarButton } from './toolbar';

export function LineHeightToolbarButton(props: DropdownMenuProps) {
  const { editor, tf } = useEditorPlugin(LineHeightPlugin);
  const { defaultNodeValue, validNodeValues: values = [] } =
    editor.getInjectProps(LineHeightPlugin);

  const value = useSelectionFragmentProp({
    defaultValue: defaultNodeValue,
    getProp: (node) => node.lineHeight,
  });

  const [open, setOpen] = React.useState(false);
  const savedSelectionRef = React.useRef<TRange | null>(null);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          savedSelectionRef.current = editor.selection;
        }
        setOpen(nextOpen);
      }}
      modal={false}
      {...props}
    >
      <DropdownMenuTrigger
        render={
          <ToolbarButton pressed={open} tooltip="行高" isDropdown />
        }
      >
        <WrapText />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="ignore-click-outside/toolbar min-w-0"
        align="start"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          editor.tf.focus();
        }}
      >
        <DropdownMenuRadioGroup
          value={value != null ? String(value) : String(defaultNodeValue)}
          onValueChange={(newValue) => {
            const selection = editor.selection ?? savedSelectionRef.current;

            if (selection) {
              editor.tf.select(selection);
            }

            tf.lineHeight.setNodes(Number(newValue));
            editor.tf.focus();
          }}
        >
          {values.map((itemValue) => (
            <DropdownMenuRadioItem
              key={itemValue}
              className="min-w-[120px] pl-2 *:first:[span]:hidden"
              value={String(itemValue)}
            >
              <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
                <DropdownMenuItemIndicator>
                  <CheckIcon />
                </DropdownMenuItemIndicator>
              </span>
              {itemValue}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
