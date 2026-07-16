'use client';

import * as React from 'react';

import { BlockSelectionPlugin } from '@platejs/selection/react';
import { KEYS } from 'platejs';
import { useEditorRef } from 'platejs/react';

import { setBlockType } from '@/components/editor/transforms';
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

export function BlockActionMenuItems({
  onAction,
}: {
  onAction?: () => void;
}) {
  const editor = useEditorRef();

  const handleTurnInto = React.useCallback(
    (type: string) => {
      editor
        .getApi(BlockSelectionPlugin)
        .blockSelection.getNodes()
        .forEach(([, path]) => {
          setBlockType(editor, type, { at: path });
        });
      onAction?.();
    },
    [editor, onAction]
  );

  const handleAlign = React.useCallback(
    (align: 'center' | 'left' | 'right') => {
      editor
        .getTransforms(BlockSelectionPlugin)
        .blockSelection.setNodes({ align });
      onAction?.();
    },
    [editor, onAction]
  );

  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem
          onClick={() => {
            editor
              .getTransforms(BlockSelectionPlugin)
              .blockSelection.removeNodes();
            editor.tf.focus();
            onAction?.();
          }}
        >
          删除
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            editor
              .getTransforms(BlockSelectionPlugin)
              .blockSelection.duplicate();
            onAction?.();
          }}
        >
          复制
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>转换为</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem onClick={() => handleTurnInto(KEYS.p)}>
              文本
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTurnInto(KEYS.h1)}>
              标题 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTurnInto(KEYS.h2)}>
              标题 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTurnInto(KEYS.h3)}>
              标题 3
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTurnInto(KEYS.blockquote)}>
              引用
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleTurnInto(KEYS.codeDrawing)}
            >
              流程图
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />

      <DropdownMenuGroup>
        <DropdownMenuItem
          onClick={() => {
            editor
              .getTransforms(BlockSelectionPlugin)
              .blockSelection.setIndent(1);
            onAction?.();
          }}
        >
          增加缩进
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            editor
              .getTransforms(BlockSelectionPlugin)
              .blockSelection.setIndent(-1);
            onAction?.();
          }}
        >
          减少缩进
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>对齐</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem onClick={() => handleAlign('left')}>
              左对齐
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAlign('center')}>
              居中
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAlign('right')}>
              右对齐
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuGroup>
    </>
  );
}
