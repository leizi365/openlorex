import * as React from 'react';
import { ArrowLeft, ChevronRight, UserMinus } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ColorEmoji } from '@/components/ui/color-emoji';
import { CommunityAvatar } from '@/features/communities/CommunityAvatar';
import { CommunityListItem } from '@/features/communities/CommunityListItem';
import { getCoverSurfaceStyle } from '@/features/pages/cover';
import {
  createInvitation,
  fetchCommunity,
  fetchCommunitySharedPages,
  fetchInvitations,
  removeMember,
} from '@/lib/api/communities';
import type {
  CommunityDetailDto,
  InvitationDto,
} from '@/lib/api/communities';
import type { SharedPageDto } from '@/lib/api/pages';
import { formatCommunityRole } from '@/features/communities/presentation';
import { getHomeCardColor } from '@/features/pages/cover-colors';
import { getNavLabelFontClass } from '@/lib/nav-font';
import { cn } from '@/lib/utils';
import { useLayout } from '@/components/layout/layout-context';

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {formatCommunityRole(role)}
    </span>
  );
}

type CommunityTab = 'members' | 'pages';

function CommunityTabs({
  activeTab,
  onChange,
  pageCount,
  memberCount,
}: {
  activeTab: CommunityTab;
  onChange: (tab: CommunityTab) => void;
  pageCount: number;
  memberCount: number;
}) {
  const tabs: { id: CommunityTab; label: string; count: number }[] = [
    { id: 'pages', label: '已共享的知识', count: pageCount },
    { id: 'members', label: '成员', count: memberCount },
  ];

  return (
    <nav
      className="flex items-baseline gap-3 text-sm"
      role="tablist"
      aria-label="社区内容"
    >
      {tabs.map(({ id, label, count }, index) => {
        const isActive = activeTab === id;

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
              onClick={() => onChange(id)}
              className={cn(
                'inline-flex items-baseline gap-1.5 select-none',
                getNavLabelFontClass(label),
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
  );
}

export function CommunityDetailPage() {
  const { communityId = '' } = useParams();
  const [community, setCommunity] = React.useState<CommunityDetailDto | null>(null);
  const [invitations, setInvitations] = React.useState<InvitationDto[]>([]);
  const [sharedPages, setSharedPages] = React.useState<SharedPageDto[]>([]);
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'members' | 'pages'>('pages');
  const { setMobileTopBarTitle } = useLayout();

  const canManage =
    community?.my_role === 'owner' || community?.my_role === 'admin';

  const load = React.useCallback(async () => {
    if (!communityId) {
      return;
    }

    setLoading(true);
    try {
      const detail = await fetchCommunity(communityId);
      setCommunity(detail);

      const [inviteItems, sharedItems] = await Promise.all([
        detail.my_role === 'owner' || detail.my_role === 'admin'
          ? fetchInvitations(communityId)
          : Promise.resolve([]),
        fetchCommunitySharedPages(communityId),
      ]);
      setInvitations(inviteItems);
      setSharedPages(sharedItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载社区失败');
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setMobileTopBarTitle(community?.name ?? null);
    return () => setMobileTopBarTitle(null);
  }, [community?.name, setMobileTopBarTitle]);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error('请输入邮箱');
      return;
    }

    try {
      const invitation = await createInvitation(communityId, email.trim());
      toast.success('邀请已创建');
      if (invitation.invite_link) {
        await navigator.clipboard.writeText(invitation.invite_link);
        toast.message('邀请链接已复制，请发送给对方');
      }
      setEmail('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建邀请失败');
    }
  };

  const handleRemoveMember = async (userCode: string) => {
    try {
      await removeMember(communityId, userCode);
      toast.success('成员已移除');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '移除成员失败');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        加载社区…
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        社区不存在
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6 md:px-12 md:py-12">
        <Link
          to="/communities"
          className="inline-flex items-center gap-1 font-nav-cjk text-sm text-subtle-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          返回社区列表
        </Link>

        <header className="mt-5 flex items-start gap-4 border-b border-border/60 pb-6">
          <CommunityAvatar name={community.name} seed={community.code} size="lg" />
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                'text-2xl font-semibold tracking-tight text-foreground',
                getNavLabelFontClass(community.name)
              )}
            >
              {community.name}
            </h1>
            {community.description ? (
              <p className="font-nav-cjk mt-1.5 text-sm text-subtle-foreground">
                {community.description}
              </p>
            ) : null}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-nav-cjk text-xs text-subtle-foreground">
              <span>{community.member_count} 位成员</span>
              <RoleBadge role={community.my_role} />
              <span>创建者 {community.owner_name}</span>
            </div>
          </div>
        </header>

        {canManage ? (
          <section className="mt-6">
            <div className="flex items-center gap-2">
              <input
                className="h-8 flex-1 rounded-md border-0 bg-muted/50 px-3 text-[13px] outline-none transition placeholder:text-muted-foreground focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/20"
                placeholder="输入已注册用户的邮箱"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleInvite();
                  }
                }}
              />
              <button
                type="button"
                className="inline-flex h-8 shrink-0 items-center rounded-md bg-sidebar-primary/14 px-2.5 font-nav-cjk text-[13px] font-medium text-sidebar-primary transition-colors hover:bg-sidebar-primary/22"
                onClick={() => void handleInvite()}
              >
                发送邀请
              </button>
            </div>
            {invitations.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {invitations.map((item) => (
                  <li
                    key={item.code}
                    title={`待接受 ${item.invitee_email}`}
                    className="max-w-full cursor-default truncate rounded-md border border-dashed border-foreground/25 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {item.invitee_email}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <div className="mt-8">
          <CommunityTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            pageCount={sharedPages.length}
            memberCount={community.member_count}
          />
        </div>

        {activeTab === 'pages' ? (
          <section className="mt-5">
            {sharedPages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 px-6 py-14 text-center">
                <p className="text-sm font-medium text-foreground/80">暂无共享知识</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  成员将知识授权给本社区后，会显示在这里
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {sharedPages.map((page, index) => (
                  <CommunityListItem key={page.code}>
                    <Link
                      to={`/page/${page.code}`}
                      className="flex items-center gap-3 px-2 py-2.5"
                    >
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                        style={getCoverSurfaceStyle(
                          page.cover_color ?? getHomeCardColor(index)
                        )}
                      >
                        {page.icon ? (
                          <ColorEmoji size={22}>{page.icon}</ColorEmoji>
                        ) : (
                          <span className="text-lg leading-none">📄</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'truncate text-[13px] leading-5',
                            getNavLabelFontClass(page.title)
                          )}
                        >
                          {page.title}
                        </p>
                        <p className="font-nav-cjk mt-0.5 truncate text-[11px] text-subtle-foreground">
                          {page.permission === 'edit' ? '可编辑' : '只读'} · {page.owner_name}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                    </Link>
                  </CommunityListItem>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section className="mt-5">
            <ul className="space-y-1">
              {community.members.map((member) => (
                <CommunityListItem
                  key={member.user_code}
                  className="group flex items-center gap-3 px-2 py-2.5 text-sm"
                >
                  <CommunityAvatar
                    name={member.name}
                    seed={member.user_code}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={getNavLabelFontClass(member.name)}>{member.name}</p>
                      <RoleBadge role={member.role} />
                    </div>
                  </div>
                  {canManage && member.role !== 'owner' ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100"
                      onClick={() => void handleRemoveMember(member.user_code)}
                    >
                      <UserMinus className="size-3.5" />
                      移除
                    </button>
                  ) : null}
                </CommunityListItem>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
