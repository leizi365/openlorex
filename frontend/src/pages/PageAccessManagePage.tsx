import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, ChevronsUpDown, Search, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CommunityAvatar } from '@/features/communities/CommunityAvatar';
import { CommunityListItem } from '@/features/communities/CommunityListItem';
import { fetchCommunities } from '@/lib/api/communities';
import type { CommunitySummaryDto } from '@/lib/api/communities';
import { ApiError } from '@/lib/api/types';
import {
  fetchPage,
  fetchPagePermissions,
  revokePagePermission,
  upsertPagePermission,
} from '@/lib/api/pages';
import type { PagePermissionDto } from '@/lib/api/pages';
import { getNavLabelFontClass } from '@/lib/nav-font';
import { pagePath } from '@/lib/page-paths';
import { cn } from '@/lib/utils';
import { useLayout } from '@/components/layout/layout-context';

type PermissionLevel = 'view' | 'edit';
type AccessTab = 'community' | 'user';

const SEARCH_THRESHOLD = 6;

const fieldClass =
  'h-10 rounded-lg border-0 bg-muted/50 px-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/20';

const scrollYClass = cn(
  'overflow-y-auto overscroll-contain',
  '[scrollbar-gutter:stable]',
  '[&::-webkit-scrollbar]:w-1.5',
  '[&::-webkit-scrollbar-track]:bg-transparent',
  '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border',
  '[&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/30'
);

function keyOf(type: string, code: string) {
  return `${type}:${code}`;
}

function asLevel(permission: string): PermissionLevel {
  return permission === 'edit' ? 'edit' : 'view';
}

function permissionLabel(permission: string) {
  return permission === 'edit' ? '可编辑' : '只读';
}

function filterGrants(items: PagePermissionDto[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }
  return items.filter(
    (item) =>
      item.grantee_name.toLowerCase().includes(normalized) ||
      item.grantee_code.toLowerCase().includes(normalized)
  );
}

function AccessTabs({
  activeTab,
  onChange,
  communityCount,
  userCount,
}: {
  activeTab: AccessTab;
  onChange: (tab: AccessTab) => void;
  communityCount: number;
  userCount: number;
}) {
  const tabs: { id: AccessTab; label: string; count: number }[] = [
    { id: 'community', label: '社区', count: communityCount },
    { id: 'user', label: '用户', count: userCount },
  ];

  return (
    <nav
      className="flex items-baseline gap-3 text-sm"
      role="tablist"
      aria-label="授权类型"
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
                'inline-flex items-baseline gap-1.5 select-none transition-colors',
                getNavLabelFontClass(label),
                isActive ? 'text-primary' : 'text-subtle-foreground hover:text-primary'
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

function PermissionPicker({
  value,
  disabled,
  onChange,
  className,
}: {
  value: PermissionLevel;
  disabled?: boolean;
  onChange: (value: PermissionLevel) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const options: { id: PermissionLevel; label: string }[] = [
    { id: 'view', label: '只读' },
    { id: 'edit', label: '可编辑' },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="授权权限"
          className={cn(
            fieldClass,
            'inline-flex w-auto shrink-0 items-center gap-1 px-3',
            className
          )}
        >
          <span className="font-nav-cjk text-sm">
            {permissionLabel(value)}
          </span>
          <ChevronDown className="size-3.5 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-28 p-1">
        {options.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={cn(
              'flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors',
              value === id
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            )}
            onClick={() => {
              onChange(id);
              setOpen(false);
            }}
          >
            {label}
            {value === id ? (
              <Check className="ml-auto size-3.5 text-primary" />
            ) : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function CommunityPicker({
  communities,
  value,
  disabled,
  emptyLabel,
  onChange,
}: {
  communities: CommunitySummaryDto[];
  value: string;
  disabled?: boolean;
  emptyLabel: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = communities.find((community) => community.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || communities.length === 0}
          className={cn(
            fieldClass,
            'flex w-full items-center justify-between gap-2 text-left',
            !selected && 'text-muted-foreground'
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {selected ? (
              <>
                <CommunityAvatar
                  name={selected.name}
                  seed={selected.code}
                  size="sm"
                />
                <span
                  className={cn(
                    'truncate',
                    getNavLabelFontClass(selected.name)
                  )}
                >
                  {selected.name}
                </span>
              </>
            ) : (
              <span className="font-nav-cjk truncate">
                {communities.length === 0 ? emptyLabel : '选择要授权的社区'}
              </span>
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandInput placeholder="搜索社区…" />
          <CommandList>
            <CommandEmpty>无匹配社区</CommandEmpty>
            <CommandGroup>
              {communities.map((community) => (
                <CommandItem
                  key={community.code}
                  value={community.name}
                  onSelect={() => {
                    onChange(community.code);
                    setOpen(false);
                  }}
                >
                  <CommunityAvatar
                    name={community.name}
                    seed={community.code}
                    size="sm"
                  />
                  <span className={getNavLabelFontClass(community.name)}>
                    {community.name}
                  </span>
                  {value === community.code ? (
                    <Check className="ml-auto size-4 text-primary" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function PageAccessManagePage() {
  const { pageId = '' } = useParams();
  const [activeTab, setActiveTab] = React.useState<AccessTab>('community');
  const [title, setTitle] = React.useState('');
  const [permissions, setPermissions] = React.useState<PagePermissionDto[]>([]);
  const [communities, setCommunities] = React.useState<CommunitySummaryDto[]>(
    []
  );
  const [communityQuery, setCommunityQuery] = React.useState('');
  const [userQuery, setUserQuery] = React.useState('');
  const [selectedCommunity, setSelectedCommunity] = React.useState('');
  const [communityPermission, setCommunityPermission] =
    React.useState<PermissionLevel>('view');
  const [userEmail, setUserEmail] = React.useState('');
  const [userPermission, setUserPermission] =
    React.useState<PermissionLevel>('view');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [addingCommunity, setAddingCommunity] = React.useState(false);
  const [addingUser, setAddingUser] = React.useState(false);
  const [pending, setPending] = React.useState<Set<string>>(() => new Set());
  const { setMobileTopBarTitle } = useLayout();

  const communityGrants = React.useMemo(
    () => permissions.filter((item) => item.grantee_type === 'community'),
    [permissions]
  );
  const userGrants = React.useMemo(
    () => permissions.filter((item) => item.grantee_type === 'user'),
    [permissions]
  );
  const grantedCommunityCodes = React.useMemo(
    () => new Set(communityGrants.map((item) => item.grantee_code)),
    [communityGrants]
  );
  const availableCommunities = React.useMemo(
    () =>
      communities.filter(
        (community) => !grantedCommunityCodes.has(community.code)
      ),
    [communities, grantedCommunityCodes]
  );
  const filteredCommunities = React.useMemo(
    () => filterGrants(communityGrants, communityQuery),
    [communityGrants, communityQuery]
  );
  const filteredUsers = React.useMemo(
    () => filterGrants(userGrants, userQuery),
    [userGrants, userQuery]
  );

  React.useEffect(() => {
    if (
      selectedCommunity &&
      !availableCommunities.some((item) => item.code === selectedCommunity)
    ) {
      setSelectedCommunity('');
    }
  }, [availableCommunities, selectedCommunity]);

  const loadData = React.useCallback(
    async (signal?: AbortSignal) => {
      if (!pageId) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [page, grants, communityList] = await Promise.all([
          fetchPage(pageId, { signal }),
          fetchPagePermissions(pageId, { signal }),
          fetchCommunities({ signal }),
        ]);
        if (page.access?.level !== 'owner') {
          setError('仅知识所有者可管理授权');
          setPermissions([]);
          setCommunities([]);
          setTitle(page.title || '未命名知识');
          return;
        }
        setTitle(page.title || '未命名知识');
        setPermissions(grants);
        setCommunities(communityList);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : '加载失败'
        );
      } finally {
        setLoading(false);
      }
    },
    [pageId]
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  React.useEffect(() => {
    setMobileTopBarTitle(title || null);
    return () => setMobileTopBarTitle(null);
  }, [setMobileTopBarTitle, title]);

  const runPending = async (key: string, action: () => Promise<void>) => {
    if (pending.has(key)) {
      return;
    }
    setPending((current) => new Set(current).add(key));
    try {
      await action();
    } finally {
      setPending((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  const replaceGrant = (next: PagePermissionDto) => {
    setPermissions((current) => {
      const without = current.filter(
        (item) =>
          !(
            item.grantee_type === next.grantee_type &&
            item.grantee_code === next.grantee_code
          )
      );
      return [...without, next];
    });
  };

  const handleAddCommunity = async () => {
    if (!selectedCommunity) {
      toast.error('请选择社区');
      return;
    }
    const community = availableCommunities.find(
      (item) => item.code === selectedCommunity
    );
    if (!community) {
      toast.error('请选择社区');
      return;
    }

    setAddingCommunity(true);
    try {
      const next = await upsertPagePermission(pageId, {
        grantee_type: 'community',
        grantee_code: community.code,
        permission: communityPermission,
      });
      replaceGrant(next);
      setSelectedCommunity('');
      toast.success(`已授权 ${community.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '授权失败');
    } finally {
      setAddingCommunity(false);
    }
  };

  const handleAddUser = async () => {
    const email = userEmail.trim().toLowerCase();
    if (!email) {
      toast.error('请输入邮箱');
      return;
    }
    if (!email.includes('@')) {
      toast.error('请输入有效邮箱');
      return;
    }

    setAddingUser(true);
    try {
      const next = await upsertPagePermission(pageId, {
        grantee_type: 'user',
        grantee_code: email,
        permission: userPermission,
      });
      replaceGrant(next);
      setUserEmail('');
      toast.success('已添加用户授权');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '授权失败');
    } finally {
      setAddingUser(false);
    }
  };

  const handleChangePermission = async (
    item: PagePermissionDto,
    permission: PermissionLevel
  ) => {
    if (asLevel(item.permission) === permission) {
      return;
    }
    const key = keyOf(item.grantee_type, item.grantee_code);
    await runPending(key, async () => {
      try {
        const next = await upsertPagePermission(pageId, {
          grantee_type: item.grantee_type as 'user' | 'community',
          grantee_code: item.grantee_code,
          permission,
        });
        replaceGrant(next);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '更新失败');
      }
    });
  };

  const handleRevoke = async (item: PagePermissionDto) => {
    const key = keyOf(item.grantee_type, item.grantee_code);
    await runPending(key, async () => {
      try {
        await revokePagePermission(
          pageId,
          item.grantee_type,
          item.grantee_code
        );
        setPermissions((current) =>
          current.filter(
            (entry) =>
              !(
                entry.grantee_type === item.grantee_type &&
                entry.grantee_code === item.grantee_code
              )
          )
        );
        toast.success('已撤销');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '撤销失败');
      }
    });
  };

  const renderSearch = (
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    itemCount: number
  ) =>
    itemCount >= SEARCH_THRESHOLD ? (
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn(fieldClass, 'h-9 w-full pl-8 text-sm')}
        />
      </div>
    ) : null;

  const renderCommunityAddForm = () => {
    const allGranted =
      communities.length > 0 && availableCommunities.length === 0;
    const emptyLabel = communities.length === 0
      ? '暂无可用社区'
      : '社区均已授权';

    if (allGranted) {
      return null;
    }

    return (
      <section className="mt-5 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <PermissionPicker
            value={communityPermission}
            disabled={addingCommunity}
            onChange={setCommunityPermission}
          />
          <div className="min-w-0 flex-1">
            <CommunityPicker
              communities={availableCommunities}
              value={selectedCommunity}
              disabled={addingCommunity}
              emptyLabel={emptyLabel}
              onChange={setSelectedCommunity}
            />
          </div>
          <button
            type="button"
            disabled={addingCommunity || !selectedCommunity}
            className="inline-flex h-8 shrink-0 items-center rounded-md bg-sidebar-primary/14 px-2.5 font-nav-cjk text-[13px] font-medium text-sidebar-primary transition-colors hover:bg-sidebar-primary/22 disabled:opacity-50"
            onClick={() => void handleAddCommunity()}
          >
            {addingCommunity ? '添加中…' : '添加'}
          </button>
        </div>
      </section>
    );
  };

  const renderUserAddForm = () => (
    <section className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        <PermissionPicker
          value={userPermission}
          disabled={addingUser}
          onChange={setUserPermission}
        />
        <input
          type="email"
          value={userEmail}
          disabled={addingUser}
          onChange={(event) => setUserEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void handleAddUser();
            }
          }}
          placeholder="输入已注册用户的邮箱"
          className={cn(fieldClass, 'min-w-0 flex-1')}
        />
        <button
          type="button"
          disabled={addingUser || !userEmail.trim()}
          className="inline-flex h-8 shrink-0 items-center rounded-md bg-sidebar-primary/14 px-2.5 font-nav-cjk text-[13px] font-medium text-sidebar-primary transition-colors hover:bg-sidebar-primary/22 disabled:opacity-50"
          onClick={() => void handleAddUser()}
        >
          {addingUser ? '添加中…' : '添加'}
        </button>
      </div>
    </section>
  );

  const renderCommunityList = () => (
      <section className="mt-5">
        {renderSearch(
          communityQuery,
          setCommunityQuery,
          '搜索已授权社区…',
          communityGrants.length
        )}
        {communityGrants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 px-6 py-14 text-center">
            <p className="text-sm font-medium text-foreground/80">
              尚未授权社区
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              选择社区并添加后，成员即可按权限访问此知识
            </p>
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
            无匹配结果
          </div>
        ) : (
          <ul className={cn('space-y-1', communityGrants.length > 8 && scrollYClass, communityGrants.length > 8 && 'max-h-[min(60vh,480px)] pr-1')}>
            {filteredCommunities.map((item) => {
              const key = keyOf(item.grantee_type, item.grantee_code);
              const busy = pending.has(key);
              return (
                <CommunityListItem
                  key={key}
                  className={cn(
                    'group flex items-center gap-3 px-2 py-2.5 text-sm',
                    busy && 'opacity-50'
                  )}
                >
                  <CommunityAvatar
                    name={item.grantee_name}
                    seed={item.grantee_code}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate',
                        getNavLabelFontClass(item.grantee_name)
                      )}
                    >
                      {item.grantee_name}
                    </p>
                    <p className="font-nav-cjk mt-0.5 text-[11px] text-subtle-foreground">
                      {permissionLabel(item.permission)}
                    </p>
                  </div>
                  <PermissionPicker
                    value={asLevel(item.permission)}
                    disabled={busy}
                    className="h-8 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100"
                    onChange={(permission) =>
                      void handleChangePermission(item, permission)
                    }
                  />
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100 disabled:opacity-50"
                    onClick={() => void handleRevoke(item)}
                  >
                    <UserMinus className="size-3.5" />
                    撤销
                  </button>
                </CommunityListItem>
              );
            })}
          </ul>
        )}
      </section>
  );

  const renderUserList = () => (
      <section className="mt-5">
        {renderSearch(
          userQuery,
          setUserQuery,
          '搜索已授权用户…',
          userGrants.length
        )}
        {userGrants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 px-6 py-14 text-center">
            <p className="text-sm font-medium text-foreground/80">
              尚未授权用户
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              输入邮箱并添加后，对方即可按权限访问此知识
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
            无匹配结果
          </div>
        ) : (
          <ul className={cn('space-y-1', userGrants.length > 8 && scrollYClass, userGrants.length > 8 && 'max-h-[min(60vh,480px)] pr-1')}>
            {filteredUsers.map((item) => {
              const key = keyOf(item.grantee_type, item.grantee_code);
              const busy = pending.has(key);
              return (
                <CommunityListItem
                  key={key}
                  className={cn(
                    'group flex items-center gap-3 px-2 py-2.5 text-sm',
                    busy && 'opacity-50'
                  )}
                >
                  <CommunityAvatar
                    name={item.grantee_name}
                    seed={item.grantee_code}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate',
                        getNavLabelFontClass(item.grantee_name)
                      )}
                    >
                      {item.grantee_name}
                    </p>
                    <p className="font-nav-cjk mt-0.5 truncate text-[11px] text-subtle-foreground">
                      {permissionLabel(item.permission)}
                      {item.grantee_code !== item.grantee_name
                        ? ` · ${item.grantee_code}`
                        : ''}
                    </p>
                  </div>
                  <PermissionPicker
                    value={asLevel(item.permission)}
                    disabled={busy}
                    className="h-8 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100"
                    onChange={(permission) =>
                      void handleChangePermission(item, permission)
                    }
                  />
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100 disabled:opacity-50"
                    onClick={() => void handleRevoke(item)}
                  >
                    <UserMinus className="size-3.5" />
                    撤销
                  </button>
                </CommunityListItem>
              );
            })}
          </ul>
        )}
      </section>
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        加载中…
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6 md:px-12 md:py-12">
        <Link
          to={pagePath(pageId)}
          className="inline-flex items-center gap-1 font-nav-cjk text-sm text-subtle-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          返回知识
        </Link>

        <header className="mt-5 border-b border-border/60 pb-6">
          <h1
            className={cn(
              'text-2xl font-semibold tracking-tight text-foreground',
              getNavLabelFontClass('社区用户授权')
            )}
          >
            社区用户授权
          </h1>
          <p className="font-nav-cjk mt-1.5 text-sm text-subtle-foreground">
            {title || '知识'}
            {' · '}
            <Link to={pagePath(pageId)} className="text-primary hover:underline">
              打开知识
            </Link>
          </p>
        </header>

        {error ? (
          <div className="mt-8 space-y-3 rounded-2xl border border-border/70 px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => void loadData()}
            >
              重试
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <AccessTabs
                activeTab={activeTab}
                onChange={setActiveTab}
                communityCount={communityGrants.length}
                userCount={userGrants.length}
              />
            </div>

            {activeTab === 'community'
              ? renderCommunityAddForm()
              : renderUserAddForm()}

            {activeTab === 'community'
              ? renderCommunityList()
              : renderUserList()}
          </>
        )}
      </div>
    </div>
  );
}
