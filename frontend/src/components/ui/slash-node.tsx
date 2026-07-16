'use client';

import * as React from 'react';

import type { PlateEditor, PlateElementProps } from 'platejs/react';

import {
  CalendarIcon,
  ChevronRightIcon,
  Code2,
  Columns3Icon,
  FileTextIcon,
  FileUpIcon,
  FilmIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  LightbulbIcon,
  ListIcon,
  ListOrdered,
  MusicIcon,
  PenToolIcon,
  PilcrowIcon,
  Quote,
  RadicalIcon,
  Square,
  SuperscriptIcon,
  Table,
  TableOfContentsIcon,
} from 'lucide-react';
import { type TComboboxInputElement, KEYS } from 'platejs';
import { PlateElement } from 'platejs/react';
import { toast } from 'sonner';

import {
  insertBlock,
  insertInlineElement,
} from '@/components/editor/transforms';
import { useOptionalPages } from '@/features/pages/page-context';
import { insertPageRef, PAGE_REF_KEY } from '@/features/pages/page-ref';

import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxGroupLabel,
  InlineComboboxInput,
  InlineComboboxItem,
} from './inline-combobox';

type Group = {
  group: string;
  items: {
    icon: React.ReactNode;
    value: string;
    onSelect: (editor: PlateEditor, value: string) => void;
    className?: string;
    focusEditor?: boolean;
    keywords?: string[];
    label?: string;
  }[];
};

const groups: Group[] = [
  {
    group: '基础块',
    items: [
      {
        icon: <PilcrowIcon />,
        keywords: ['paragraph', 'text', '文本'],
        label: '文本',
        value: KEYS.p,
      },
      {
        icon: <Heading1Icon />,
        keywords: ['title', 'h1', '标题'],
        label: '标题 1',
        value: KEYS.h1,
      },
      {
        icon: <Heading2Icon />,
        keywords: ['subtitle', 'h2', '标题'],
        label: '标题 2',
        value: KEYS.h2,
      },
      {
        icon: <Heading3Icon />,
        keywords: ['subtitle', 'h3', '标题'],
        label: '标题 3',
        value: KEYS.h3,
      },
      {
        icon: <ListIcon />,
        keywords: ['unordered', 'ul', '-', '列表'],
        label: '无序列表',
        value: KEYS.ul,
      },
      {
        icon: <ListOrdered />,
        keywords: ['ordered', 'ol', '1', '列表'],
        label: '有序列表',
        value: KEYS.ol,
      },
      {
        icon: <Square />,
        keywords: ['checklist', 'task', 'checkbox', '[]', '待办'],
        label: '待办列表',
        value: KEYS.listTodo,
      },
      {
        icon: <ChevronRightIcon />,
        keywords: ['collapsible', 'expandable', '折叠'],
        label: '折叠列表',
        value: KEYS.toggle,
      },
      {
        icon: <Code2 />,
        keywords: ['```', '代码'],
        label: '代码块',
        value: KEYS.codeBlock,
      },
      {
        icon: <Table />,
        label: '表格',
        value: KEYS.table,
      },
      {
        icon: <Quote />,
        keywords: ['citation', 'blockquote', 'quote', '>', '引用'],
        label: '引用',
        value: KEYS.blockquote,
      },
      {
        description: '插入高亮提示块。',
        icon: <LightbulbIcon />,
        keywords: ['note', '标注'],
        label: '标注',
        value: KEYS.callout,
      },
    ].map((item) => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value, { upsert: true });
      },
    })),
  },
  {
    group: '媒体',
    items: [
      {
        icon: <ImageIcon />,
        keywords: ['image', 'photo', 'picture', 'img', 'upload', '附件', '图片'],
        label: '图片',
        value: KEYS.img,
      },
      {
        icon: <FilmIcon />,
        keywords: ['video', 'movie', 'mp4', '视频'],
        label: '视频',
        value: KEYS.video,
      },
      {
        icon: <MusicIcon />,
        keywords: ['audio', 'music', 'sound', 'mp3', '音频'],
        label: '音频',
        value: KEYS.audio,
      },
      {
        icon: <FileUpIcon />,
        keywords: ['file', 'attachment', 'pdf', 'doc', 'upload', '附件', '文件'],
        label: '文件',
        value: KEYS.file,
      },
    ].map((item) => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value, { upsert: true });
      },
    })),
  },
  {
    group: '知识库',
    items: [],
  },
  {
    group: '高级块',
    items: [
      {
        icon: <TableOfContentsIcon />,
        keywords: ['toc', '目录'],
        label: '目录',
        value: KEYS.toc,
      },
      {
        icon: <Columns3Icon />,
        label: '三栏',
        value: 'action_three_columns',
      },
      {
        focusEditor: false,
        icon: <RadicalIcon />,
        label: '公式',
        value: KEYS.equation,
      },
      {
        icon: <PenToolIcon />,
        keywords: ['excalidraw', '白板'],
        label: '白板',
        value: KEYS.excalidraw,
      },
      {
        icon: <Code2 />,
        keywords: [
          'code-drawing',
          'diagram',
          'plantuml',
          'graphviz',
          'flowchart',
          'mermaid',
          '流程图',
          '架构图',
        ],
        label: '流程图',
        value: KEYS.codeDrawing,
      },
    ].map((item) => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value, { upsert: true });
      },
    })),
  },
  {
    group: '行内',
    items: [
      {
        focusEditor: true,
        icon: <CalendarIcon />,
        keywords: ['time', '日期'],
        label: '日期',
        value: KEYS.date,
      },
      {
        focusEditor: true,
        icon: <SuperscriptIcon />,
        keywords: ['citation', 'fn', 'footnote', '[^]', '脚注'],
        label: '脚注',
        value: 'action_footnote',
      },
      {
        focusEditor: false,
        icon: <RadicalIcon />,
        label: '行内公式',
        value: KEYS.inlineEquation,
      },
    ].map((item) => ({
      ...item,
      onSelect: (editor, value) => {
        insertInlineElement(editor, value);
      },
    })),
  },
];

export function SlashInputElement(
  props: PlateElementProps<TComboboxInputElement>
) {
  const { editor, element } = props;
  const pages = useOptionalPages();

  const menuGroups = React.useMemo(() => {
    if (!pages?.canEditActivePage || !pages.activePageId) {
      return groups.filter((group) => group.items.length > 0);
    }

    const parentId = pages.activePageId;

    return groups.map((group) => {
      if (group.group !== '知识库') {
        return group;
      }

      return {
        ...group,
        items: [
          {
            icon: <FileTextIcon />,
            keywords: [
              'page',
              'subpage',
              'child',
              '知识',
              '子知识',
              '内页',
              '知识库',
            ],
            label: '知识',
            value: PAGE_REF_KEY,
            onSelect: (currentEditor) => {
              void (async () => {
                const toastId = toast.loading('正在创建知识…');
                const pageId = await pages.createPage(parentId, {
                  navigate: false,
                  mode: 'embedded',
                });

                if (!pageId) {
                  toast.dismiss(toastId);
                  return;
                }

                insertPageRef(currentEditor, {
                  pageCode: pageId,
                  title: '无标题',
                  icon: '📄',
                });

                toast.success('已插入内页', { id: toastId });
              })();
            },
          },
        ],
      };
    });
  }, [pages]);

  return (
    <PlateElement {...props} as="span">
      <InlineCombobox element={element} trigger="/">
        <InlineComboboxInput />

        <InlineComboboxContent>
          <InlineComboboxEmpty>无结果</InlineComboboxEmpty>

          {menuGroups.map(({ group, items }) => (
            <InlineComboboxGroup key={group}>
              <InlineComboboxGroupLabel>{group}</InlineComboboxGroupLabel>

              {items.map(
                ({ focusEditor, icon, keywords, label, value, onSelect }) => (
                  <InlineComboboxItem
                    key={value}
                    value={value}
                    onClick={() => onSelect(editor, value)}
                    label={label}
                    focusEditor={focusEditor}
                    group={group}
                    keywords={keywords}
                  >
                    <div className="mr-2 text-muted-foreground">{icon}</div>
                    {label ?? value}
                  </InlineComboboxItem>
                )
              )}
            </InlineComboboxGroup>
          ))}
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  );
}
