import * as React from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/types';
import { ErrorCode } from '@/lib/api/error-codes';
import * as pagesApi from '@/lib/api/pages';
import { useAuth } from '@/features/auth/auth-context';

import {
  buildPageTree,
  getPageDepth,
  getPageTitleFromContent,
  MAX_PAGE_DEPTH,
} from './store';
import {
  buildSharedPageTree,
  emptyWorkspace,
  mapPageAccess,
  mapPageDto,
  mapSharedPage,
  mapTreeNode,
  sharedListToWorkspace,
  treeToWorkspace,
} from './mappers';
import type {
  PageAccess,
  PageId,
  PageSyncStatus,
  PageTreeNode,
  SharedPageItem,
  SharedPageTreeNode,
  WikiPage,
  WikiWorkspace,
} from './types';

type MovePagePosition = 'before' | 'after' | 'inside';

type PendingSave = {
  version: number;
  title?: string;
  icon?: string | null;
  coverColor?: string | null;
  content?: WikiPage['content'];
};

type PagesContextValue = {
  workspace: WikiWorkspace;
  pageTree: PageTreeNode[];
  sharedPages: SharedPageItem[];
  sharedPageTree: SharedPageTreeNode[];
  sharedWorkspace: WikiWorkspace;
  activePage: WikiPage | null;
  activePageId: PageId | null;
  activePageAccess: PageAccess | null;
  canEditActivePage: boolean;
  isLoading: boolean;
  isSharedPagesLoading: boolean;
  refreshPages: () => Promise<void>;
  refreshSharedPages: () => Promise<void>;
  createPage: (
    parentId?: PageId | null,
    options?: { navigate?: boolean; mode?: 'tree' | 'embedded' }
  ) => Promise<PageId>;
  updatePage: (pageId: PageId, patch: Partial<WikiPage>) => void;
  deletePage: (pageId: PageId) => Promise<void>;
  movePage: (
    pageId: PageId,
    targetPageId: PageId,
    position: MovePagePosition
  ) => Promise<void>;
  setActivePageId: (pageId: PageId) => void;
  reloadActivePage: () => Promise<void>;
};

const PagesContext = React.createContext<PagesContextValue | null>(null);

const CONTENT_SAVE_DEBOUNCE_MS = 1500;
const META_SAVE_DEBOUNCE_MS = 400;

function isUnsaved(status: PageSyncStatus | undefined) {
  return status === 'dirty' || status === 'saving';
}

function canEditAccess(access: PageAccess | null | undefined) {
  return access?.level === 'owner' || access?.level === 'edit';
}

export function PagesProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const pageMatch = useMatch('/page/:pageId');
  const pageId = pageMatch?.params.pageId;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [workspace, setWorkspace] = React.useState<WikiWorkspace>(emptyWorkspace);
  const [sharedPagesMap, setSharedPagesMap] = React.useState<Record<PageId, WikiPage>>({});
  const [sharedPageList, setSharedPageList] = React.useState<SharedPageItem[]>([]);
  const [pageAccessMap, setPageAccessMap] = React.useState<Record<PageId, PageAccess>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSharedPagesLoading, setIsSharedPagesLoading] = React.useState(false);
  const [hasLoadedPages, setHasLoadedPages] = React.useState(false);

  const saveTimersRef = React.useRef(
    new Map<string, ReturnType<typeof setTimeout>>()
  );
  const pendingSavesRef = React.useRef(new Map<string, PendingSave>());
  const saveInFlightRef = React.useRef(new Set<string>());
  const contentLoadInFlightRef = React.useRef(new Set<string>());
  const prevPageIdRef = React.useRef<string | null>(null);

  const applyServerPage = React.useCallback(
    (targetPageId: PageId, dto: Awaited<ReturnType<typeof pagesApi.fetchPage>>) => {
      const serverPage = mapPageDto(dto, { contentLoaded: true });
      const access = mapPageAccess(dto.access);

      if (access) {
        setPageAccessMap((current) => ({
          ...current,
          [targetPageId]: access,
        }));
      }

      setSharedPagesMap((current) => {
        const existing = current[targetPageId];
        if (!existing) {
          return current;
        }

        return {
          ...current,
          [targetPageId]: {
            ...existing,
            ...serverPage,
            isShared: true,
            editorEpoch: (existing.editorEpoch ?? 0) + 1,
          },
        };
      });

      setWorkspace((current) => {
        const existing = current.pages[targetPageId];
        if (!existing) {
          if (dto.access?.level !== 'owner') {
            return current;
          }
          return {
            ...current,
            pages: {
              ...current.pages,
              [targetPageId]: {
                ...serverPage,
                isShared: false,
                editorEpoch: 1,
              },
            },
          };
        }

        return {
          ...current,
          pages: {
            ...current.pages,
            [targetPageId]: {
              ...existing,
              ...serverPage,
              isShared: false,
              editorEpoch: (existing.editorEpoch ?? 0) + 1,
            },
          },
        };
      });
    },
    []
  );

  const reloadPage = React.useCallback(
    async (targetPageId: PageId) => {
      const dto = await pagesApi.fetchPage(targetPageId);
      applyServerPage(targetPageId, dto);
    },
    [applyServerPage]
  );

  const refreshSharedPages = React.useCallback(async () => {
    const items = await pagesApi.fetchSharedPages();
    setSharedPageList(items.map(mapSharedPage));
  }, []);

  const refreshPages = React.useCallback(async () => {
    const tree = await pagesApi.fetchPageTree();
    const nodes = tree.map(mapTreeNode);
    const next = treeToWorkspace(nodes);

    setWorkspace((current) => {
      const preservedEmbedded = Object.fromEntries(
        Object.entries(current.pages).filter(
          ([id, page]) => Boolean(page.containerId) && !next.pages[id]
        )
      );

      const mergedTree = Object.fromEntries(
        Object.entries(next.pages).map(([id, page]) => {
          const existing = current.pages[id];

          if (
            existing &&
            (isUnsaved(existing.syncStatus) || existing.syncStatus === 'conflict')
          ) {
            return [
              id,
              {
                ...page,
                content: existing.content,
                title: existing.title,
                icon: existing.icon,
                coverColor: existing.coverColor,
                version: existing.version,
                contentLoaded: existing.contentLoaded,
                editorEpoch: existing.editorEpoch,
                syncStatus: existing.syncStatus,
                updatedAt: existing.updatedAt,
              },
            ];
          }

          if (existing?.contentLoaded) {
            return [
              id,
              {
                ...page,
                content: existing.content,
                contentLoaded: true,
                editorEpoch: existing.editorEpoch,
                syncStatus: existing.syncStatus ?? 'idle',
              },
            ];
          }

          return [id, page];
        })
      );

      return {
        ...next,
        activePageId: current.activePageId,
        pages: {
          ...preservedEmbedded,
          ...mergedTree,
        },
      };
    });
  }, []);

  const flushPageSave = React.useCallback(
    async (targetPageId: PageId) => {
      const pending = pendingSavesRef.current.get(targetPageId);
      if (!pending || saveInFlightRef.current.has(targetPageId)) {
        return;
      }

      saveInFlightRef.current.add(targetPageId);

      setWorkspace((current) => {
        const existing = current.pages[targetPageId];
        if (!existing) {
          return current;
        }

        return {
          ...current,
          pages: {
            ...current.pages,
            [targetPageId]: {
              ...existing,
              syncStatus: 'saving',
            },
          },
        };
      });

      setSharedPagesMap((current) => {
        const existing = current[targetPageId];
        if (!existing) {
          return current;
        }

        return {
          ...current,
          [targetPageId]: {
            ...existing,
            syncStatus: 'saving',
          },
        };
      });

      try {
        const saved = await pagesApi.updatePage(targetPageId, {
          version: pending.version,
          title: pending.title,
          icon: pending.icon,
          cover_color: pending.coverColor,
          content: pending.content,
        });

        pendingSavesRef.current.delete(targetPageId);

        setWorkspace((current) => {
          const existing = current.pages[targetPageId];
          if (!existing) {
            return current;
          }

          const hasMorePending = pendingSavesRef.current.has(targetPageId);

          return {
            ...current,
            pages: {
              ...current.pages,
              [targetPageId]: {
                ...existing,
                title: saved.title,
                icon: saved.icon ?? undefined,
                coverColor: saved.cover_color ?? undefined,
                version: saved.version,
                updatedAt: new Date(saved.updated_at).getTime(),
                syncStatus: hasMorePending ? 'dirty' : 'idle',
              },
            },
          };
        });

        setSharedPagesMap((current) => {
          const existing = current[targetPageId];
          if (!existing) {
            return current;
          }

          const hasMorePending = pendingSavesRef.current.has(targetPageId);

          return {
            ...current,
            [targetPageId]: {
              ...existing,
              title: saved.title,
              icon: saved.icon ?? undefined,
              coverColor: saved.cover_color ?? undefined,
              version: saved.version,
              updatedAt: new Date(saved.updated_at).getTime(),
              syncStatus: hasMorePending ? 'dirty' : 'idle',
            },
          };
        });

        const nextPending = pendingSavesRef.current.get(targetPageId);
        if (nextPending) {
          nextPending.version = saved.version;
          void flushPageSave(targetPageId);
        }
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.code === ErrorCode.PAGE_VERSION_CONFLICT
        ) {
          pendingSavesRef.current.delete(targetPageId);

          setWorkspace((current) => {
            const existing = current.pages[targetPageId];
            if (!existing) {
              return current;
            }

            return {
              ...current,
              pages: {
                ...current.pages,
                [targetPageId]: {
                  ...existing,
                  syncStatus: 'conflict',
                },
              },
            };
          });

          toast.error('知识已被其他客户端修改', {
            action: {
              label: '重新加载',
              onClick: () => {
                void reloadPage(targetPageId).catch((reloadError) => {
                  toast.error(
                    reloadError instanceof Error
                      ? reloadError.message
                      : '重新加载失败'
                  );
                });
              },
            },
          });
        } else {
          setWorkspace((current) => {
            const existing = current.pages[targetPageId];
            if (!existing) {
              return current;
            }

            return {
              ...current,
              pages: {
                ...current.pages,
                [targetPageId]: {
                  ...existing,
                  syncStatus: 'dirty',
                },
              },
            };
          });

          toast.error(error instanceof Error ? error.message : '保存知识失败');
        }
      } finally {
        saveInFlightRef.current.delete(targetPageId);
      }
    },
    [reloadPage]
  );

  const flushPendingSave = React.useCallback(
    (targetPageId: PageId) => {
      const timer = saveTimersRef.current.get(targetPageId);
      if (timer) {
        clearTimeout(timer);
        saveTimersRef.current.delete(targetPageId);
      }

      return flushPageSave(targetPageId);
    },
    [flushPageSave]
  );

  const schedulePageSave = React.useCallback(
    (targetPageId: PageId, patch: Partial<WikiPage>, version: number) => {
      const currentPending = pendingSavesRef.current.get(targetPageId);
      const nextPending: PendingSave = {
        version: currentPending?.version ?? version,
        title: patch.title ?? currentPending?.title,
        icon:
          patch.icon !== undefined
            ? (patch.icon ?? null)
            : currentPending?.icon,
        coverColor:
          patch.coverColor !== undefined
            ? (patch.coverColor ?? null)
            : currentPending?.coverColor,
        content: patch.content ?? currentPending?.content,
      };
      pendingSavesRef.current.set(targetPageId, nextPending);

      const existingTimer = saveTimersRef.current.get(targetPageId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const delay =
        patch.content !== undefined
          ? CONTENT_SAVE_DEBOUNCE_MS
          : META_SAVE_DEBOUNCE_MS;

      const timer = setTimeout(() => {
        saveTimersRef.current.delete(targetPageId);
        void flushPageSave(targetPageId);
      }, delay);

      saveTimersRef.current.set(targetPageId, timer);
    },
    [flushPageSave]
  );

  React.useEffect(() => {
    if (!isAuthenticated) {
      pendingSavesRef.current.clear();
      contentLoadInFlightRef.current.clear();
      setHasLoadedPages(false);
      setIsLoading(false);
      setIsSharedPagesLoading(false);
      setWorkspace(emptyWorkspace());
      setSharedPagesMap({});
      setSharedPageList([]);
      setPageAccessMap({});
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasLoadedPages(false);

    void Promise.all([refreshPages(), refreshSharedPages()])
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : '加载知识失败');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
          setHasLoadedPages(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, refreshPages, refreshSharedPages]);

  const routePage =
    pageId ? workspace.pages[pageId] ?? sharedPagesMap[pageId] : undefined;

  React.useEffect(() => {
    if (!pageId || authLoading || !isAuthenticated || !hasLoadedPages) {
      return;
    }

    const ownedPage = workspace.pages[pageId];
    const sharedPage = sharedPagesMap[pageId];

    if (ownedPage) {
      setWorkspace((current) =>
        current.activePageId === pageId
          ? current
          : { ...current, activePageId: pageId }
      );
      return;
    }

    if (sharedPage) {
      return;
    }

    let cancelled = false;
    setIsSharedPagesLoading(true);

    void (async () => {
      try {
        const dto = await pagesApi.fetchPage(pageId);
        if (cancelled) {
          return;
        }

        const isOwner = dto.access?.level === 'owner';
        const page = mapPageDto(dto, {
          contentLoaded: true,
          isShared: !isOwner,
        });
        const access = mapPageAccess(dto.access);

        if (access) {
          setPageAccessMap((current) => ({
            ...current,
            [pageId]: access,
          }));
        }

        if (isOwner) {
          setWorkspace((current) => ({
            ...current,
            pages: {
              ...current.pages,
              [pageId]: page,
            },
            activePageId: pageId,
          }));
        } else {
          setSharedPagesMap((current) => ({
            ...current,
            [pageId]: page,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : '知识不存在');
          navigate('/shared', { replace: true });
        }
      } finally {
        if (!cancelled) {
          setIsSharedPagesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    hasLoadedPages,
    isAuthenticated,
    navigate,
    pageId,
    sharedPagesMap[pageId ?? ''],
    workspace.pages[pageId ?? ''],
  ]);

  React.useEffect(() => {
    if (!pageId || !isAuthenticated || !hasLoadedPages) {
      return;
    }

    const page = workspace.pages[pageId] ?? sharedPagesMap[pageId];
    if (!page || page.contentLoaded) {
      return;
    }

    if (contentLoadInFlightRef.current.has(pageId)) {
      return;
    }

    let cancelled = false;
    contentLoadInFlightRef.current.add(pageId);

    void (async () => {
      const previousPageId = prevPageIdRef.current;
      if (previousPageId && previousPageId !== pageId) {
        await flushPendingSave(previousPageId);
      }
      prevPageIdRef.current = pageId;

      if (cancelled) {
        return;
      }

      setWorkspace((current) => {
        const existing = current.pages[pageId];
        if (!existing || existing.contentLoaded) {
          return current;
        }

        return {
          ...current,
          pages: {
            ...current.pages,
            [pageId]: {
              ...existing,
              syncStatus: 'loading',
            },
          },
        };
      });

      setSharedPagesMap((current) => {
        const existing = current[pageId];
        if (!existing || existing.contentLoaded) {
          return current;
        }

        return {
          ...current,
          [pageId]: {
            ...existing,
            syncStatus: 'loading',
          },
        };
      });

      try {
        const dto = await pagesApi.fetchPage(pageId);
        if (cancelled) {
          return;
        }

        applyServerPage(pageId, dto);
      } catch (error) {
        if (!cancelled) {
          const resetStatus = (existing: WikiPage) => ({
            ...existing,
            syncStatus: 'idle' as PageSyncStatus,
          });

          setWorkspace((current) => {
            const existing = current.pages[pageId];
            if (!existing) {
              return current;
            }

            return {
              ...current,
              pages: {
                ...current.pages,
                [pageId]: resetStatus(existing),
              },
            };
          });

          setSharedPagesMap((current) => {
            const existing = current[pageId];
            if (!existing) {
              return current;
            }

            return {
              ...current,
              [pageId]: resetStatus(existing),
            };
          });

          toast.error(
            error instanceof Error ? error.message : '加载知识内容失败'
          );
        }
      } finally {
        contentLoadInFlightRef.current.delete(pageId);
      }
    })();

    return () => {
      cancelled = true;
      contentLoadInFlightRef.current.delete(pageId);
    };
  }, [
    applyServerPage,
    flushPendingSave,
    hasLoadedPages,
    isAuthenticated,
    pageId,
    routePage?.contentLoaded,
    routePage?.id,
  ]);

  React.useEffect(() => {
    if (!pageId) {
      const previousPageId = prevPageIdRef.current;
      if (previousPageId) {
        void flushPendingSave(previousPageId);
        prevPageIdRef.current = null;
      }
    }
  }, [flushPendingSave, pageId]);

  React.useEffect(() => {
    const handleBeforeUnload = () => {
      for (const [targetPageId, timer] of saveTimersRef.current.entries()) {
        clearTimeout(timer);
        saveTimersRef.current.delete(targetPageId);
        void flushPageSave(targetPageId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushPageSave]);

  const pageTree = React.useMemo(() => buildPageTree(workspace), [workspace]);
  const sharedWorkspace = React.useMemo(
    () => sharedListToWorkspace(sharedPageList),
    [sharedPageList]
  );
  const sharedPageTree = React.useMemo(
    () => buildSharedPageTree(sharedPageList),
    [sharedPageList]
  );
  const activePageId = pageId ?? workspace.activePageId;
  const activePage = activePageId
    ? workspace.pages[activePageId] ?? sharedPagesMap[activePageId] ?? null
    : null;

  const activePageAccess = React.useMemo(() => {
    if (!activePageId) {
      return null;
    }

    if (pageAccessMap[activePageId]) {
      return pageAccessMap[activePageId];
    }

    if (workspace.pages[activePageId]) {
      return {
        level: 'owner' as const,
        ownerCode: '',
        ownerName: '',
      };
    }

    const sharedMeta = sharedPageList.find((item) => item.id === activePageId);
    if (sharedMeta) {
      return {
        level: sharedMeta.permission,
        ownerCode: sharedMeta.ownerCode,
        ownerName: sharedMeta.ownerName,
        via: sharedMeta.via,
      };
    }

    return null;
  }, [activePageId, pageAccessMap, sharedPageList, workspace.pages]);
  const canEditActivePage = canEditAccess(activePageAccess);

  const setActivePageId = React.useCallback(
    (nextPageId: PageId) => {
      navigate(`/page/${nextPageId}`);
    },
    [navigate]
  );

  const reloadActivePage = React.useCallback(async () => {
    if (!activePageId) {
      return;
    }

    await reloadPage(activePageId);
  }, [activePageId, reloadPage]);

  const createNewPage = React.useCallback(
    async (
      parentId: PageId | null = null,
      options?: { navigate?: boolean; mode?: 'tree' | 'embedded' }
    ) => {
      const shouldNavigate = options?.navigate !== false;

      if (!isAuthenticated) {
        toast.error('请先登录后再创建知识。');
        navigate('/login');
        return '';
      }

      const parentMeta =
        (parentId &&
          (workspace.pages[parentId] ??
            sharedPagesMap[parentId] ??
            sharedPageList.find((item) => item.id === parentId))) ||
        null;

      const asEmbedded =
        options?.mode === 'embedded' ||
        Boolean(parentMeta && 'containerId' in parentMeta && parentMeta.containerId);

      if (parentId && !asEmbedded) {
        const isSharedParent = Boolean(parentId && !workspace.pages[parentId]);
        const depth = isSharedParent
          ? (sharedPageList.find((item) => item.id === parentId)?.depth ??
            MAX_PAGE_DEPTH)
          : getPageDepth(workspace, parentId);

        if (depth >= MAX_PAGE_DEPTH) {
          toast.error('知识层级已达上限。');
          return '';
        }
      }

      let created: Awaited<ReturnType<typeof pagesApi.createPage>>;

      try {
        created = await pagesApi.createPage({
          parent_code: asEmbedded ? null : parentId,
          container_code: asEmbedded ? parentId : null,
          title: '无标题',
          icon: '📄',
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : '创建知识失败'
        );
        return '';
      }

      const page = mapPageDto(created, {
        isShared: created.access?.level !== 'owner',
      });
      const access = mapPageAccess(created.access);

      if (created.access?.level !== 'owner') {
        await refreshSharedPages();

        if (access) {
          setPageAccessMap((current) => ({
            ...current,
            [page.id]: access,
          }));
        }

        setSharedPagesMap((current) => ({
          ...current,
          [page.id]: page,
        }));

        if (shouldNavigate) {
          navigate(`/page/${page.id}`);
        }
        return page.id;
      }

      setWorkspace((current) => ({
        ...current,
        pages: {
          ...current.pages,
          [page.id]: page,
        },
        rootPageIds:
          asEmbedded || parentId
            ? current.rootPageIds
            : [...current.rootPageIds, page.id],
        activePageId: shouldNavigate ? page.id : current.activePageId,
      }));

      if (shouldNavigate) {
        navigate(`/page/${page.id}`);
      }
      return page.id;
    },
    [
      isAuthenticated,
      navigate,
      refreshSharedPages,
      sharedPageList,
      sharedPagesMap,
      workspace,
    ]
  );

  const updatePage = React.useCallback(
    (targetPageId: PageId, patch: Partial<WikiPage>) => {
      const access =
        pageAccessMap[targetPageId] ??
        (workspace.pages[targetPageId]
          ? ({ level: 'owner' } as PageAccess)
          : sharedPageList.find((item) => item.id === targetPageId));

      if (!canEditAccess(access as PageAccess | undefined)) {
        return;
      }

      let savePayload: Partial<WikiPage> | null = null;
      let saveVersion = 1;

      const applyPatch = (existing: WikiPage): WikiPage => {
        const nextContent = patch.content ?? existing.content;
        const derivedTitle = patch.title ?? getPageTitleFromContent(nextContent);

        savePayload = {
          ...patch,
          title: derivedTitle,
          content: nextContent,
        };
        saveVersion = existing.version;

        return {
          ...existing,
          ...patch,
          title: derivedTitle,
          content: nextContent,
          updatedAt: Date.now(),
          syncStatus: 'dirty',
        };
      };

      setWorkspace((current) => {
        const existing = current.pages[targetPageId];
        if (!existing || existing.syncStatus === 'conflict') {
          return current;
        }

        return {
          ...current,
          pages: {
            ...current.pages,
            [targetPageId]: applyPatch(existing),
          },
        };
      });

      setSharedPagesMap((current) => {
        const existing = current[targetPageId];
        if (!existing || existing.syncStatus === 'conflict') {
          return current;
        }

        return {
          ...current,
          [targetPageId]: applyPatch(existing),
        };
      });

      if (!savePayload || !isAuthenticated) {
        return;
      }

      schedulePageSave(targetPageId, savePayload, saveVersion);
    },
    [isAuthenticated, pageAccessMap, schedulePageSave, sharedPageList, workspace.pages]
  );

  const deletePage = React.useCallback(
    async (targetPageId: PageId) => {
      if (!isAuthenticated) {
        return;
      }

      await pagesApi.deletePage(targetPageId);

      const timer = saveTimersRef.current.get(targetPageId);
      if (timer) {
        clearTimeout(timer);
        saveTimersRef.current.delete(targetPageId);
      }
      pendingSavesRef.current.delete(targetPageId);

      const wasActive =
        pageId === targetPageId || workspace.activePageId === targetPageId;

      const tree = await pagesApi.fetchPageTree();
      const nodes = tree.map(mapTreeNode);
      const next = treeToWorkspace(nodes);
      const nextActive = wasActive
        ? (next.rootPageIds[0] ?? null)
        : workspace.activePageId;

      setWorkspace({
        ...next,
        activePageId: nextActive,
      });

      if (wasActive) {
        if (nextActive) {
          navigate(`/page/${nextActive}`);
        } else {
          navigate('/');
        }
      }
    },
    [isAuthenticated, navigate, pageId, workspace.activePageId]
  );

  const movePage = React.useCallback(
    async (
      sourcePageId: PageId,
      targetPageId: PageId,
      position: MovePagePosition
    ) => {
      if (!isAuthenticated || sourcePageId === targetPageId) {
        return;
      }

      const targetPage = workspace.pages[targetPageId];
      if (!targetPage) {
        return;
      }

      await pagesApi.movePage(sourcePageId, {
        target_code: targetPageId,
        position,
      });

      await refreshPages();
    },
    [isAuthenticated, refreshPages, workspace.pages]
  );

  const value = React.useMemo(
    () => ({
      workspace,
      pageTree,
      sharedPages: sharedPageList,
      sharedPageTree,
      sharedWorkspace,
      activePage,
      activePageId,
      activePageAccess,
      canEditActivePage,
      isLoading,
      isSharedPagesLoading,
      refreshPages,
      refreshSharedPages,
      createPage: createNewPage,
      updatePage,
      deletePage,
      movePage,
      setActivePageId,
      reloadActivePage,
    }),
    [
      workspace,
      pageTree,
      sharedPageList,
      sharedPageTree,
      sharedWorkspace,
      activePage,
      activePageId,
      activePageAccess,
      canEditActivePage,
      isLoading,
      isSharedPagesLoading,
      refreshPages,
      refreshSharedPages,
      createNewPage,
      updatePage,
      deletePage,
      movePage,
      setActivePageId,
      reloadActivePage,
    ]
  );

  return (
    <PagesContext.Provider value={value}>{children}</PagesContext.Provider>
  );
}

export function usePages() {
  const context = React.useContext(PagesContext);

  if (!context) {
    throw new Error('usePages must be used within PagesProvider');
  }

  return context;
}

/** Safe outside PagesProvider (e.g. public read-only view). */
export function useOptionalPages() {
  return React.useContext(PagesContext);
}
