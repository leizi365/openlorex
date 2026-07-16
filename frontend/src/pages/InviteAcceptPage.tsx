import * as React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/features/auth/auth-context';
import {
  acceptInvitation,
  fetchInvitationPreview,
} from '@/lib/api/communities';
import type { InvitationDto } from '@/lib/api/communities';
import { getNavLabelFontClass } from '@/lib/nav-font';
import { cn } from '@/lib/utils';

export function InviteAcceptPage() {
  const { inviteCode = '' } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [preview, setPreview] = React.useState<InvitationDto | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(true);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!inviteCode || !token) {
      setPreviewError('邀请链接无效');
      setLoadingPreview(false);
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);
    setPreviewError(null);

    void fetchInvitationPreview(inviteCode, token)
      .then((data) => {
        if (!cancelled) {
          setPreview(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setPreviewError(
            error instanceof Error ? error.message : '邀请无效或已过期'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPreview(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [inviteCode, token]);

  const loginRedirect = `/login?redirect=${encodeURIComponent(
    window.location.pathname + window.location.search
  )}`;

  const emailMismatch =
    isAuthenticated &&
    preview &&
    user?.email.toLowerCase() !== preview.invitee_email.toLowerCase();

  const handleAccept = async () => {
    if (!inviteCode || !token) {
      return;
    }

    setSubmitting(true);
    try {
      const community = await acceptInvitation(inviteCode, token);
      toast.success(`已加入社区「${community.name}」`);
      navigate(`/communities/${community.code}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '接受邀请失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || loadingPreview) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        加载邀请…
      </div>
    );
  }

  if (previewError || !preview) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          {previewError ?? '邀请无效或已过期'}
        </p>
        <Link to="/communities" className="text-sm text-primary hover:underline">
          返回社区
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <p className="font-nav-cjk text-sm text-subtle-foreground">社区邀请</p>
          <h1
            className={cn(
              'text-2xl font-semibold tracking-tight text-foreground',
              getNavLabelFontClass(preview.community_name ?? '')
            )}
          >
            {preview.community_name}
          </h1>
          <p className="font-nav-cjk text-sm text-subtle-foreground">
            {preview.inviter_name ? `${preview.inviter_name} 邀请你加入` : '邀请你加入此社区'}
          </p>
          <p className="text-xs text-muted-foreground">
            邀请邮箱 {preview.invitee_email}
          </p>
        </div>

        {!isAuthenticated ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              登录后即可查看并确认是否加入
            </p>
            <Link
              to={loginRedirect}
              className="flex h-10 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground"
            >
              登录并继续
            </Link>
          </div>
        ) : emailMismatch ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              当前登录邮箱与邀请邮箱不一致，请切换为 {preview.invitee_email}
            </p>
            <Link
              to={loginRedirect}
              className="inline-block text-sm text-primary hover:underline"
            >
              重新登录
            </Link>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-border/60 font-nav-cjk text-[13px] text-muted-foreground transition hover:bg-muted/40"
              onClick={() => navigate('/communities')}
            >
              稍后
            </button>
            <button
              type="button"
              disabled={submitting}
              className="inline-flex h-8 flex-1 items-center justify-center rounded-md bg-sidebar-primary/14 px-2.5 font-nav-cjk text-[13px] font-medium text-sidebar-primary transition-colors hover:bg-sidebar-primary/22 disabled:opacity-50"
              onClick={() => void handleAccept()}
            >
              {submitting ? '加入中…' : '加入社区'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
