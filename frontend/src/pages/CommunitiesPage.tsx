import * as React from 'react';
import { ChevronRight, Plus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import {
  acceptInvitation,
  applyToJoinCommunity,
  createCommunity,
  fetchCommunities,
  fetchMyInvitations,
  fetchPublicCommunities,
} from '@/lib/api/communities';
import type { CommunitySummaryDto, InvitationDto } from '@/lib/api/communities';
import { CommunityAvatar } from '@/features/communities/CommunityAvatar';
import { CommunityListItem } from '@/features/communities/CommunityListItem';
import {
  formatCommunityRole,
  formatCommunityVisibility,
} from '@/features/communities/presentation';
import { getNavLabelFontClass } from '@/lib/nav-font';
import { cn } from '@/lib/utils';

type ListTab = 'mine' | 'public';

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {formatCommunityRole(role)}
    </span>
  );
}

function VisibilityBadge({ isPublic }: { isPublic: boolean }) {
  return (
    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {formatCommunityVisibility(isPublic)}
    </span>
  );
}

function CommunityRow({
  community,
  showRole = true,
}: {
  community: CommunitySummaryDto;
  showRole?: boolean;
}) {
  return (
    <CommunityListItem>
      <Link
        to={`/communities/${community.code}`}
        className="group flex items-center gap-3 px-2 py-2"
      >
        <CommunityAvatar name={community.name} seed={community.code} size="sm" />

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-sm leading-5',
              getNavLabelFontClass(community.name)
            )}
          >
            {community.name}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="font-nav-cjk text-xs text-subtle-foreground">
              {community.member_count} 位成员
            </span>
            <VisibilityBadge isPublic={community.is_public} />
            {showRole && community.my_role ? (
              <RoleBadge role={community.my_role} />
            ) : null}
          </div>
        </div>

        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </Link>
    </CommunityListItem>
  );
}

function PublicCommunityRow({
  community,
  onApplied,
}: {
  community: CommunitySummaryDto;
  onApplied: () => void;
}) {
  const [applying, setApplying] = React.useState(false);
  const isMember = Boolean(community.my_role);
  const isPending = community.my_application_status === 'pending';

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyToJoinCommunity(community.code);
      toast.success(`已申请加入「${community.name}」`);
      onApplied();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '申请失败');
    } finally {
      setApplying(false);
    }
  };

  return (
    <CommunityListItem className="flex items-center gap-3 px-2 py-2">
      <Link
        to={`/communities/${community.code}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <CommunityAvatar name={community.name} seed={community.code} size="sm" />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-sm leading-5',
              getNavLabelFontClass(community.name)
            )}
          >
            {community.name}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="font-nav-cjk text-xs text-subtle-foreground">
              {community.member_count} 位成员 · 创建者 {community.owner_name}
            </span>
            <VisibilityBadge isPublic />
            {isMember && community.my_role ? (
              <RoleBadge role={community.my_role} />
            ) : null}
          </div>
        </div>
      </Link>

      {isMember ? (
        <Link
          to={`/communities/${community.code}`}
          className="inline-flex h-8 shrink-0 items-center rounded-md bg-muted/70 px-2.5 font-nav-cjk text-[13px] font-medium text-foreground/80 transition-colors hover:bg-muted"
        >
          查看
        </Link>
      ) : isPending ? (
        <span className="inline-flex h-8 shrink-0 items-center rounded-md bg-muted/60 px-2.5 font-nav-cjk text-[13px] text-muted-foreground">
          审核中
        </span>
      ) : (
        <button
          type="button"
          disabled={applying}
          className="inline-flex h-8 shrink-0 items-center rounded-md bg-sidebar-primary/14 px-2.5 font-nav-cjk text-[13px] font-medium text-sidebar-primary transition-colors hover:bg-sidebar-primary/22 disabled:opacity-50"
          onClick={() => void handleApply()}
        >
          {applying ? '申请中…' : '申请加入'}
        </button>
      )}
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
    <CommunityListItem className="flex items-center gap-3 px-2 py-2">
      <CommunityAvatar
        name={invitation.community_name ?? '社区'}
        seed={invitation.community_code ?? invitation.code}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm leading-5',
            getNavLabelFontClass(invitation.community_name ?? '')
          )}
        >
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
  const [publicCommunities, setPublicCommunities] = React.useState<CommunitySummaryDto[]>(
    []
  );
  const [invitations, setInvitations] = React.useState<InvitationDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [listTab, setListTab] = React.useState<ListTab>('mine');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [communityItems, publicItems, invitationItems] = await Promise.all([
        fetchCommunities(),
        fetchPublicCommunities(),
        fetchMyInvitations(),
      ]);
      setCommunities(communityItems);
      setPublicCommunities(publicItems);
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
      await createCommunity({ name: name.trim(), is_public: isPublic });
      setName('');
      toast.success(isPublic ? '开放社区已创建' : '私密社区已创建');
      setListTab('mine');
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
            <select
              aria-label="社区可见性"
              className="h-8 shrink-0 rounded-md border-0 bg-muted/50 px-2 font-nav-cjk text-[13px] text-foreground outline-none transition focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/20"
              value={isPublic ? 'public' : 'private'}
              onChange={(event) => setIsPublic(event.target.value === 'public')}
            >
              <option value="private">私密</option>
              <option value="public">开放</option>
            </select>
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

            <nav
              className="mb-4 flex items-baseline gap-3 text-sm"
              role="tablist"
              aria-label="社区列表"
            >
              {(
                [
                  { id: 'mine' as const, label: '我的社区', count: communities.length },
                  {
                    id: 'public' as const,
                    label: '开放社区',
                    count: publicCommunities.length,
                  },
                ] as const
              ).map(({ id, label, count }, index) => {
                const isActive = listTab === id;
                return (
                  <React.Fragment key={id}>
                    {index > 0 ? (
                      <span aria-hidden className="font-nav-cjk text-subtle-foreground/40">
                        /
                      </span>
                    ) : null}
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setListTab(id)}
                      className={cn(
                        'inline-flex items-baseline gap-1.5 select-none font-nav-cjk',
                        isActive ? 'text-foreground' : 'text-subtle-foreground'
                      )}
                    >
                      <span>{label}</span>
                      <span className="font-nav text-xs text-muted-foreground tabular-nums">
                        {count}
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>

            {listTab === 'mine' ? (
              communities.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/60">
                    <Users className="size-7 text-muted-foreground/70" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-medium text-foreground/80">还没有加入任何社区</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    创建社区并邀请成员，或浏览开放社区申请加入
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {communities.map((community) => (
                    <CommunityRow key={community.code} community={community} />
                  ))}
                </ul>
              )
            ) : publicCommunities.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/60">
                  <Users className="size-7 text-muted-foreground/70" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-foreground/80">暂无开放社区</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  创建开放社区后，其他人即可浏览并申请加入
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {publicCommunities.map((community) => (
                  <PublicCommunityRow
                    key={community.code}
                    community={community}
                    onApplied={() => void load()}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
