'use client';

import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { NodeApi } from 'platejs';
import type { PlateElementProps } from 'platejs/react';
import {
  PlateElement,
  useEditorRef,
  useElement,
  usePath,
  useReadOnly,
} from 'platejs/react';

import { cn } from '@/app/api/ai/command/utils';
import { useOptionalPages } from '@/features/pages/page-context';
import {
  getPageRefLabel,
  type TPageRefElement,
} from '@/features/pages/page-ref';
import { inlineSuggestionVariants } from '@/lib/suggestion';
import * as pagesApi from '@/lib/api/pages';

function usePageRefLiveMeta(pageCode: string | undefined) {
  const pages = useOptionalPages();
  const fromStore = pageCode
    ? (pages?.workspace.pages[pageCode] ??
      pages?.sharedWorkspace.pages[pageCode])
    : undefined;

  const [fetched, setFetched] = React.useState<{
    title: string;
    icon?: string;
  } | null>(null);

  React.useEffect(() => {
    if (!pageCode || fromStore) {
      setFetched(null);
      return;
    }

    let cancelled = false;

    void pagesApi
      .fetchPage(pageCode)
      .then((dto) => {
        if (cancelled) return;
        setFetched({
          title: dto.title,
          icon: dto.icon ?? undefined,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setFetched(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pageCode, fromStore]);

  if (fromStore) {
    return {
      title: fromStore.title,
      icon: fromStore.icon,
    };
  }

  return fetched;
}

/**
 * 内页引用 = 行内文字链接；图标/标题跟随目标页。
 */
export function PageRefElement(props: PlateElementProps<TPageRefElement>) {
  const { children } = props;
  const element = useElement<TPageRefElement>();
  const path = usePath();
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const navigate = useNavigate();
  const live = usePageRefLiveMeta(element.pageCode);
  const href = element.pageCode ? `/page/${element.pageCode}` : undefined;

  React.useEffect(() => {
    if (!live || readOnly) {
      return;
    }

    const expected = getPageRefLabel(live);
    const current = NodeApi.string(element);
    const sameText = current === expected;
    const sameMeta =
      element.title === live.title &&
      (element.icon ?? '📄') === (live.icon?.trim() || '📄');

    if (sameText && sameMeta) {
      return;
    }

    editor.tf.withoutNormalizing(() => {
      for (let i = element.children.length - 1; i >= 0; i -= 1) {
        editor.tf.removeNodes({ at: [...path, i] });
      }
      editor.tf.insertNodes({ text: expected }, { at: [...path, 0] });
      editor.tf.setNodes(
        {
          title: live.title,
          icon: live.icon?.trim() || '📄',
        },
        { at: path }
      );
    });
  }, [
    editor,
    element,
    live,
    live?.icon,
    live?.title,
    path,
    readOnly,
  ]);

  const handleClick = React.useCallback(
    (event: React.MouseEvent) => {
      if (!href) {
        return;
      }

      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      navigate(href);
    },
    [href, navigate]
  );

  return (
    <PlateElement
      {...props}
      as="a"
      className={cn(
        'cursor-pointer font-medium text-primary no-underline hover:underline hover:decoration-primary hover:underline-offset-4',
        inlineSuggestionVariants()
      )}
      attributes={{
        ...props.attributes,
        href,
        'data-page-ref': true,
        title: readOnly ? '打开知识' : '划选可改样式；单击打开知识',
        onClick: handleClick,
        onMouseOver: (event) => {
          event.stopPropagation();
        },
      }}
    >
      {readOnly && live ? (
        <>
          <span contentEditable={false}>{getPageRefLabel(live)}</span>
          <span className="hidden">{children}</span>
        </>
      ) : (
        children
      )}
    </PlateElement>
  );
}
