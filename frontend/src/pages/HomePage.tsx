import * as React from 'react';
import { ChevronRight, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { ColorEmoji } from '@/components/ui/color-emoji';
import { CommunityAvatar } from '@/features/communities/CommunityAvatar';
import { CommunityListItem } from '@/features/communities/CommunityListItem';
import { formatCommunityVisibility } from '@/features/communities/presentation';
import { useAuth } from '@/features/auth/auth-context';
import { usePages } from '@/features/pages/page-context';
import { getHomeCardColor } from '@/features/pages/cover-colors';
import type { PageTreeNode } from '@/features/pages/types';
import { useRecentPageVisits } from '@/hooks/use-recent-page-visits';
import {
  fetchCommunities,
  fetchPublicCommunities,
} from '@/lib/api/communities';
import type { CommunitySummaryDto } from '@/lib/api/communities';
import { publicPagePath } from '@/lib/page-paths';
import { getNavLabelFontClass } from '@/lib/nav-font';
import { cn } from '@/lib/utils';

const HOME_PUBLIC_PAGE_LIMIT = 8;
const HOME_OPEN_COMMUNITY_LIMIT = 6;

function flattenPageTree(nodes: PageTreeNode[]): PageTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenPageTree(node.children)]);
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="font-nav-cjk text-sm font-medium text-foreground">{title}</h2>
  );
}

function HomeSummary({
  ownedPageCount,
  publicPageCount,
  communityCount,
  loadingCommunities,
}: {
  ownedPageCount: number;
  publicPageCount: number;
  communityCount: number;
  loadingCommunities: boolean;
}) {
  if (loadingCommunities) {
    return null;
  }

  if (ownedPageCount === 0 && publicPageCount === 0 && communityCount === 0) {
    return null;
  }

  const items: React.ReactNode[] = [];

  if (ownedPageCount > 0) {
    items.push(
      <span key="owned">{ownedPageCount} 篇知识</span>
    );
  }

  if (publicPageCount > 0) {
    items.push(
      <button
        key="public"
        type="button"
        onClick={() => {
          document
            .getElementById('public-knowledge')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        className="transition-colors hover:text-foreground"
      >
        {publicPageCount} 篇公开
      </button>
    );
  }

  if (communityCount > 0) {
    items.push(
      <Link
        key="community"
        to="/communities"
        className="transition-colors hover:text-foreground"
      >
        {communityCount} 个社区
      </Link>
    );
  }

  return (
    <p className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 font-nav-cjk text-sm text-subtle-foreground">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 ? <span aria-hidden className="text-subtle-foreground/40">·</span> : null}
          {item}
        </React.Fragment>
      ))}
    </p>
  );
}

function PublicPageRow({ page }: { page: PageTreeNode }) {
  return (
    <CommunityListItem>
      <div className="flex items-center gap-3 px-3 py-2.5">
      <Link
        to={`/page/${page.id}`}
        className="group flex min-w-0 flex-1 touch-manipulation items-center gap-3"
      >
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: page.coverColor ?? '#EBECED',
            }}
          >
            {page.icon ? (
              <ColorEmoji size={20}>{page.icon}</ColorEmoji>
            ) : (
              <span className="text-lg leading-none">📄</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className={cn('truncate text-sm', getNavLabelFontClass(page.title))}>
              {page.title}
            </p>
            <p className="mt-0.5 font-nav-cjk text-xs text-subtle-foreground">
              对外公开
            </p>
          </div>
        </Link>

        <Link
          to={publicPagePath(page.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/4 hover:text-foreground"
          aria-label="打开公开链接"
          title="打开公开链接"
        >
          <Globe className="size-4" />
        </Link>
      </div>
    </CommunityListItem>
  );
}

function OpenCommunityRow({ community }: { community: CommunitySummaryDto }) {
  return (
    <CommunityListItem>
      <Link
        to={`/communities/${community.code}`}
        className="group flex touch-manipulation items-center gap-3 px-3 py-2.5"
      >
        <CommunityAvatar
          name={community.name}
          seed={community.code}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-sm', getNavLabelFontClass(community.name))}>
            {community.name}
          </p>
          <p className="mt-0.5 font-nav-cjk text-xs text-subtle-foreground">
            {formatCommunityVisibility(true)} · {community.member_count} 位成员 ·{' '}
            {community.owner_name}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </Link>
    </CommunityListItem>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const recentVisits = useRecentPageVisits(user?.id);
  const { workspace, pageTree } = usePages();
  const [communityCount, setCommunityCount] = React.useState(0);
  const [openCommunities, setOpenCommunities] = React.useState<CommunitySummaryDto[]>(
    []
  );
  const [loadingCommunities, setLoadingCommunities] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoadingCommunities(true);
      try {
        const [communityItems, publicItems] = await Promise.all([
          fetchCommunities(),
          fetchPublicCommunities(),
        ]);
        if (!cancelled) {
          setCommunityCount(communityItems.length);
          setOpenCommunities(publicItems.slice(0, HOME_OPEN_COMMUNITY_LIMIT));
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : '加载社区失败');
        }
      } finally {
        if (!cancelled) {
          setLoadingCommunities(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const publicPages = React.useMemo(
    () =>
      flattenPageTree(pageTree)
        .filter((page) => page.isPublic && !page.containerId)
        .slice(0, HOME_PUBLIC_PAGE_LIMIT),
    [pageTree]
  );
  const ownedPageCount = React.useMemo(
    () =>
      Object.values(workspace.pages).filter((page) => !page.containerId).length,
    [workspace.pages]
  );
  const publicPageCount = React.useMemo(
    () =>
      flattenPageTree(pageTree).filter(
        (page) => page.isPublic && !page.containerId
      ).length,
    [pageTree]
  );
  const hasRecentVisits = recentVisits.length > 0;
  const hasPublicPages = publicPages.length > 0;
  const hasOpenCommunities = openCommunities.length > 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6 md:px-12 md:py-12">
        <header className="mb-6">
          <h1 className={cn('text-2xl font-semibold tracking-tight text-foreground', getNavLabelFontClass('Home'))}>
            Home
          </h1>
          <p className="font-nav-cjk mt-1 text-sm text-subtle-foreground">
            所思所录，皆成己知
          </p>
        </header>

        <HomeSummary
          ownedPageCount={ownedPageCount}
          publicPageCount={publicPageCount}
          communityCount={communityCount}
          loadingCommunities={loadingCommunities}
        />

        <div className="space-y-8">
          <section className="space-y-3">
            <SectionHeader title="最近访问的知识" />
            {hasRecentVisits ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {recentVisits.map((visit, index) => (
                  <Link
                    key={visit.pageId}
                    to={`/page/${visit.pageId}`}
                    className="group flex min-h-[108px] touch-manipulation flex-col rounded-xl p-4 md:transition-transform md:hover:scale-[1.02] md:hover:shadow-sm"
                    style={{
                      backgroundColor:
                        visit.coverColor ?? getHomeCardColor(index),
                    }}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      {visit.icon ? (
                        <ColorEmoji size={28}>{visit.icon}</ColorEmoji>
                      ) : (
                        <span className="text-[28px] leading-none">📄</span>
                      )}
                    </div>

                    <h3 className="mt-auto line-clamp-2 text-sm font-medium text-foreground/90">
                      {visit.title}
                    </h3>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="font-nav-cjk rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                打开知识后会出现在这里
              </p>
            )}
          </section>

          <section id="open-communities" className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <SectionHeader title="开放的社区" />
              <Link
                to="/communities"
                className="font-nav-cjk text-xs text-subtle-foreground transition-colors hover:text-foreground"
              >
                查看全部
              </Link>
            </div>
            {loadingCommunities ? (
              <p className="font-nav-cjk text-sm text-muted-foreground">加载中…</p>
            ) : hasOpenCommunities ? (
              <ul className="space-y-1">
                {openCommunities.map((community) => (
                  <OpenCommunityRow key={community.code} community={community} />
                ))}
              </ul>
            ) : (
              <p className="font-nav-cjk rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                暂无开放社区，创建开放社区后会出现在这里
              </p>
            )}
          </section>

          <section id="public-knowledge" className="space-y-3">
            <SectionHeader title="公开的知识" />
            {hasPublicPages ? (
              <ul className="space-y-1">
                {publicPages.map((page) => (
                  <PublicPageRow key={page.id} page={page} />
                ))}
              </ul>
            ) : (
              <p className="font-nav-cjk rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                在知识分享设置中开启「对外公开」后会显示在这里
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
