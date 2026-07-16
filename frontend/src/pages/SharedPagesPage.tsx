import { ChevronDown, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

import { ColorEmoji } from '@/components/ui/color-emoji';
import { usePages } from '@/features/pages/page-context';
import type { SharedPageTreeNode } from '@/features/pages/types';
import { getNavLabelFontClass } from '@/lib/nav-font';
import { cn } from '@/lib/utils';

const DEPTH_PADDING = ['pl-2', 'pl-6', 'pl-10'] as const;

function formatVia(item: SharedPageTreeNode) {
  if (item.via?.type === 'community') {
    return item.via.name;
  }
  if (item.via?.type === 'user') {
    return '直接共享';
  }
  if (item.via?.type === 'public') {
    return '公开链接';
  }
  return '';
}

function SharedPageTreeRow({
  node,
  depth,
  collapsedIds,
  onToggle,
}: {
  node: SharedPageTreeNode;
  depth: number;
  collapsedIds: Set<string>;
  onToggle: (pageId: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);

  return (
    <div className="min-w-0">
      <div
        className={cn(
          'flex min-w-0 items-center rounded-md py-0.5 pr-2 transition-colors hover:bg-primary/4',
          DEPTH_PADDING[depth] ?? DEPTH_PADDING[2]
        )}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(node.id)}
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground/60 transition hover:bg-primary/6',
            !hasChildren && 'invisible'
          )}
          aria-label={isCollapsed ? '展开' : '收起'}
          tabIndex={hasChildren ? 0 : -1}
        >
          {isCollapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </button>

        <Link
          to={`/page/${node.id}`}
          className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden py-1.5"
        >
          <span className="relative flex size-5 shrink-0 items-center justify-center">
            <ColorEmoji size={18}>{node.icon ?? '📄'}</ColorEmoji>
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn('block truncate', getNavLabelFontClass(node.title))}
              title={node.title}
            >
              {node.title}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {node.permission === 'edit' ? '可编辑' : '只读'}
              {formatVia(node) ? ` · ${formatVia(node)}` : ''}
              {node.ownerName ? ` · ${node.ownerName}` : ''}
            </span>
          </span>
        </Link>
      </div>

      {hasChildren && !isCollapsed
        ? node.children.map((child) => (
            <SharedPageTreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsedIds={collapsedIds}
              onToggle={onToggle}
            />
          ))
        : null}
    </div>
  );
}

export function SharedPagesPage() {
  const { sharedPageTree, isSharedPagesLoading } = usePages();
  const [collapsedIds, setCollapsedIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const toggleCollapsed = React.useCallback((pageId: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);

      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }

      return next;
    });
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6 md:px-12 md:py-12">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            共享的知识
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            来自用户与社区共享的知识
          </p>
        </header>

        {isSharedPagesLoading ? (
          <p className="text-sm text-muted-foreground">加载中…</p>
        ) : sharedPageTree.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无共享知识</p>
        ) : (
          <div className="rounded-xl border border-border/60 bg-muted/20 px-2 py-2">
            {sharedPageTree.map((node) => (
              <SharedPageTreeRow
                key={node.id}
                node={node}
                depth={0}
                collapsedIds={collapsedIds}
                onToggle={toggleCollapsed}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
