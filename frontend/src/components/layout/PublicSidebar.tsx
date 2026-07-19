import * as React from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LogIn,
  SquarePen,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { useLayout } from '@/components/layout/layout-context';
import { ColorEmoji } from '@/components/ui/color-emoji';
import { useAuth } from '@/features/auth/auth-context';
import { mapTreeNode } from '@/features/pages/mappers';
import type { PageId, PageTreeNode } from '@/features/pages/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { fetchPublicPageTree } from '@/lib/api/pages';
import { getNavLabelFontClass } from '@/lib/nav-font';
import { pagePath, publicPagePath } from '@/lib/page-paths';
import { cn } from '@/lib/utils';

const SIDEBAR_WIDTH = 300;
const SIDEBAR_COLLAPSED_WIDTH = 52;
const SIDEBAR_TITLE_MAX_CHARS = 12;
const DEPTH_PADDING = ['pl-2', 'pl-6', 'pl-10'] as const;

function shortenSidebarTitle(title: string, maxChars = SIDEBAR_TITLE_MAX_CHARS) {
  const text = title.trim() || '无标题';
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}…`;
}

function collectDefaultCollapsedIds(
  nodes: PageTreeNode[],
  out: Set<string> = new Set()
): Set<string> {
  for (const node of nodes) {
    if (node.children.length > 0) {
      out.add(node.id);
      collectDefaultCollapsedIds(node.children, out);
    }
  }
  return out;
}

function findAncestorIds(
  nodes: PageTreeNode[],
  pageId: PageId,
  trail: PageId[] = []
): PageId[] | null {
  for (const node of nodes) {
    if (node.id === pageId) {
      return trail;
    }
    const found = findAncestorIds(node.children, pageId, [...trail, node.id]);
    if (found) {
      return found;
    }
  }
  return null;
}

function PublicPageTreeItem({
  node,
  depth,
  collapsedIds,
  onToggle,
  onNavigate,
  sidebarCollapsed = false,
}: {
  node: PageTreeNode;
  depth: number;
  collapsedIds: Set<string>;
  onToggle: (pageId: string) => void;
  onNavigate?: () => void;
  sidebarCollapsed?: boolean;
}) {
  const location = useLocation();
  const href = publicPagePath(node.id);
  const isActive = location.pathname === href;
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);

  if (sidebarCollapsed) {
    return (
      <Link
        to={href}
        onClick={onNavigate}
        title={node.title}
        className={cn(
          'mx-auto flex size-9 items-center justify-center rounded-md transition-colors',
          isActive
            ? 'bg-primary/4 text-foreground'
            : 'text-foreground/80 hover:bg-primary/4'
        )}
      >
        <ColorEmoji size={18}>{node.icon ?? '📄'}</ColorEmoji>
      </Link>
    );
  }

  return (
    <div className="min-w-0 w-full">
      <div
        className={cn(
          'relative flex min-w-0 items-center rounded-md py-0.5 pr-1 transition-colors duration-150',
          DEPTH_PADDING[depth] ?? DEPTH_PADDING[2],
          isActive ? 'bg-primary/4' : 'hover:bg-primary/4'
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
          to={href}
          onClick={onNavigate}
          className={cn(
            'flex min-w-0 flex-1 items-center overflow-hidden rounded-md py-1 pr-2 transition-colors',
            isActive ? 'text-foreground' : 'text-foreground/90'
          )}
        >
          <span className="relative mr-2 flex size-5 shrink-0 items-center justify-center">
            <ColorEmoji size={18}>{node.icon ?? '📄'}</ColorEmoji>
          </span>
          <span
            className={cn(
              'block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium leading-5',
              getNavLabelFontClass(node.title)
            )}
            title={node.title}
          >
            {shortenSidebarTitle(node.title)}
          </span>
        </Link>
      </div>

      {hasChildren && !isCollapsed
        ? node.children.map((child) => (
            <PublicPageTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsedIds={collapsedIds}
              onToggle={onToggle}
              onNavigate={onNavigate}
              sidebarCollapsed={sidebarCollapsed}
            />
          ))
        : null}
    </div>
  );
}

export function PublicSidebar({ pageId }: { pageId: string }) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isAuthenticated } = useAuth();
  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapsed,
  } = useLayout();
  const [tree, setTree] = React.useState<PageTreeNode[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [collapseOverrides, setCollapseOverrides] = React.useState<
    Record<string, boolean>
  >({});

  React.useEffect(() => {
    if (!pageId) {
      setTree([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    void fetchPublicPageTree(pageId, { signal: controller.signal })
      .then((nodes) => {
        if (controller.signal.aborted) return;
        setTree(nodes.map(mapTreeNode));
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setTree((current) => (current.length > 0 ? current : []));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [pageId]);

  const defaultCollapsedIds = React.useMemo(
    () => collectDefaultCollapsedIds(tree),
    [tree]
  );

  const collapsedIds = React.useMemo(() => {
    const next = new Set(defaultCollapsedIds);
    for (const [id, collapsed] of Object.entries(collapseOverrides)) {
      if (collapsed) {
        next.add(id);
      } else {
        next.delete(id);
      }
    }
    return next;
  }, [defaultCollapsedIds, collapseOverrides]);

  React.useEffect(() => {
    const match = location.pathname.match(/^\/public\/([^/]+)$/);
    if (!match) return;

    const ancestors = findAncestorIds(tree, match[1]);
    if (!ancestors || ancestors.length === 0) return;

    setCollapseOverrides((current) => {
      let changed = false;
      const next = { ...current };
      for (const id of ancestors) {
        if (next[id] !== false) {
          next[id] = false;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [location.pathname, tree]);

  const closeSidebar = React.useCallback(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile, setSidebarOpen]);

  const handleSidebarToggle = () => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      toggleSidebarCollapsed();
    }
  };

  const toggleCollapsed = (id: string) => {
    setCollapseOverrides((current) => ({
      ...current,
      [id]: !collapsedIds.has(id),
    }));
  };

  const isCollapsedDesktop = !isMobile && sidebarCollapsed;
  const openInAppHref = isAuthenticated ? pagePath(pageId) : '/login';

  return (
    <div
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex h-dvh shrink-0 overflow-hidden transition-[width,transform] duration-300 md:static md:z-auto md:translate-x-0',
        isCollapsedDesktop ? 'md:w-[52px]' : 'w-[min(300px,85vw)] md:w-[300px]',
        sidebarOpen
          ? 'translate-x-0'
          : '-translate-x-full max-md:pointer-events-none'
      )}
      style={{
        width: isMobile
          ? undefined
          : isCollapsedDesktop
            ? SIDEBAR_COLLAPSED_WIDTH
            : SIDEBAR_WIDTH,
      }}
    >
      <div
        className={cn(
          'relative flex min-w-0 flex-1',
          isMobile ? 'bg-sidebar' : 'bg-muted/50'
        )}
      >
        <aside
          className={cn(
            'font-nav group/sidebar relative z-20 flex size-full min-w-0 flex-col overflow-x-hidden overflow-y-auto border-r pb-[env(safe-area-inset-bottom)]',
            isCollapsedDesktop && 'items-center'
          )}
        >
          <div
            className={cn(
              'flex shrink-0 items-center',
              isCollapsedDesktop
                ? 'mx-auto my-1.5 w-full flex-col gap-1 px-1.5'
                : 'mx-2 my-1.5 min-h-[32px] justify-between px-2'
            )}
          >
            {isCollapsedDesktop ? (
              <>
                <span className="font-sans text-sm font-semibold tracking-tight text-foreground">
                  W
                </span>
                <button
                  type="button"
                  onClick={handleSidebarToggle}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-primary/4"
                  aria-label="展开侧栏"
                  title="展开侧栏"
                >
                  <ChevronsRight className="size-4" />
                </button>
              </>
            ) : (
              <>
                <span className="font-sans truncate text-sm font-semibold tracking-tight text-foreground">
                  Knowledge
                </span>
                <button
                  type="button"
                  onClick={handleSidebarToggle}
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-primary/4"
                  aria-label={isMobile ? '关闭侧栏' : '折叠侧栏'}
                  title={isMobile ? '关闭侧栏' : '折叠侧栏'}
                >
                  <ChevronsLeft className="size-4" />
                </button>
              </>
            )}
          </div>

          <div
            className={cn(
              'min-w-0 flex-1 space-y-1 overflow-x-hidden pb-4',
              isCollapsedDesktop ? 'w-full px-1.5' : 'px-2'
            )}
          >
            {!isCollapsedDesktop ? (
              <p className="font-nav-cjk select-none px-2 py-1 text-xs text-muted-foreground/80">
                公开的知识
              </p>
            ) : null}

            {loading ? (
              <p className="font-nav-cjk select-none py-1 pl-4 text-xs text-muted-foreground/80">
                加载目录…
              </p>
            ) : tree.length === 0 ? (
              <p className="font-nav-cjk select-none py-1 pl-4 text-xs text-muted-foreground/80">
                暂无目录
              </p>
            ) : (
              tree.map((node) => (
                <PublicPageTreeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  collapsedIds={collapsedIds}
                  onToggle={toggleCollapsed}
                  onNavigate={closeSidebar}
                  sidebarCollapsed={isCollapsedDesktop}
                />
              ))
            )}
          </div>

          <div
            className={cn(
              'mt-auto space-y-1 border-t border-border/60 pt-3',
              isCollapsedDesktop ? 'w-full px-1.5 pb-4' : 'px-2 pb-4'
            )}
          >
            <Link
              to={openInAppHref}
              onClick={closeSidebar}
              title={isAuthenticated ? '在 Knowledge 中打开' : '登录'}
              className={cn(
                'flex items-center rounded-md text-sm text-foreground/90 transition-colors hover:bg-primary/4',
                isCollapsedDesktop
                  ? 'mx-auto size-9 justify-center'
                  : 'min-h-[28px] gap-2 px-2 py-1'
              )}
            >
              {isAuthenticated ? (
                <SquarePen className="size-[18px] shrink-0" />
              ) : (
                <LogIn className="size-[18px] shrink-0" />
              )}
              {!isCollapsedDesktop ? (
                <span className="truncate">
                  {isAuthenticated ? '在 Knowledge 中打开' : '登录'}
                </span>
              ) : null}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
