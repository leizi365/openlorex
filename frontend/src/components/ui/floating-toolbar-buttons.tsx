'use client';

import * as React from 'react';

import {
  BaselineIcon,
  BoldIcon,
  Code2Icon,
  ItalicIcon,
  PaintBucketIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from 'lucide-react';
import { KEYS } from 'platejs';
import { useEditorReadOnly } from 'platejs/react';

import { FontColorToolbarButton } from './font-color-toolbar-button';
import { FontSizeToolbarButton } from './font-size-toolbar-button';
import { LineHeightToolbarButton } from './line-height-toolbar-button';
import { LinkToolbarButton } from './link-toolbar-button';
import { MarkToolbarButton } from './mark-toolbar-button';
import { MoreToolbarButton } from './more-toolbar-button';
import { ToolbarGroup } from './toolbar';
import { TurnIntoToolbarButton } from './turn-into-toolbar-button';

export function FloatingToolbarButtons() {
  const readOnly = useEditorReadOnly();

  if (readOnly) return null;

  return (
    <>
      <ToolbarGroup>
        <TurnIntoToolbarButton />
        <FontSizeToolbarButton />
        <LineHeightToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <MarkToolbarButton nodeType={KEYS.bold} tooltip="粗体 (⌘+B)" size="sm">
          <BoldIcon />
        </MarkToolbarButton>

        <MarkToolbarButton
          nodeType={KEYS.italic}
          tooltip="斜体 (⌘+I)"
          size="sm"
        >
          <ItalicIcon />
        </MarkToolbarButton>

        <MarkToolbarButton
          nodeType={KEYS.underline}
          tooltip="下划线 (⌘+U)"
          size="sm"
        >
          <UnderlineIcon />
        </MarkToolbarButton>

        <MarkToolbarButton
          nodeType={KEYS.strikethrough}
          tooltip="删除线 (⌘+⇧+X)"
          size="sm"
        >
          <StrikethroughIcon />
        </MarkToolbarButton>

        <MarkToolbarButton
          nodeType={KEYS.code}
          tooltip="代码 (⌘+E)"
          size="sm"
        >
          <Code2Icon />
        </MarkToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <FontColorToolbarButton nodeType={KEYS.color} tooltip="文字颜色">
          <BaselineIcon />
        </FontColorToolbarButton>

        <FontColorToolbarButton
          nodeType={KEYS.backgroundColor}
          tooltip="背景色"
        >
          <PaintBucketIcon />
        </FontColorToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <LinkToolbarButton size="sm" />
        <MoreToolbarButton />
      </ToolbarGroup>
    </>
  );
}
