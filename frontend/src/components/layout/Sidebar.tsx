import * as React from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  House,
  Link2,
  LogOut,
  Settings,
  SquarePen,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useLayout } from '@/components/layout/layout-context';
import { useAuth } from '@/features/auth/auth-context';
import { getCoverSurfaceStyle } from '@/features/pages/cover';
import { usePages } from '@/features/pages/page-context';
import { MAX_CONTAINER_DEPTH, MAX_PAGE_DEPTH, getPageDepth } from '@/features/pages/store';
import type { PageId, PageTreeNode, SharedPageTreeNode } from '@/features/pages/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ColorEmoji } from '@/components/ui/color-emoji';
import { useIsMobile } from '@/hooks/use-mobile';
import { fetchMyInvitations } from '@/lib/api/communities';
import { getNavLabelFontClass } from '@/lib/nav-font';
import { cn } from '@/lib/utils';

const SIDEBAR_WIDTH = 300;
const SIDEBAR_COLLAPSED_WIDTH = 52;
const SIDEBAR_TITLE_MAX_CHARS = 12;

function shortenSidebarTitle(title: string, maxChars = SIDEBAR_TITLE_MAX_CHARS) {
  const text = title.trim() || '无标题';
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}…`;
}

function SidebarNavItem({
  icon,
  label,
  active,
  onClick,
  href,
  trailing,
  onNavigate,
  collapsed = false,
  showTrailingAlways = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  trailing?: React.ReactNode;
  onNavigate?: () => void;
  collapsed?: boolean;
  showTrailingAlways?: boolean;
}) {
  const isMobile = useIsMobile();
  const [hovered, setHovered] = React.useState(false);
  const showTrailing =
    Boolean(trailing) && (showTrailingAlways || hovered || isMobile);

  const className = cn(
    'relative flex min-h-[28px] min-w-0 cursor-pointer items-center rounded-md text-[13px] leading-5 transition-colors',
    collapsed
      ? 'mx-auto size-9 justify-center px-0 py-0'
      : 'w-full py-1 pl-2 pr-1',
    active || hovered
      ? 'bg-primary/4 text-foreground'
      : 'text-muted-foreground'
  );

  const content = collapsed ? (
    <span
      className="relative flex size-[18px] shrink-0 items-center justify-center"
      title={label}
    >
      {icon}
    </span>
  ) : (
    <>
      <span className="relative mr-2 flex size-[18px] shrink-0 items-center justify-center [&_svg]:size-[18px]">
        {icon}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate font-medium tracking-tight',
          showTrailing ? 'pr-10' : 'pr-1',
          getNavLabelFontClass(label)
        )}
        title={label}
      >
        {label}
      </span>
      {showTrailing ? (
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-x-1">
          {trailing}
        </div>
      ) : null}
    </>
  );

  const hoverHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };

  if (href) {
    return (
      <Link
        to={href}
        className={className}
        onClick={onNavigate}
        {...hoverHandlers}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        onNavigate?.();
      }}
      className={cn(className, 'w-full text-left')}
      {...hoverHandlers}
    >
      {content}
    </button>
  );
}

function SidebarIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className="flex size-[28px] items-center justify-center rounded-sm text-muted-foreground transition hover:bg-primary/4"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

const DEPTH_PADDING = ['pl-2', 'pl-6', 'pl-10'] as const;

function countDescendants(node: PageTreeNode): number {
  return node.children.reduce(
    (total, child) => total + 1 + countDescendants(child),
    0
  );
}

function DeletePageDialog({
  node,
  open,
  onOpenChange,
  onConfirm,
}: {
  node: PageTreeNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const childCount = node ? countDescendants(node) : 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[420px]">
        <AlertDialogHeader>
          <AlertDialogTitle>删除知识</AlertDialogTitle>
          <AlertDialogDescription>
            {childCount > 0
              ? `含 ${childCount} 个子知识，删除后无法恢复。`
              : '删除后无法恢复。'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {node ? (
          <AlertDialogBody className="pt-5">
            <div
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={getCoverSurfaceStyle(node.coverColor ?? '#EBECED')}
            >
              {node.icon ? (
                <ColorEmoji size={24}>{node.icon}</ColorEmoji>
              ) : (
                <span className="text-2xl leading-none">📄</span>
              )}
              <span className="min-w-0 truncate text-sm font-medium text-foreground/90">
                {node.title}
              </span>
            </div>
          </AlertDialogBody>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              'h-8 border-0 bg-sidebar-primary/14 px-2.5 font-nav-cjk text-[13px] font-medium text-sidebar-primary shadow-none hover:bg-sidebar-primary/22 focus-visible:ring-sidebar-primary/30'
            )}
            onClick={onConfirm}
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SidebarPageTreeItem({
  node,
  depth,
  collapsedIds,
  onToggle,
  onCreateChild,
  onRequestDelete,
  onNavigate,
  sidebarCollapsed = false,
  mode = 'owned',
}: {
  node: PageTreeNode | SharedPageTreeNode;
  depth: number;
  collapsedIds: Set<string>;
  onToggle: (pageId: string) => void;
  onCreateChild: (parentId: string) => void | Promise<void>;
  onRequestDelete?: (pageId: PageId) => void;
  onNavigate?: () => void;
  sidebarCollapsed?: boolean;
  mode?: 'owned' | 'shared';
}) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { workspace } = usePages();
  const href = `/page/${node.id}`;
  const isActive = location.pathname === href;
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);
  const sharedNode = mode === 'shared' ? (node as SharedPageTreeNode) : null;
  const canCreateChild =
    mode === 'shared'
      ? sharedNode?.permission === 'edit' &&
        (sharedNode.containerId
          ? sharedNode.depth < MAX_CONTAINER_DEPTH
          : sharedNode.depth < MAX_PAGE_DEPTH)
      : getPageDepth(workspace, node.id) < MAX_PAGE_DEPTH;
  const canDelete = mode === 'owned' && Boolean(onRequestDelete);
  const [hovered, setHovered] = React.useState(false);
  const showActions = hovered || isMobile;

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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'relative flex min-w-0 items-center rounded-md py-0.5 pr-1 transition-colors duration-150',
          DEPTH_PADDING[depth] ?? DEPTH_PADDING[2],
          hovered || isActive ? 'bg-primary/4' : ''
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
            'flex min-w-0 flex-1 items-center overflow-hidden rounded-md py-1 pr-10 transition-colors',
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

        {showActions && (canCreateChild || canDelete) ? (
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
            {canCreateChild ? (
              <SidebarIconButton
                label="新建子知识"
                onClick={() => void onCreateChild(node.id)}
              >
                <SquarePen className="size-4" />
              </SidebarIconButton>
            ) : null}

            {canDelete ? (
              <SidebarIconButton
                label="删除知识"
                onClick={() => onRequestDelete?.(node.id)}
              >
                <Trash2 className="size-4" />
              </SidebarIconButton>
            ) : null}
          </div>
        ) : null}
      </div>

      {hasChildren && !isCollapsed
        ? node.children.map((child) => (
            <SidebarPageTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsedIds={collapsedIds}
              onToggle={onToggle}
              onCreateChild={onCreateChild}
              onRequestDelete={onRequestDelete}
              onNavigate={onNavigate}
              sidebarCollapsed={sidebarCollapsed}
              mode={mode}
            />
          ))
        : null}
    </div>
  );
}

function findSharedPageNode(
  nodes: SharedPageTreeNode[],
  pageId: PageId
): SharedPageTreeNode | null {
  for (const node of nodes) {
    if (node.id === pageId) {
      return node;
    }

    const child = findSharedPageNode(node.children, pageId);

    if (child) {
      return child;
    }
  }

  return null;
}

function findPageNode(
  nodes: PageTreeNode[],
  pageId: PageId
): PageTreeNode | null {
  for (const node of nodes) {
    if (node.id === pageId) {
      return node;
    }

    const child = findPageNode(node.children, pageId);

    if (child) {
      return child;
    }
  }

  return null;
}

/** Collect ids of nodes that have children (used to collapse beyond a visible level). */
function collectExpandableIds(
  nodes: PageTreeNode[],
  out: Set<string> = new Set()
): Set<string> {
  for (const node of nodes) {
    if (node.children.length > 0) {
      out.add(node.id);
      collectExpandableIds(node.children, out);
    }
  }
  return out;
}

/** Default: only the first level (roots) is visible. */
function collectDefaultCollapsedIds(nodes: PageTreeNode[]) {
  return collectExpandableIds(nodes);
}

/** Ancestor ids from root to parent of target (empty if target is root). */
function findAncestorIds(
  nodes: PageTreeNode[],
  targetId: string
): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return [];
    }
    const childPath = findAncestorIds(node.children, targetId);
    if (childPath) {
      return [node.id, ...childPath];
    }
  }
  return null;
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    pageTree,
    sharedPageTree,
    sharedPages,
    createPage,
    deletePage,
  } = usePages();
  const { user, isAuthenticated, logout } = useAuth();
  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapsed,
  } = useLayout();
  const [collapseOverrides, setCollapseOverrides] = React.useState<
    Record<string, boolean>
  >({});
  const [sharedCollapsedIds, setSharedCollapsedIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [sharedSectionCollapsed, setSharedSectionCollapsed] = React.useState(true);
  const [deleteTargetId, setDeleteTargetId] = React.useState<PageId | null>(
    null
  );
  const [pendingInviteCount, setPendingInviteCount] = React.useState(0);

  // 默认只显示一级：有子节点的知识全部收起；用户手动展开/收起写入 overrides
  const defaultCollapsedIds = React.useMemo(
    () => collectDefaultCollapsedIds(pageTree),
    [pageTree]
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

  // 打开/刷新知识时，在「我的知识」中展开到当前项
  React.useEffect(() => {
    const match = location.pathname.match(/^\/page\/([^/]+)$/);
    if (!match) {
      return;
    }

    const ancestors = findAncestorIds(pageTree, match[1]);
    if (!ancestors || ancestors.length === 0) {
      return;
    }

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
  }, [location.pathname, pageTree]);

  const isHome = location.pathname === '/';
  const isShared = location.pathname === '/shared';
  const isCommunities =
    location.pathname === '/communities' ||
    location.pathname.startsWith('/communities/');
  const isSettings = location.pathname === '/settings';
  const deleteTargetNode = deleteTargetId
    ? findPageNode(pageTree, deleteTargetId)
    : null;

  const closeSidebar = React.useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const toggleSharedCollapsed = React.useCallback((pageId: string) => {
    setSharedCollapsedIds((current) => {
      const next = new Set(current);

      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }

      return next;
    });
  }, []);

  const toggleCollapsed = React.useCallback(
    (pageId: string) => {
      setCollapseOverrides((current) => {
        const baseCollapsed = defaultCollapsedIds.has(pageId);
        const wasCollapsed =
          pageId in current ? Boolean(current[pageId]) : baseCollapsed;
        return {
          ...current,
          [pageId]: !wasCollapsed,
        };
      });
    },
    [defaultCollapsedIds]
  );

  const handleConfirmDelete = React.useCallback(() => {
    if (!deleteTargetId) {
      return;
    }

    void deletePage(deleteTargetId);
    setDeleteTargetId(null);
  }, [deletePage, deleteTargetId]);

  const handleSidebarToggle = React.useCallback(() => {
    if (isMobile) {
      setSidebarOpen(false);
      return;
    }

    toggleSidebarCollapsed();
  }, [isMobile, setSidebarOpen, toggleSidebarCollapsed]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setPendingInviteCount(0);
      return;
    }

    let cancelled = false;

    void fetchMyInvitations()
      .then((items) => {
        if (!cancelled) {
          setPendingInviteCount(items.length);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPendingInviteCount(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, location.pathname]);

  const isCollapsedDesktop = !isMobile && sidebarCollapsed;

  return (
    <>
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-dvh shrink-0 overflow-hidden transition-[width,transform] duration-300 md:static md:z-auto md:translate-x-0',
          isCollapsedDesktop ? 'md:w-[52px]' : 'w-[min(300px,85vw)] md:w-[300px]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          width: isMobile
            ? undefined
            : isCollapsedDesktop
              ? SIDEBAR_COLLAPSED_WIDTH
              : SIDEBAR_WIDTH,
        }}
      >
        <div className="relative flex min-w-0 flex-1 bg-muted/50">
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
                  <Link
                    to="/"
                    onClick={closeSidebar}
                    className="font-sans truncate text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
                  >
                    Knowledge
                  </Link>
                  <button
                    type="button"
                    onClick={handleSidebarToggle}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-primary/4"
                    aria-label="折叠侧栏"
                    title="折叠侧栏"
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
              <SidebarNavItem
                label="Home"
                href="/"
                active={isHome}
                onNavigate={closeSidebar}
                collapsed={isCollapsedDesktop}
                icon={<House className="size-[18px] shrink" />}
              />

              <SidebarNavItem
                label="我的知识"
                collapsed={isCollapsedDesktop}
                icon={
                  <BookOpen className="size-[18px] shrink" />
                }
                trailing={
                  isCollapsedDesktop ? undefined : (
                    <SidebarIconButton
                      label="新建知识"
                      onClick={() => void createPage()}
                    >
                      <SquarePen className="size-4" />
                    </SidebarIconButton>
                  )
                }
              />

              {isCollapsedDesktop ? (
                <div className="flex justify-center">
                  <SidebarIconButton
                    label="新建知识"
                    onClick={() => void createPage()}
                  >
                    <SquarePen className="size-4" />
                  </SidebarIconButton>
                </div>
              ) : pageTree.length === 0 ? (
                <p
                  className="font-nav-cjk cursor-pointer select-none py-1 pl-4 text-xs text-muted-foreground/80"
                  onClick={() => void createPage()}
                >
                  暂无知识
                </p>
              ) : (
                pageTree.map((node) => (
                  <SidebarPageTreeItem
                    key={node.id}
                    node={node}
                    depth={0}
                    collapsedIds={collapsedIds}
                    onToggle={toggleCollapsed}
                    onCreateChild={createPage}
                    onRequestDelete={setDeleteTargetId}
                    onNavigate={closeSidebar}
                    sidebarCollapsed={isCollapsedDesktop}
                  />
                ))
              )}

              <SidebarNavItem
                label="共享的知识"
                href="/shared"
                active={isShared}
                onNavigate={closeSidebar}
                collapsed={isCollapsedDesktop}
                showTrailingAlways
                icon={<Link2 className="size-[18px] shrink" />}
                trailing={
                  isCollapsedDesktop ? undefined : (
                    <SidebarIconButton
                      label={sharedSectionCollapsed ? '展开' : '收起'}
                      onClick={() => setSharedSectionCollapsed((v) => !v)}
                    >
                      {sharedSectionCollapsed ? (
                        <ChevronRight className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </SidebarIconButton>
                  )
                }
              />

              {!isCollapsedDesktop && !sharedSectionCollapsed ? (
                sharedPageTree.length === 0 ? (
                  sharedPages.length === 0 ? (
                    <p className="font-nav-cjk select-none py-1 pl-4 text-xs text-muted-foreground/80">
                      暂无共享知识
                    </p>
                  ) : null
                ) : (
                  sharedPageTree.map((node) => (
                    <SidebarPageTreeItem
                      key={node.id}
                      node={node}
                      depth={0}
                      collapsedIds={sharedCollapsedIds}
                      onToggle={toggleSharedCollapsed}
                      onCreateChild={createPage}
                      onNavigate={closeSidebar}
                      mode="shared"
                    />
                  ))
                )
              ) : null}

              <SidebarNavItem
                label="社区"
                href="/communities"
                active={isCommunities}
                onNavigate={closeSidebar}
                collapsed={isCollapsedDesktop}
                icon={<Users className="size-[18px] shrink" />}
                trailing={
                  !isCollapsedDesktop && pendingInviteCount > 0 ? (
                    <span className="mr-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {pendingInviteCount}
                    </span>
                  ) : undefined
                }
              />
            </div>

            <div
              className={cn(
                'mt-auto space-y-1 border-t border-border/60 pt-3',
                isCollapsedDesktop ? 'w-full px-1.5 pb-4' : 'px-2 pb-4'
              )}
            >
              <SidebarNavItem
                label={isAuthenticated ? user?.name ?? '账户' : '登录'}
                href={isAuthenticated ? undefined : '/login'}
                onClick={
                  isAuthenticated
                    ? () => {
                        logout();
                        navigate('/login');
                        closeSidebar();
                      }
                    : undefined
                }
                collapsed={isCollapsedDesktop}
                icon={
                  isAuthenticated ? (
                    <LogOut className="size-[18px] shrink" />
                  ) : (
                    <User className="size-[18px] shrink" />
                  )
                }
                trailing={
                  isAuthenticated && !isCollapsedDesktop ? (
                    <span className="font-nav-cjk text-[10px] text-muted-foreground">退出</span>
                  ) : undefined
                }
              />
              <SidebarNavItem
                label="设置"
                href="/settings"
                active={isSettings}
                onNavigate={closeSidebar}
                collapsed={isCollapsedDesktop}
                icon={<Settings className="size-[18px] shrink" />}
              />
            </div>
          </aside>

          {!isCollapsedDesktop ? (
            <div className="group absolute top-0 right-0 z-30 hidden h-full w-[12px] cursor-col-resize border-border/60 pl-2 hover:border-border md:block">
              <div className="h-full opacity-0 transition-opacity group-hover:bg-border group-hover:opacity-100" />
            </div>
          ) : null}
        </div>
      </div>

      <DeletePageDialog
        node={deleteTargetNode}
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetId(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
