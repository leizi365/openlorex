import type { Value } from 'platejs';

import { apiRequest } from './client';

export type PageAccessDto = {
  level: string;
  owner_code: string;
  owner_name: string;
  via: { type: string; code: string; name: string } | null;
};

export type PageSummaryDto = {
  code: string;
  title: string;
  icon: string | null;
  cover_color: string | null;
  parent_code: string | null;
  container_code?: string | null;
  sort_order: number;
  version: number;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
};

export type PagePublicSettingsDto = {
  is_public: boolean;
  inherited_public?: boolean;
};

export type PublicPageDto = {
  code: string;
  title: string;
  icon: string | null;
  cover_color: string | null;
  content: Value | null;
  owner_name: string | null;
  updated_at?: string | null;
};

export type PageTreeDto = PageSummaryDto & {
  children: PageTreeDto[];
};

export type PageDto = PageSummaryDto & {
  content: Value | null;
  access?: PageAccessDto | null;
};

export type SharedPageDto = PageSummaryDto & {
  permission: string;
  owner_code: string;
  owner_name: string;
  via: { type: string; code: string; name: string } | null;
  depth?: number;
};

export type PagePermissionDto = {
  grantee_type: string;
  grantee_code: string;
  grantee_name: string;
  permission: string;
};

export async function fetchPageTree() {
  return apiRequest<PageTreeDto[]>('/pages/tree');
}

export async function fetchSharedPages() {
  return apiRequest<SharedPageDto[]>('/pages/shared');
}

export async function fetchPage(
  code: string,
  options?: { auth?: boolean; signal?: AbortSignal }
) {
  return apiRequest<PageDto>(`/pages/${code}`, options);
}

export async function fetchPublicPage(
  code: string,
  options?: { signal?: AbortSignal }
) {
  return apiRequest<PublicPageDto>(`/public/pages/${code}`, {
    auth: false,
    ...options,
  });
}

export async function fetchPublicPageTree(
  code: string,
  options?: { signal?: AbortSignal }
) {
  return apiRequest<PageTreeDto[]>(`/public/pages/${code}/tree`, {
    auth: false,
    ...options,
  });
}

/** Only the public API — non-public pages must not load here. */
export async function loadPublicPageContent(
  code: string,
  options?: { signal?: AbortSignal }
) {
  return fetchPublicPage(code, options);
}

export async function fetchPagePublicSettings(
  code: string,
  options?: { signal?: AbortSignal }
) {
  return apiRequest<PagePublicSettingsDto>(`/pages/${code}/public`, options);
}

export async function updatePagePublicSettings(
  code: string,
  input: { is_public: boolean }
) {
  return apiRequest<PagePublicSettingsDto>(`/pages/${code}/public`, {
    method: 'PUT',
    body: input,
  });
}

export async function fetchPagePermissions(
  code: string,
  options?: { signal?: AbortSignal }
) {
  return apiRequest<PagePermissionDto[]>(`/pages/${code}/permissions`, options);
}

export async function upsertPagePermission(
  code: string,
  input: {
    grantee_type: 'user' | 'community';
    grantee_code: string;
    permission: 'view' | 'edit';
  }
) {
  return apiRequest<PagePermissionDto>(`/pages/${code}/permissions`, {
    method: 'PUT',
    body: input,
  });
}

export async function revokePagePermission(
  code: string,
  granteeType: string,
  granteeCode: string
) {
  await apiRequest<null>(`/pages/${code}/permissions/${granteeType}/${granteeCode}`, {
    method: 'DELETE',
  });
}

export async function createPage(input: {
  parent_code?: string | null;
  container_code?: string | null;
  title?: string;
  icon?: string | null;
}) {
  return apiRequest<PageDto>('/pages', {
    method: 'POST',
    body: {
      parent_code: input.parent_code ?? null,
      container_code: input.container_code ?? null,
      title: input.title ?? '无标题',
      icon: input.icon ?? null,
    },
  });
}

export async function updatePage(
  code: string,
  input: {
    version: number;
    title?: string;
    icon?: string | null;
    cover_color?: string | null;
    content?: Value;
  }
) {
  return apiRequest<PageDto>(`/pages/${code}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deletePage(code: string) {
  await apiRequest<null>(`/pages/${code}`, { method: 'DELETE' });
}

export async function movePage(
  code: string,
  input: {
    target_code: string;
    position: 'before' | 'after' | 'inside';
  }
) {
  return apiRequest<PageDto>(`/pages/${code}/move`, {
    method: 'POST',
    body: input,
  });
}
