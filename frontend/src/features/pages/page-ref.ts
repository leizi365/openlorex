import type { PlateEditor } from 'platejs/react';
import type { TElement } from 'platejs';

export const PAGE_REF_KEY = 'page_ref';

export type TPageRefElement = TElement & {
  type: typeof PAGE_REF_KEY;
  pageCode: string;
  title?: string;
  icon?: string;
};

export type InsertPageRefData = {
  pageCode: string;
  title: string;
  icon?: string;
};

export function getPageRefLabel(data: {
  title?: string;
  icon?: string;
}): string {
  const icon = data.icon?.trim() || '📄';
  const title = data.title?.trim() || '无标题';
  return `${icon} ${title}`;
}

/** 以内联链接形式插入，行为对齐正文超链接。 */
export function insertPageRef(editor: PlateEditor, data: InsertPageRefData) {
  const label = getPageRefLabel(data);

  editor.tf.insertNodes(
    {
      type: PAGE_REF_KEY,
      pageCode: data.pageCode,
      title: data.title,
      icon: data.icon,
      children: [{ text: label }],
    } satisfies TPageRefElement,
    { select: true }
  );

  // 链接后落到普通文本，便于继续输入
  editor.tf.insertNodes({ text: '' });
}
