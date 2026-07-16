import type { Value } from 'platejs';

import type { PageAccessDto } from '@/lib/api/pages';

export type PageId = string;

export type PageAccessLevel = 'owner' | 'edit' | 'view';

export type PageAccess = {
  level: PageAccessLevel;
  ownerCode: string;
  ownerName: string;
  via?: {
    type: string;
    code: string;
    name: string;
  } | null;
};

export type PageSyncStatus =
  | 'idle'
  | 'loading'
  | 'dirty'
  | 'saving'
  | 'conflict';

export type WikiPage = {
  id: PageId;
  title: string;
  icon?: string;
  coverColor?: string;
  parentId: PageId | null;
  /** 内页宿主；非空表示正文内页，不进侧栏树 */
  containerId?: PageId | null;
  sortOrder?: number;
  content: Value;
  version: number;
  /** 是否对外公开 */
  isPublic?: boolean;
  /** 是否为共享知识（非本人拥有） */
  isShared?: boolean;
  /** 仅在从服务端加载/重新加载时递增，用于编辑器 remount */
  editorEpoch?: number;
  contentLoaded?: boolean;
  syncStatus?: PageSyncStatus;
  createdAt: number;
  updatedAt: number;
};

export type SharedPageItem = {
  id: PageId;
  title: string;
  icon?: string;
  coverColor?: string;
  parentId: PageId | null;
  containerId?: PageId | null;
  sortOrder?: number;
  depth: number;
  permission: PageAccessLevel;
  ownerCode: string;
  ownerName: string;
  via?: PageAccess['via'];
  updatedAt: number;
};

export type SharedPageTreeNode = SharedPageItem & {
  children: SharedPageTreeNode[];
};

export type WikiWorkspace = {
  pages: Record<PageId, WikiPage>;
  rootPageIds: PageId[];
  activePageId: PageId | null;
};

export type PageTreeNode = WikiPage & {
  children: PageTreeNode[];
};
