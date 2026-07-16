import * as React from 'react';
import { LogIn, Menu, SquarePen } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { WikiEditor } from '@/components/editor/WikiEditor';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLayout } from '@/components/layout/layout-context';
import { ColorEmoji } from '@/components/ui/color-emoji';
import { useAuth } from '@/features/auth/auth-context';
import { createEmptyContent } from '@/features/pages/store';
import { loadPublicPageContent } from '@/lib/api/pages';
import type { PublicPageDto } from '@/lib/api/pages';
import { ApiError } from '@/lib/api/types';
import { rewritePublicAssetUrlsInContent } from '@/lib/asset-urls';
import { pagePath } from '@/lib/page-paths';
import type { Value } from 'platejs';

function mapPublicPage(dto: PublicPageDto) {
  return {
    id: dto.code,
    title: dto.title,
    icon: dto.icon ?? undefined,
    coverColor: dto.cover_color ?? undefined,
    ownerName: dto.owner_name ?? undefined,
    updatedAt: dto.updated_at ? new Date(dto.updated_at).getTime() : undefined,
    content:
      Array.isArray(dto.content) && dto.content.length > 0
        ? rewritePublicAssetUrlsInContent(dto.content as Value)
        : createEmptyContent(),
  };
}

export function PublicPageView() {
  const { pageId = '' } = useParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toggleSidebar } = useLayout();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [page, setPage] = React.useState<ReturnType<typeof mapPublicPage> | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!pageId) {
      setError('知识不存在');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void loadPublicPageContent(pageId, { signal: controller.signal })
      .then((dto) => {
        if (controller.signal.aborted) {
          return;
        }
        setPage(mapPublicPage(dto));
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        if (controller.signal.aborted) {
          return;
        }
        setError(
          err instanceof ApiError ? err.message : '知识不存在或未公开'
        );
        setPage(null);
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

  if (loading || authLoading) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-[rgba(55,53,47,0.4)]">
        加载知识…
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-muted-foreground">{error ?? '知识不存在'}</p>
        <Link
          to="/login"
          className="text-sm text-primary transition-colors hover:underline"
        >
          登录 Knowledge
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="sticky top-0 z-30 flex h-11 shrink-0 items-center gap-2 border-b border-border/60 bg-white px-3 pt-[env(safe-area-inset-top)] md:hidden">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/4"
          aria-label="打开菜单"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
          {page.icon ? (
            <ColorEmoji size={16}>{page.icon}</ColorEmoji>
          ) : (
            <span className="text-base leading-none">📄</span>
          )}
          <span className="truncate font-medium text-foreground">
            {page.title}
          </span>
        </div>
        {isAuthenticated ? (
          <Link
            to={pagePath(page.id)}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground"
            title="在 Knowledge 中打开"
            aria-label="在 Knowledge 中打开"
          >
            <SquarePen className="size-4" />
          </Link>
        ) : (
          <Link
            to="/login"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground"
            title="登录"
            aria-label="登录"
          >
            <LogIn className="size-4" />
          </Link>
        )}
      </header>

      <div
        ref={scrollContainerRef}
        className="min-w-0 flex-1 overflow-x-clip overflow-y-auto"
      >
        <PageHeader
          icon={page.icon}
          coverColor={page.coverColor}
          coverMode="public"
          readOnly
          updatedAt={page.updatedAt}
          onIconChange={() => {}}
          onCoverChange={() => {}}
        />
        <WikiEditor
          pageId={page.id}
          value={page.content}
          readOnly
          scrollContainerRef={scrollContainerRef}
          onChange={() => {}}
        />
      </div>
    </div>
  );
}
