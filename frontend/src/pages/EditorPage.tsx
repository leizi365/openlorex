import * as React from 'react';
import { FileDown, Menu, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { WikiEditor } from '@/components/editor/WikiEditor';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLayout } from '@/components/layout/layout-context';
import { PageShareDialog } from '@/components/pages/PageShareDialog';
import { SharedPageAccessLabel } from '@/components/pages/SharedPageContextBar';
import { ColorEmoji } from '@/components/ui/color-emoji';
import { useAuth } from '@/features/auth/auth-context';
import { usePages } from '@/features/pages/page-context';
import { recordPageVisit } from '@/features/pages/recent-visits';
import { exportContentToDocx } from '@/lib/export-docx';

export function EditorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    activePage,
    activePageId,
    activePageAccess,
    canEditActivePage,
    isLoading,
    updatePage,
  } = usePages();
  const { toggleSidebar } = useLayout();
  const [shareOpen, setShareOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!activePage) {
      return;
    }

    recordPageVisit(user?.id, {
      pageId: activePage.id,
      title: activePage.title,
      icon: activePage.icon,
      coverColor: activePage.coverColor,
    });
  }, [activePage?.id, user?.id]);

  const handleExportWord = React.useCallback(async () => {
    if (!activePage) return;

    if (activePage.contentLoaded === false) {
      toast.error('内容仍在加载，请稍后再导出');
      return;
    }

    setExporting(true);
    try {
      await exportContentToDocx(activePage.content, activePage.title);
      toast.success('已导出 Word');
    } catch (error) {
      console.error(error);
      toast.error('导出 Word 失败');
    } finally {
      setExporting(false);
    }
  }, [activePage]);

  if (authLoading || isLoading || (activePageId && !activePage)) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-[rgba(55,53,47,0.4)]">
        加载知识…
      </div>
    );
  }

  if (!activePage) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-[rgba(55,53,47,0.4)]">
        知识不存在
      </div>
    );
  }

  const editorKey =
    activePage.contentLoaded === false
      ? `${activePage.id}-loading`
      : `${activePage.id}-${activePage.editorEpoch ?? 0}`;

  const syncLabel =
    activePage.syncStatus === 'loading'
      ? '加载中…'
      : activePage.syncStatus === 'saving'
        ? '保存中…'
        : activePage.syncStatus === 'dirty'
          ? '未保存'
          : activePage.syncStatus === 'conflict'
            ? '版本冲突'
            : null;

  const isOwner = activePageAccess?.level === 'owner';

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
          {activePage.icon ? (
            <ColorEmoji size={16}>{activePage.icon}</ColorEmoji>
          ) : (
            <span className="text-base leading-none">📄</span>
          )}
          <span className="truncate font-medium text-foreground">
            {activePage.title}
          </span>
          {syncLabel ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              {syncLabel}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground disabled:opacity-50"
          onClick={() => void handleExportWord()}
          disabled={exporting || activePage.contentLoaded === false}
          aria-label="导出 Word"
        >
          <FileDown className="size-4" />
        </button>
        {isOwner ? (
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground"
            onClick={() => setShareOpen(true)}
            aria-label="分享"
          >
            <Share2 className="size-4" />
          </button>
        ) : activePageAccess && activePageAccess.level !== 'owner' ? (
          <SharedPageAccessLabel access={activePageAccess} compact className="max-w-[45vw] justify-end" />
        ) : null}
      </header>

      <div
        ref={scrollContainerRef}
        className="min-w-0 flex-1 overflow-x-clip overflow-y-auto"
      >
        <PageHeader
          icon={activePage.icon}
          coverColor={activePage.coverColor}
          pageId={activePage.id}
          readOnly={!canEditActivePage}
          updatedAt={activePage.updatedAt}
          onIconChange={(icon) => updatePage(activePage.id, { icon })}
          onCoverChange={(coverColor) =>
            updatePage(activePage.id, { coverColor })
          }
          onExportWordClick={handleExportWord}
          onShareClick={isOwner ? () => setShareOpen(true) : undefined}
          pageAccess={activePageAccess}
        />
        {activePage.contentLoaded === false ? (
          <div className="mx-auto w-full max-w-[900px] px-4 py-12 text-center text-sm text-muted-foreground sm:px-6 md:px-12 lg:px-16">
            加载知识内容…
          </div>
        ) : (
          <WikiEditor
            key={editorKey}
            pageId={activePage.id}
            value={activePage.content}
            readOnly={!canEditActivePage}
            scrollContainerRef={scrollContainerRef}
            onChange={(content) => updatePage(activePage.id, { content })}
          />
        )}
      </div>

      {isOwner ? (
        <PageShareDialog
          pageCode={activePage.id}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      ) : null}
    </div>
  );
}
