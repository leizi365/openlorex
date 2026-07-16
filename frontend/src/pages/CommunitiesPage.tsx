import * as React from 'react';
import { ChevronRight, Plus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import {
  acceptInvitation,
  createCommunity,
  fetchCommunities,
  fetchMyInvitations,
} from '@/lib/api/communities';
import type { CommunitySummaryDto, InvitationDto } from '@/lib/api/communities';
import { CommunityAvatar } from '@/features/communities/CommunityAvatar';
import { CommunityListItem } from '@/features/communities/CommunityListItem';
import { formatCommunityRole } from '@/features/communities/presentation';
import { getNavLabelFontClass } from '@/lib/nav-font';
import { cn } from '@/lib/utils';

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {formatCommunityRole(role)}
    </span>
  );
}

function CommunityRow({
  community,
}: {
  community: CommunitySummaryDto;
}) {
  return (
    <CommunityListItem>
      <Link
        to={`/communities/${community.code}`}
        className="group flex items-center gap-4 px-2 py-2.5"
      >
        <CommunityAvatar name={community.name} seed={community.code} />

        <div className="min-w-0 flex-1">
          <p className={cn('truncate', getNavLabelFontClass(community.name))}>
            {community.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-nav-cjk text-xs text-subtle-foreground">
              {community.member_count} 位成员
            </span>
            <RoleBadge role={community.my_role} />
          </div>
        </div>

        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </Link>
    </CommunityListItem>
  );
}

function PendingInvitationRow({
  invitation,
  onAccepted,
}: {
  invitation: InvitationDto;
  onAccepted: () => void;
}) {
  const [accepting, setAccepting] = React.useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await acceptInvitation(invitation.code);
      toast.success(`已加入社区「${invitation.community_name}」`);
      onAccepted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '接受邀请失败');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <CommunityListItem className="flex items-center gap-4 px-2 py-2.5">
      <CommunityAvatar
        name={invitation.community_name ?? '社区'}
        seed={invitation.community_code ?? invitation.code}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate', getNavLabelFontClass(invitation.community_name ?? ''))}>
          {invitation.community_name}
        </p>
        <p className="font-nav-cjk mt-0.5 text-xs text-subtle-foreground">
          {invitation.inviter_name ? `${invitation.inviter_name} 邀请你加入` : '待接受的邀请'}
        </p>
      </div>
      <button
        type="button"
        disabled={accepting}
        className="inline-flex h-8 shrink-0 items-center rounded-md bg-sidebar-primary/14 px-2.5 font-nav-cjk text-[13px] font-medium text-sidebar-primary transition-colors hover:bg-sidebar-primary/22 disabled:opacity-50"
        onClick={() => void handleAccept()}
      >
        {accepting ? '加入中…' : '加入'}
      </button>
    </CommunityListItem>
  );
}

export function CommunitiesPage() {
  const [communities, setCommunities] = React.useState<CommunitySummaryDto[]>([]);
  const [invitations, setInvitations] = React.useState<InvitationDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [communityItems, invitationItems] = await Promise.all([
        fetchCommunities(),
        fetchMyInvitations(),
      ]);
      setCommunities(communityItems);
      setInvitations(invitationItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载社区失败');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('请输入社区名称');
      return;
    }

    setCreating(true);
    try {
      await createCommunity({ name: name.trim() });
      setName('');
      toast.success('社区已创建');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建社区失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6 md:px-12 md:py-12">
        <header className="mb-8">
          <h1 className="font-nav-cjk text-2xl font-semibold tracking-tight text-foreground">
            社区
          </h1>
          <p className="font-nav-cjk mt-1 text-sm text-subtle-foreground">
            创建或加入社区，并通过授权共享知识
          </p>
        </header>

        <section className="mb-8">
          <div className="flex items-center gap-2">
            <input
              className="h-8 flex-1 rounded-md border-0 bg-muted/50 px-3 text-[13px] outline-none transition placeholder:text-muted-foreground focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/20"
              placeholder="创建新社区"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleCreate();
                }
              }}
            />
            <button
              type="button"
              disabled={creating}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-sidebar-primary/14 px-2.5 font-nav-cjk text-[13px] font-medium text-sidebar-primary transition-colors hover:bg-sidebar-primary/22 disabled:opacity-50"
              onClick={() => void handleCreate()}
            >
              <Plus className="size-3.5" strokeWidth={2.25} />
              创建
            </button>
          </div>
        </section>

        {loading ? (
          <p className="text-sm text-muted-foreground">加载中…</p>
        ) : (
          <>
            {invitations.length > 0 ? (
              <section className="mb-8">
                <h2 className="font-nav-cjk mb-3 text-sm font-medium text-foreground">
                  待接受的邀请
                </h2>
                <ul className="space-y-1">
                  {invitations.map((invitation) => (
                    <PendingInvitationRow
                      key={invitation.code}
                      invitation={invitation}
                      onAccepted={() => void load()}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {communities.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/60">
                  <Users className="size-7 text-muted-foreground/70" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-foreground/80">还没有加入任何社区</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  创建社区并邀请成员，一起协作共享知识
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {communities.map((community) => (
                  <CommunityRow key={community.code} community={community} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
