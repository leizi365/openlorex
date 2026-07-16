import * as React from 'react';
import { ArrowLeft, Check, ChevronRight, Pencil, UserMinus, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ColorEmoji } from '@/components/ui/color-emoji';
import { CommunityAvatar } from '@/features/communities/CommunityAvatar';
import { CommunityListItem } from '@/features/communities/CommunityListItem';
import { getCoverSurfaceStyle } from '@/features/pages/cover';
import {
  applyToJoinCommunity,
  approveJoinApplication,
  createInvitation,
  fetchCommunity,
  fetchCommunitySharedPages,
  fetchInvitations,
  fetchJoinApplications,
  rejectJoinApplication,
  removeMember,
  updateCommunity,
} from '@/lib/api/communities';
import type {
  CommunityDetailDto,
  InvitationDto,
  JoinApplicationDto,
} from '@/lib/api/communities';
import type { SharedPageDto } from '@/lib/api/pages';
import {
  formatCommunityRole,
  formatCommunityVisibility,
} from '@/features/communities/presentation';
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

function VisibilityBadge({ isPublic }: { isPublic: boolean }) {
  return (
    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {formatCommunityVisibility(isPublic)}
    </span>
  );
}

type CommunityTab = 'members' | 'pages' | 'applications';

function CommunityTabs({
  activeTab,
  onChange,
  pageCount,
  memberCount,
  applicationCount,
  showApplications,
}: {
  activeTab: CommunityTab;
  onChange: (tab: CommunityTab) => void;
  pageCount: number;
  memberCount: number;
  applicationCount: number;
  showApplications: boolean;
}) {
  const tabs: { id: CommunityTab; label: string; count: number }[] = [
    { id: 'pages', label: '已共享的知识', count: pageCount },
    { id: 'members', label: '成员', count: memberCount },
  ];
  if (showApplications) {
    tabs.push({ id: 'applications', label: '加入申请', count: applicationCount });
  }

  return (
    <nav
      className="flex flex-wrap items-baseline gap-3 text-sm"
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
  const [applications, setApplications] = React.useState<JoinApplicationDto[]>([]);
  const [sharedPages, setSharedPages] = React.useState<SharedPageDto[]>([]);
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [applying, setApplying] = React.useState(false);
  const [togglingVisibility, setTogglingVisibility] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState('');
  const [savingName, setSavingName] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<CommunityTab>('pages');
  const { setMobileTopBarTitle } = useLayout();

  const isMember = Boolean(community?.my_role);
  const canManage =
    community?.my_role === 'owner' || community?.my_role === 'admin';
  const isOwner = community?.my_role === 'owner';

  const load = React.useCallback(async () => {
    if (!communityId) {
      return;
    }

    setLoading(true);
    try {
      const detail = await fetchCommunity(communityId);
      setCommunity(detail);

      const member = Boolean(detail.my_role);
      const owner = detail.my_role === 'owner';
      const admin = detail.my_role === 'owner' || detail.my_role === 'admin';

      const [inviteItems, sharedItems, applicationItems] = await Promise.all([
        admin ? fetchInvitations(communityId) : Promise.resolve([]),
        member ? fetchCommunitySharedPages(communityId) : Promise.resolve([]),
        owner ? fetchJoinApplications(communityId) : Promise.resolve([]),
      ]);
      setInvitations(inviteItems);
      setSharedPages(sharedItems);
      setApplications(applicationItems);

      if (!member) {
        setActiveTab('pages');
      }
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

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyToJoinCommunity(communityId);
      toast.success('已提交加入申请，请等待创建者审核');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '申请失败');
    } finally {
      setApplying(false);
    }
  };

  const handleApprove = async (applicationCode: string) => {
    try {
      await approveJoinApplication(communityId, applicationCode);
      toast.success('已同意加入申请');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleReject = async (applicationCode: string) => {
    try {
      await rejectJoinApplication(communityId, applicationCode);
      toast.success('已拒绝加入申请');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleToggleVisibility = async () => {
    if (!community) {
      return;
    }
    setTogglingVisibility(true);
    try {
      const next = !community.is_public;
      await updateCommunity(communityId, { is_public: next });
      toast.success(next ? '已设为开放社区' : '已设为私密社区');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败');
    } finally {
      setTogglingVisibility(false);
    }
  };

  const startEditName = () => {
    if (!community) {
      return;
    }
    setNameDraft(community.name);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!community) {
      return;
    }
    const nextName = nameDraft.trim();
    if (!nextName) {
      toast.error('请输入社区名称');
      return;
    }
    if (nextName === community.name) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      await updateCommunity(communityId, { name: nextName });
      toast.success('社区名称已更新');
      setEditingName(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重命名失败');
    } finally {
      setSavingName(false);
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
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  className="h-9 min-w-0 flex-1 rounded-md border-0 bg-muted/50 px-3 text-lg font-semibold outline-none transition focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/20"
                  value={nameDraft}
                  maxLength={100}
                  disabled={savingName}
                  onChange={(event) => setNameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void handleSaveName();
                    }
                    if (event.key === 'Escape') {
                      setEditingName(false);
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={savingName}
                  className="inline-flex h-8 shrink-0 items-center rounded-md bg-sidebar-primary/14 px-2.5 font-nav-cjk text-[13px] font-medium text-sidebar-primary transition-colors hover:bg-sidebar-primary/22 disabled:opacity-50"
                  onClick={() => void handleSaveName()}
                >
                  {savingName ? '保存中…' : '保存'}
                </button>
                <button
                  type="button"
                  disabled={savingName}
                  className="inline-flex h-8 shrink-0 items-center rounded-md px-2.5 font-nav-cjk text-[13px] text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  onClick={() => setEditingName(false)}
                >
                  取消
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1
                  className={cn(
                    'min-w-0 truncate text-2xl font-semibold tracking-tight text-foreground',
                    getNavLabelFontClass(community.name)
                  )}
                >
                  {community.name}
                </h1>
                {canManage ? (
                  <button
                    type="button"
                    aria-label="重命名社区"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={startEditName}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                ) : null}
              </div>
            )}
            {community.description ? (
              <p className="font-nav-cjk mt-1.5 text-sm text-subtle-foreground">
                {community.description}
              </p>
            ) : null}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-nav-cjk text-xs text-subtle-foreground">
              <span>{community.member_count} 位成员</span>
              <VisibilityBadge isPublic={community.is_public} />
              {community.my_role ? <RoleBadge role={community.my_role} /> : null}
              <span>创建者 {community.owner_name}</span>
            </div>
            {canManage ? (
              <button
                type="button"
                disabled={togglingVisibility}
                className="font-nav-cjk mt-3 text-xs text-sidebar-primary transition-colors hover:underline disabled:opacity-50"
                onClick={() => void handleToggleVisibility()}
              >
                {togglingVisibility
                  ? '更新中…'
                  : community.is_public
                    ? '改为私密'
                    : '改为开放'}
              </button>
            ) : null}
          </div>
        </header>

        {!isMember && community.is_public ? (
          <section className="mt-6">
            {community.my_application_status === 'pending' ? (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-3 font-nav-cjk text-sm text-subtle-foreground">
                你的加入申请正在等待创建者审核
              </div>
            ) : (
              <button
                type="button"
                disabled={applying}
                className="inline-flex h-9 items-center rounded-md bg-sidebar-primary/14 px-3 font-nav-cjk text-[13px] font-medium text-sidebar-primary transition-colors hover:bg-sidebar-primary/22 disabled:opacity-50"
                onClick={() => void handleApply()}
              >
                {applying ? '申请中…' : '申请加入'}
              </button>
            )}
          </section>
        ) : null}

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

        {isMember ? (
          <>
            <div className="mt-8">
              <CommunityTabs
                activeTab={activeTab}
                onChange={setActiveTab}
                pageCount={sharedPages.length}
                memberCount={community.member_count}
                applicationCount={applications.length}
                showApplications={isOwner}
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
                              {page.permission === 'edit' ? '可编辑' : '只读'} ·{' '}
                              {page.owner_name}
                            </p>
                          </div>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                        </Link>
                      </CommunityListItem>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            {activeTab === 'members' ? (
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
            ) : null}

            {activeTab === 'applications' && isOwner ? (
              <section className="mt-5">
                {applications.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 px-6 py-14 text-center">
                    <p className="text-sm font-medium text-foreground/80">暂无待审核申请</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      用户申请加入开放社区后，会出现在这里
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {applications.map((application) => (
                      <CommunityListItem
                        key={application.code}
                        className="flex items-center gap-3 px-2 py-2.5 text-sm"
                      >
                        <CommunityAvatar
                          name={application.applicant_name}
                          seed={application.applicant_code}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={getNavLabelFontClass(application.applicant_name)}>
                            {application.applicant_name}
                          </p>
                          <p className="font-nav-cjk mt-0.5 truncate text-[11px] text-subtle-foreground">
                            {application.applicant_email}
                            {application.message ? ` · ${application.message}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            className="inline-flex h-8 items-center gap-1 rounded-md bg-sidebar-primary/14 px-2.5 font-nav-cjk text-[12px] font-medium text-sidebar-primary transition-colors hover:bg-sidebar-primary/22"
                            onClick={() => void handleApprove(application.code)}
                          >
                            <Check className="size-3.5" />
                            同意
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 font-nav-cjk text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/10"
                            onClick={() => void handleReject(application.code)}
                          >
                            <X className="size-3.5" />
                            拒绝
                          </button>
                        </div>
                      </CommunityListItem>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </>
        ) : (
          <section className="mt-8 rounded-xl border border-dashed border-border/70 px-6 py-14 text-center">
            <p className="text-sm font-medium text-foreground/80">加入后可查看社区内容</p>
            <p className="mt-1 text-sm text-muted-foreground">
              共享知识与成员列表仅对社区成员开放
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
