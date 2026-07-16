'use client';

import * as React from 'react';
import { ChevronsLeft, ListTree } from 'lucide-react';
import { ElementApi, KEYS, NodeApi } from 'platejs';
import { useEditorSelector, type PlateEditor } from 'platejs/react';

import { cn } from '@/lib/utils';

type OutlineHeading = {
  id: string;
  depth: number;
  title: string;
};

const HEADING_DEPTH: Record<string, number> = {
  [KEYS.h1]: 1,
  [KEYS.h2]: 2,
  [KEYS.h3]: 3,
  [KEYS.h4]: 4,
  [KEYS.h5]: 5,
  [KEYS.h6]: 6,
};

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

type PageOutlineNavProps = {
  className?: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
};

export function PageOutlineNav({
  className,
  scrollContainerRef,
}: PageOutlineNavProps) {
  const [open, setOpen] = React.useState(false);
  const headingList = useEditorSelector(getOutlineHeadings, []);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const clickingRef = React.useRef(false);

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

  if (headingList.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'pointer-events-none absolute top-0 left-3 z-20 flex w-[200px] flex-col items-stretch md:left-4',
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
        title={open ? '收起目录' : '目录'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronsLeft className="size-[15px]" strokeWidth={1.75} />
        ) : (
          <ListTree className="size-[15px]" strokeWidth={1.75} />
        )}
      </button>

      {open ? (
        <nav
          className="pointer-events-auto max-h-[min(65vh,480px)] overflow-y-auto"
          aria-label="知识目录"
        >
          <ul className="space-y-0.5">
            {headingList.map((item) => {
              const depth = Math.min(Math.max(item.depth, 1), 3);
              const isActive = item.id === activeId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      'block w-full truncate rounded-md py-[3px] pl-1.5 text-left text-[12.5px] leading-[1.45] transition-colors',
                      depth === 2 && 'pl-4',
                      depth === 3 && 'pl-7',
                      isActive
                        ? 'bg-[rgba(55,53,47,0.06)] font-medium text-[rgba(55,53,47,1)]'
                        : 'font-normal text-[rgba(55,53,47,0.75)] hover:text-[rgba(55,53,47,1)]'
                    )}
                    aria-current={isActive ? 'location' : undefined}
                    title={item.title}
                    onClick={() => scrollToHeading(item.id)}
                  >
                    {item.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
