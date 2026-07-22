'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight, PanelLeftClose, TableOfContents } from 'lucide-react';
import { ElementApi, KEYS, NodeApi } from 'platejs';
import { useEditorSelector, type PlateEditor } from 'platejs/react';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type OutlineHeading = {
  id: string;
  depth: number;
  title: string;
};

type OutlineTreeNode = OutlineHeading & {
  children: OutlineTreeNode[];
};

const HEADING_DEPTH: Record<string, number> = {
  [KEYS.h1]: 1,
  [KEYS.h2]: 2,
  [KEYS.h3]: 3,
  [KEYS.h4]: 4,
  [KEYS.h5]: 5,
  [KEYS.h6]: 6,
};

const OUTLINE_INDENT = ['pl-0.5', 'pl-3', 'pl-5', 'pl-7'] as const;

function getOutlineHeadings(editor: PlateEditor): OutlineHeading[] {
  const items: OutlineHeading[] = [];
  const entries = editor.api.nodes({
    at: [],
    match: (n) =>
      ElementApi.isElement(n) &&
      KEYS.heading.includes(n.type as (typeof KEYS.heading)[number]),
  });

  for (const [node] of entries) {
    if (!ElementApi.isElement(node)) continue;
    const id = typeof node.id === 'string' ? node.id : undefined;
    const title = NodeApi.string(node).trim();
    const depth = HEADING_DEPTH[node.type] ?? 1;
    if (!id || !title) continue;
    items.push({ id, depth, title });
  }
  return items;
}

function buildHeadingTree(headings: OutlineHeading[]): OutlineTreeNode[] {
  const root: OutlineTreeNode[] = [];
  const stack: OutlineTreeNode[] = [];

  for (const heading of headings) {
    const node: OutlineTreeNode = { ...heading, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].depth >= heading.depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return root;
}

function collectExpandableIds(
  nodes: OutlineTreeNode[],
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

function buildTreeStructureKey(nodes: OutlineTreeNode[]): string {
  return nodes
    .map((node) => `${node.id}(${buildTreeStructureKey(node.children)})`)
    .join(',');
}

function findAncestorIds(
  nodes: OutlineTreeNode[],
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

function OutlineTreeItem({
  node,
  depth,
  collapsedIds,
  activeId,
  onToggle,
  onScrollTo,
}: {
  node: OutlineTreeNode;
  depth: number;
  collapsedIds: Set<string>;
  activeId: string | null;
  onToggle: (id: string) => void;
  onScrollTo: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);
  const isActive = node.id === activeId;

  return (
    <li>
      <div
        className={cn(
          'flex min-w-0 items-center gap-0.5 rounded-md py-[2px] pr-1',
          OUTLINE_INDENT[Math.min(depth, OUTLINE_INDENT.length - 1)]
        )}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(node.id)}
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-sm text-[rgba(55,53,47,0.58)] transition hover:bg-[rgba(55,53,47,0.06)]',
            !hasChildren && 'invisible'
          )}
          aria-label={isCollapsed ? '展开子目录' : '收起子目录'}
          tabIndex={hasChildren ? 0 : -1}
        >
          {isCollapsed ? (
            <ChevronRight className="size-3" strokeWidth={2} />
          ) : (
            <ChevronDown className="size-3" strokeWidth={2} />
          )}
        </button>

        <button
          type="button"
          className={cn(
            'min-w-0 flex-1 truncate rounded-sm py-[2px] text-left text-[14px] leading-[1.5] transition-colors',
            isActive
              ? 'font-semibold text-black'
              : 'font-normal text-[rgba(55,53,47,0.88)] hover:text-[rgba(55,53,47,1)]'
          )}
          aria-current={isActive ? 'location' : undefined}
          title={node.title}
          onClick={() => onScrollTo(node.id)}
        >
          {node.title}
        </button>
      </div>

      {hasChildren && !isCollapsed ? (
        <ul className="space-y-0.5">
          {node.children.map((child) => (
            <OutlineTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsedIds={collapsedIds}
              activeId={activeId}
              onToggle={onToggle}
              onScrollTo={onScrollTo}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

type PageOutlineNavProps = {
  className?: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
};

export function PageOutlineNav({
  className,
  scrollContainerRef,
}: PageOutlineNavProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const headingList = useEditorSelector(getOutlineHeadings, []);
  const headingTree = React.useMemo(
    () => buildHeadingTree(headingList),
    [headingList]
  );
  const defaultCollapsedIds = React.useMemo(
    () => collectExpandableIds(headingTree),
    [headingTree]
  );
  const treeStructureKey = React.useMemo(
    () => buildTreeStructureKey(headingTree),
    [headingTree]
  );
  const [collapseOverrides, setCollapseOverrides] = React.useState<
    Record<string, boolean>
  >({});
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const clickingRef = React.useRef(false);

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
  }, [collapseOverrides, defaultCollapsedIds]);

  const toggleCollapsed = React.useCallback(
    (id: string) => {
      setCollapseOverrides((current) => {
        const baseCollapsed = defaultCollapsedIds.has(id);
        const wasCollapsed =
          id in current ? Boolean(current[id]) : baseCollapsed;

        return {
          ...current,
          [id]: !wasCollapsed,
        };
      });
    },
    [defaultCollapsedIds]
  );

  React.useEffect(() => {
    const root = scrollContainerRef?.current ?? null;
    if (!root || headingList.length === 0) {
      setActiveId(null);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (clickingRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
        const id = visible[0]?.target.getAttribute('data-block-id');
        if (id) {
          setActiveId(id);
        }
      },
      {
        root,
        rootMargin: '0px 0px -70% 0px',
        threshold: [0, 1],
      }
    );

    for (const item of headingList) {
      const el = root.querySelector(`[data-block-id="${CSS.escape(item.id)}"]`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headingList, scrollContainerRef]);

  React.useEffect(() => {
    if (!activeId) {
      return;
    }

    const ancestors = findAncestorIds(headingTree, activeId);
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
  }, [activeId, treeStructureKey]);

  const scrollToHeading = React.useCallback(
    (id: string) => {
      const root = scrollContainerRef?.current;
      if (!root) return;
      const el = root.querySelector(
        `[data-block-id="${CSS.escape(id)}"]`
      ) as HTMLElement | null;
      if (!el) return;

      clickingRef.current = true;
      setActiveId(id);
      const top =
        el.getBoundingClientRect().top -
        root.getBoundingClientRect().top +
        root.scrollTop -
        72;
      root.scrollTo({ top, behavior: 'smooth' });
      window.setTimeout(() => {
        clickingRef.current = false;
      }, 600);
    },
    [scrollContainerRef]
  );

  if (isMobile || headingList.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'pointer-events-none absolute top-0 left-3 z-20 flex w-[260px] flex-col items-stretch md:left-4',
        className
      )}
    >
      <button
        type="button"
        className={cn(
          'pointer-events-auto mb-1 flex size-7 items-center justify-center self-start rounded text-[rgba(55,53,47,0.55)] transition-colors hover:bg-[rgba(55,53,47,0.06)] hover:text-[rgba(55,53,47,0.9)]',
          open && 'text-[rgba(55,53,47,0.9)]'
        )}
        aria-label={open ? '收起目录' : '展开目录'}
        aria-expanded={open}
        title={open ? '收起目录' : '页面目录'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <PanelLeftClose className="size-[15px]" strokeWidth={1.75} />
        ) : (
          <TableOfContents className="size-[15px]" strokeWidth={1.75} />
        )}
      </button>

      {open ? (
        <nav className="pointer-events-auto" aria-label="知识目录">
          <ul className="space-y-0.5">
            {headingTree.map((node) => (
              <OutlineTreeItem
                key={node.id}
                node={node}
                depth={0}
                collapsedIds={collapsedIds}
                activeId={activeId}
                onToggle={toggleCollapsed}
                onScrollTo={scrollToHeading}
              />
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
};
