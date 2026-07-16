import { normalizeStaticValue } from 'platejs';
import { nanoid } from 'platejs';

import type { PageId, WikiPage, WikiWorkspace } from './types';

const STORAGE_KEY = 'wiki-workspace-v4';

export function createEmptyContent() {
  return normalizeStaticValue([
    {
      type: 'p',
      children: [{ text: '' }],
    },
  ]);
}

export function createPage(
  partial: Partial<WikiPage> & Pick<WikiPage, 'title'>
): WikiPage {
  const now = Date.now();

  return {
    id: partial.id ?? nanoid(),
    title: partial.title,
    icon: partial.icon,
    coverColor: partial.coverColor,
    parentId: partial.parentId ?? null,
    content: partial.content ?? createEmptyContent(),
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

const POTION_PAGES = [
  { title: 'Link', icon: '🔗', coverColor: '#D3E5EF' },
  { title: 'Mention', icon: '👤', coverColor: '#E8DEEE' },
  { title: 'Playground', icon: '🌳', coverColor: '#DBEDDB' },
  { title: 'Callout', icon: '📢', coverColor: '#FDECC8' },
  { title: 'Equation', icon: '🧮', coverColor: '#D4C6F0' },
  { title: 'Upload', icon: '📤', coverColor: '#C2E7F5' },
  { title: 'Slash Menu', icon: '✨', coverColor: '#FADEC9' },
  { title: 'Block Menu', icon: '📋', coverColor: '#F5E0E9' },
  { title: 'Floating Toolbar', icon: '🧰', coverColor: '#B8EAD9' },
  { title: 'Media Toolbar', icon: '🎮', coverColor: '#FFE2DD' },
  { title: 'Table of Contents', icon: '📚', coverColor: '#EBECED' },
] as const;

function createPotionPage(
  title: string,
  icon: string,
  coverColor?: string
) {
  return createPage({
    title,
    icon,
    coverColor,
    content: normalizeStaticValue([
      {
        type: 'h1',
        children: [{ text: title }],
      },
      {
        type: 'p',
        children: [{ text: '' }],
      },
    ]),
  });
}

export function createDefaultWorkspace(): WikiWorkspace {
  const rootPage = createPotionPage('Knowledge Base', '📚', '#EBECED');
  const sectionPage = createPage({
    title: '入门指南',
    icon: '📖',
    parentId: rootPage.id,
    content: normalizeStaticValue([
      { type: 'h1', children: [{ text: '入门指南' }] },
      { type: 'p', children: [{ text: '' }] },
    ]),
  });
  const childPage = createPage({
    title: '快速上手',
    icon: '🚀',
    parentId: sectionPage.id,
    content: normalizeStaticValue([
      { type: 'h1', children: [{ text: '快速上手' }] },
      { type: 'p', children: [{ text: '' }] },
    ]),
  });

  const pages = POTION_PAGES.map(({ title, icon, coverColor }) =>
    createPotionPage(title, icon, coverColor)
  );
  const mentionPage = pages.find((page) => page.title === 'Mention');
  const allPages = [rootPage, sectionPage, childPage, ...pages];

  return {
    pages: Object.fromEntries(allPages.map((page) => [page.id, page])),
    rootPageIds: [rootPage.id, ...pages.map((page) => page.id)],
    activePageId: mentionPage?.id ?? rootPage.id,
  };
}

export function loadWorkspace(): WikiWorkspace {
  if (typeof window === 'undefined') {
    return createDefaultWorkspace();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return createDefaultWorkspace();
    }

    const parsed = JSON.parse(raw) as WikiWorkspace;

    if (!parsed.pages || !parsed.rootPageIds) {
      return createDefaultWorkspace();
    }

    return parsed;
  } catch {
    return createDefaultWorkspace();
  }
}

export function saveWorkspace(workspace: WikiWorkspace) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
}

export function getPageTitleFromContent(content: WikiPage['content']): string {
  const firstBlock = content[0];

  if (!firstBlock) {
    return '无标题';
  }

  if (firstBlock.type === 'h1' || firstBlock.type === 'h2' || firstBlock.type === 'h3') {
    const text = firstBlock.children
      ?.map((child) => ('text' in child ? child.text : ''))
      .join('')
      .trim();

    if (text) {
      return text;
    }
  }

  return '无标题';
}

export function hasMeaningfulContent(content: WikiPage['content']): boolean {
  if (!Array.isArray(content) || content.length === 0) {
    return false;
  }

  if (getPageTitleFromContent(content) !== '无标题') {
    return true;
  }

  return JSON.stringify(content).length > 120;
}

export function getPageDepth(
  workspace: WikiWorkspace,
  pageId: PageId
): number {
  let depth = 1;
  let current = workspace.pages[pageId];

  while (current?.parentId) {
    depth += 1;
    current = workspace.pages[current.parentId];
  }

  return depth;
}

export const MAX_PAGE_DEPTH = 3;
export const MAX_CONTAINER_DEPTH = 32;

export function getSiblingPageIds(
  workspace: WikiWorkspace,
  parentId: PageId | null,
  excludePageId?: PageId
): PageId[] {
  if (parentId === null) {
    return workspace.rootPageIds.filter((id) => id !== excludePageId);
  }

  return Object.values(workspace.pages)
    .filter((page) => page.parentId === parentId && page.id !== excludePageId)
    .sort(
      (a, b) =>
        (a.sortOrder ?? a.createdAt) - (b.sortOrder ?? b.createdAt)
    )
    .map((page) => page.id);
}

export function getSiblingIndex(
  workspace: WikiWorkspace,
  pageId: PageId
): number {
  const page = workspace.pages[pageId];

  if (!page) {
    return -1;
  }

  return getSiblingPageIds(workspace, page.parentId).indexOf(pageId);
}

function isPageDescendant(
  workspace: WikiWorkspace,
  ancestorId: PageId,
  pageId: PageId
): boolean {
  let current = workspace.pages[pageId];

  while (current?.parentId) {
    if (current.parentId === ancestorId) {
      return true;
    }

    current = workspace.pages[current.parentId];
  }

  return false;
}

function getMaxSubtreeDepth(workspace: WikiWorkspace, pageId: PageId): number {
  const page = workspace.pages[pageId];

  if (!page) {
    return 0;
  }

  let maxDepth = getPageDepth(workspace, pageId);
  const children = Object.values(workspace.pages).filter(
    (item) => item.parentId === pageId
  );

  for (const child of children) {
    maxDepth = Math.max(maxDepth, getMaxSubtreeDepth(workspace, child.id));
  }

  return maxDepth;
}

export function movePageInWorkspace(
  workspace: WikiWorkspace,
  pageId: PageId,
  targetParentId: PageId | null,
  targetIndex: number
): WikiWorkspace {
  const page = workspace.pages[pageId];

  if (!page) {
    return workspace;
  }

  if (targetParentId === pageId) {
    return workspace;
  }

  if (targetParentId && isPageDescendant(workspace, pageId, targetParentId)) {
    return workspace;
  }

  const currentDepth = getPageDepth(workspace, pageId);
  const subtreeHeight = getMaxSubtreeDepth(workspace, pageId) - currentDepth;
  const newParentDepth = targetParentId
    ? getPageDepth(workspace, targetParentId)
    : 0;

  if (newParentDepth + 1 + subtreeHeight > MAX_PAGE_DEPTH) {
    return workspace;
  }

  const oldParentId = page.parentId;
  let rootPageIds = workspace.rootPageIds.filter((id) => id !== pageId);
  const targetSiblings = getSiblingPageIds(workspace, targetParentId, pageId);
  const insertIndex = Math.min(Math.max(0, targetIndex), targetSiblings.length);
  targetSiblings.splice(insertIndex, 0, pageId);

  if (targetParentId === null) {
    rootPageIds = targetSiblings;
  }

  const pages = { ...workspace.pages };
  pages[pageId] = {
    ...pages[pageId],
    parentId: targetParentId,
    sortOrder: insertIndex,
    updatedAt: Date.now(),
  };

  targetSiblings.forEach((id, index) => {
    pages[id] = {
      ...pages[id],
      sortOrder: index,
    };
  });

  if (oldParentId !== targetParentId) {
    const oldSiblings = getSiblingPageIds(workspace, oldParentId, pageId);

    oldSiblings.forEach((id, index) => {
      pages[id] = {
        ...pages[id],
        sortOrder: index,
      };
    });
  }

  return {
    ...workspace,
    pages,
    rootPageIds,
  };
}

export function buildPageTree(
  workspace: WikiWorkspace,
  parentId: PageId | null = null
): import('./types').PageTreeNode[] {
  const pageIds =
    parentId === null
      ? workspace.rootPageIds
      : Object.values(workspace.pages)
          .filter((page) => page.parentId === parentId)
          .sort(
            (a, b) =>
              (a.sortOrder ?? a.createdAt) - (b.sortOrder ?? b.createdAt)
          )
          .map((page) => page.id);

  return pageIds
    .map((id) => workspace.pages[id])
    .filter(Boolean)
    .map((page) => ({
      ...page,
      children: buildPageTree(workspace, page.id),
    }));
}

export function deletePageFromWorkspace(
  workspace: WikiWorkspace,
  pageId: PageId
): WikiWorkspace {
  const page = workspace.pages[pageId];

  if (!page) {
    return workspace;
  }

  const childIds = Object.values(workspace.pages)
    .filter((item) => item.parentId === pageId)
    .map((item) => item.id);

  let next = workspace;

  for (const childId of childIds) {
    next = deletePageFromWorkspace(next, childId);
  }

  const pages = { ...next.pages };
  delete pages[pageId];

  const rootPageIds = page.parentId
    ? next.rootPageIds
    : next.rootPageIds.filter((id) => id !== pageId);

  return {
    pages,
    rootPageIds,
    activePageId:
      next.activePageId === pageId ? (rootPageIds[0] ?? null) : next.activePageId,
  };
}
