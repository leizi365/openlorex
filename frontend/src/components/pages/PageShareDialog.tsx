import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Copy, Globe, Users } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ApiError } from '@/lib/api/types';
import {
  fetchPagePermissions,
  fetchPagePublicSettings,
  updatePagePublicSettings,
} from '@/lib/api/pages';
import { copyTextToClipboard } from '@/lib/clipboard';
import { pageAccessPath, publicPageUrl } from '@/lib/page-paths';
import { cn } from '@/lib/utils';

type PageShareDialogProps = {
  pageCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const fieldClass =
  'h-9 rounded-lg border-0 bg-muted/50 px-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/20';

export function PageShareDialog({
  pageCode,
  open,
  onOpenChange,
}: PageShareDialogProps) {
  const navigate = useNavigate();
  const [grantCount, setGrantCount] = React.useState(0);
  const [loadingPermissions, setLoadingPermissions] = React.useState(false);
  const [loadingPublic, setLoadingPublic] = React.useState(false);
  const [isPublic, setIsPublic] = React.useState(false);
  const [inheritedPublic, setInheritedPublic] = React.useState(false);
  const [updatingPublic, setUpdatingPublic] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const loadPermissions = React.useCallback(
    async (signal: AbortSignal) => {
      if (!pageCode) {
        return;
      }
      setLoadingPermissions(true);
      try {
        const permissions = await fetchPagePermissions(pageCode, { signal });
        setGrantCount(permissions.length);
      } finally {
        setLoadingPermissions(false);
      }
    },
    [pageCode]
  );

  const loadPublic = React.useCallback(
    async (signal: AbortSignal) => {
      if (!pageCode) {
        return;
      }
      setLoadingPublic(true);
      try {
        const settings = await fetchPagePublicSettings(pageCode, { signal });
        setIsPublic(settings.is_public);
        setInheritedPublic(Boolean(settings.inherited_public));
      } finally {
        setLoadingPublic(false);
      }
    },
    [pageCode]
  );

  const loadData = React.useCallback(
    async (signal: AbortSignal) => {
      setLoadError(null);
      const results = await Promise.allSettled([
        loadPermissions(signal),
        loadPublic(signal),
      ]);
      const failures = results.flatMap((result) =>
        result.status === 'rejected' &&
        !(result.reason instanceof DOMException && result.reason.name === 'AbortError')
          ? [result.reason]
          : []
      );
      if (failures.length === 0) {
        return;
      }
      const message =
        failures[0] instanceof ApiError
          ? failures[0].message
          : failures[0] instanceof Error
            ? failures[0].message
            : '加载失败';
      toast.error(message);
      if (failures.length === 2) {
        setLoadError(message);
      }
    },
    [loadPermissions, loadPublic]
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData, open]);

  const publicLink = publicPageUrl(pageCode);
  const canSharePublicLink = isPublic || inheritedPublic;

  const handleTogglePublic = async (checked: boolean) => {
    setUpdatingPublic(true);
    try {
      const settings = await updatePagePublicSettings(pageCode, {
        is_public: checked,
      });
      setIsPublic(settings.is_public);
      setInheritedPublic(Boolean(settings.inherited_public));
      toast.success(checked ? '已开启公开访问' : '已关闭公开访问');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败');
    } finally {
      setUpdatingPublic(false);
    }
  };

  const handleCopyPublicLink = async () => {
    try {
      await copyTextToClipboard(publicLink);
      toast.message('公开链接已复制');
    } catch {
      toast.error('复制失败，请手动选中链接复制');
    }
  };

  const goAccess = () => {
    onOpenChange(false);
    navigate(pageAccessPath(pageCode));
  };

  const initialLoading =
    (loadingPermissions || loadingPublic) && grantCount === 0 && !isPublic;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>分享知识</DialogTitle>
          <p className="font-nav-cjk text-xs text-subtle-foreground">
            授权对该知识及其目录子知识、内页生效
          </p>
        </DialogHeader>

        <DialogBody className="space-y-4 pt-4">
          {initialLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              加载中…
            </p>
          ) : loadError ? (
            <div className="space-y-2 py-6 text-center">
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => void loadData(new AbortController().signal)}
              >
                重试
              </button>
            </div>
          ) : (
            <>
              <section className="rounded-xl bg-muted/40 px-3 py-3">
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="page-public-toggle"
                        className="text-sm font-medium text-foreground/90"
                      >
                        对外公开
                      </label>
                      <Checkbox
                        id="page-public-toggle"
                        checked={isPublic}
                        disabled={updatingPublic || loadingPublic}
                        onCheckedChange={(checked) =>
                          void handleTogglePublic(checked === true)
                        }
                      />
                    </div>
                    <p className="mt-1 text-xs text-subtle-foreground">
                      开启后，任何人无需登录即可通过链接查看
                    </p>
                    {inheritedPublic && !isPublic ? (
                      <p className="mt-1 text-xs text-primary/80">
                        当前已从父知识继承公开访问
                      </p>
                    ) : null}
                    {canSharePublicLink ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          readOnly
                          value={publicLink}
                          className={cn(fieldClass, 'min-w-0 flex-1 text-xs')}
                        />
                        <button
                          type="button"
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/15"
                          onClick={() => void handleCopyPublicLink()}
                          aria-label="复制公开链接"
                          title="复制链接"
                        >
                          <Copy className="size-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-border/60 px-3 py-3 text-left transition-colors hover:bg-muted/40"
                onClick={goAccess}
              >
                <Users className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-foreground/90">
                    社区用户授权
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {grantCount > 0
                      ? `已授权 ${grantCount} 项 · 添加、修改或撤销`
                      : '添加社区或用户，并管理已有授权'}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
