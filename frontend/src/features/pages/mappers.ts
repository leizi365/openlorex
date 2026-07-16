import type { Value } from 'platejs';

import type { PageTreeDto, PageDto, SharedPageDto, PageAccessDto } from '@/lib/api/pages';
import { rewriteAssetUrlsInContent } from '@/lib/asset-urls';

import { buildPageTree, createEmptyContent } from './store';
import type {
  PageAccess,
  PageAccessLevel,
  PageId,
  PageTreeNode,
  SharedPageItem,
  SharedPageTreeNode,
  WikiPage,
  WikiWorkspace,
} from './types';

export function mapPageAccess(dto: PageAccessDto | null | undefined): PageAccess | null {
  if (!dto) {
    return null;
  }

  return {
    level: dto.level as PageAccessLevel,
    ownerCode: dto.owner_code,
    ownerName: dto.owner_name,
    via: dto.via,
  };
}

export function mapPageDto(
  dto: PageDto,
  options?: { contentLoaded?: boolean; isShared?: boolean }
): WikiPage {
  return {
    id: dto.code,
    title: dto.title,
    icon: dto.icon ?? undefined,
    coverColor: dto.cover_color ?? undefined,
    parentId: dto.parent_code,
    containerId: dto.container_code ?? null,
    sortOrder: dto.sort_order,
    content:
      Array.isArray(dto.content) && dto.content.length > 0
        ? rewriteAssetUrlsInContent(dto.content as Value)
        : createEmptyContent(),
    version: dto.version,
    isPublic: dto.is_public ?? false,
    isShared: options?.isShared ?? dto.access?.level !== 'owner',
    contentLoaded: options?.contentLoaded ?? true,
    syncStatus: 'idle',
    createdAt: new Date(dto.created_at).getTime(),
    updatedAt: new Date(dto.updated_at).getTime(),
  };
}

export function mapSharedPage(dto: SharedPageDto): SharedPageItem {
  return {
    id: dto.code,
    title: dto.title,
    icon: dto.icon ?? undefined,
    coverColor: dto.cover_color ?? undefined,
    parentId: dto.parent_code,
    containerId: dto.container_code ?? null,
    sortOrder: dto.sort_order,
    depth: dto.depth ?? 1,
    permission: dto.permission as PageAccessLevel,
    ownerCode: dto.owner_code,
    ownerName: dto.owner_name,
    via: dto.via,
    updatedAt: new Date(dto.updated_at).getTime(),
  };
}

export function mapTreeNode(dto: PageTreeDto): PageTreeNode {
  return {
    id: dto.code,
    title: dto.title,
    icon: dto.icon ?? undefined,
    coverColor: dto.cover_color ?? undefined,
    parentId: dto.parent_code,
    containerId: dto.container_code ?? null,
    sortOrder: dto.sort_order,
    content: createEmptyContent(),
    version: dto.version,
    isPublic: dto.is_public ?? false,
    contentLoaded: false,
    syncStatus: 'idle',
    createdAt: new Date(dto.created_at).getTime(),
    updatedAt: new Date(dto.updated_at).getTime(),
    children: dto.children.map(mapTreeNode),
  };
}

export function treeToWorkspace(nodes: PageTreeNode[]): WikiWorkspace {
  const pages: Record<PageId, WikiPage> = {};
  const rootPageIds: PageId[] = nodes.map((node) => node.id);

  const walk = (node: PageTreeNode) => {
    pages[node.id] = {
      id: node.id,
      title: node.title,
      icon: node.icon,
      coverColor: node.coverColor,
      parentId: node.parentId,
      containerId: node.containerId ?? null,
      sortOrder: node.sortOrder,
      content: node.content,
      version: node.version,
      isPublic: node.isPublic ?? false,
      contentLoaded: false,
      syncStatus: 'idle',
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };

    for (const child of node.children) {
      walk(child);
    }
  };

  for (const node of nodes) {
    walk(node);
  }

  return {
    pages,
    rootPageIds,
    activePageId: null,
  };
}

export function emptyWorkspace(): WikiWorkspace {
  return {
    pages: {},
    rootPageIds: [],
    activePageId: null,
  };
}

export function sharedListToWorkspace(items: SharedPageItem[]): WikiWorkspace {
  const itemIds = new Set(items.map((item) => item.id));
  const pages: Record<PageId, WikiPage> = {};

  for (const item of items) {
    const parentId =
      item.parentId && itemIds.has(item.parentId) ? item.parentId : null;

    pages[item.id] = {
      id: item.id,
      title: item.title,
      icon: item.icon,
      coverColor: item.coverColor,
      parentId,
      containerId: item.containerId ?? null,
      sortOrder: item.sortOrder,
      content: createEmptyContent(),
      version: 1,
      contentLoaded: false,
      syncStatus: 'idle',
      createdAt: item.updatedAt,
      updatedAt: item.updatedAt,
      isShared: true,
    };
  }

  const rootPageIds = items
    .filter((item) => {
      const parentId = item.parentId;
      return !parentId || !itemIds.has(parentId);
    })
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.updatedAt - b.updatedAt
    )
    .map((item) => item.id);

  return {
    pages,
    rootPageIds,
    activePageId: null,
  };
}

export function buildSharedPageTree(items: SharedPageItem[]): SharedPageTreeNode[] {
  if (items.length === 0) {
    return [];
  }

  const workspace = sharedListToWorkspace(items);
  const itemById = new Map(items.map((item) => [item.id, item]));

  const walk = (parentId: PageId | null): SharedPageTreeNode[] =>
    buildPageTree(workspace, parentId)
      .map((node) => {
        const meta = itemById.get(node.id);
        if (!meta) {
          return null;
        }

        return {
          ...meta,
          children: walk(node.id),
        };
      })
      .filter((node): node is SharedPageTreeNode => node !== null);

  return walk(null);
}
