import type { Value } from 'platejs';

import { withAccessToken } from '@/lib/api/client';

const ASSET_DOWNLOAD_PATTERN = /\/api\/v1\/assets\/([^/?#]+)\/download/;
const PUBLIC_ASSET_DOWNLOAD_PATTERN = /\/api\/v1\/public\/assets\/([^/?#]+)\/download/;

export function isAssetDownloadUrl(url: string) {
  return ASSET_DOWNLOAD_PATTERN.test(url) || PUBLIC_ASSET_DOWNLOAD_PATTERN.test(url);
}

export function rewriteAssetDownloadUrl(url: string) {
  if (!isAssetDownloadUrl(url)) {
    return url;
  }

  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(url, base);
    parsed.searchParams.delete('access_token');
    const path = `${parsed.pathname}${parsed.search}`;
    return withAccessToken(path);
  } catch {
    return url;
  }
}

export function rewritePublicAssetDownloadUrl(url: string) {
  if (!isAssetDownloadUrl(url)) {
    return url;
  }

  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(url, base);
    const publicMatch = parsed.pathname.match(PUBLIC_ASSET_DOWNLOAD_PATTERN);
    const privateMatch = parsed.pathname.match(ASSET_DOWNLOAD_PATTERN);
    const assetCode = publicMatch?.[1] ?? privateMatch?.[1];
    if (!assetCode) {
      return url;
    }
    parsed.pathname = `/api/v1/public/assets/${assetCode}/download`;
    parsed.search = '';
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function rewriteNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(rewriteNode);
  }

  if (!node || typeof node !== 'object') {
    return node;
  }

  const record = node as Record<string, unknown>;
  const next: Record<string, unknown> = { ...record };

  if (typeof next.url === 'string') {
    next.url = rewriteAssetDownloadUrl(next.url);
  }

  if (Array.isArray(next.children)) {
    next.children = next.children.map(rewriteNode);
  }

  return next;
}

export function rewriteAssetUrlsInContent(content: Value): Value {
  return rewriteNode(content) as Value;
}

function rewritePublicNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(rewritePublicNode);
  }

  if (!node || typeof node !== 'object') {
    return node;
  }

  const record = node as Record<string, unknown>;
  const next: Record<string, unknown> = { ...record };

  if (typeof next.url === 'string') {
    next.url = rewritePublicAssetDownloadUrl(next.url);
  }

  if (Array.isArray(next.children)) {
    next.children = next.children.map(rewritePublicNode);
  }

  return next;
}

export function rewritePublicAssetUrlsInContent(content: Value): Value {
  return rewritePublicNode(content) as Value;
}
