import type * as React from 'react';

import {
  rewriteAssetDownloadUrl,
  rewritePublicAssetDownloadUrl,
} from '@/lib/asset-urls';

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isCoverColor(value?: string | null): value is string {
  return !!value && HEX_COLOR_PATTERN.test(value);
}

export function isCoverImage(value?: string | null): value is string {
  return !!value && !isCoverColor(value);
}

/** Persist cover without access_token query params. */
export function normalizeCoverValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || isCoverColor(trimmed)) {
    return trimmed;
  }

  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(trimmed, base);
    parsed.searchParams.delete('access_token');

    if (
      typeof window !== 'undefined' &&
      parsed.origin === window.location.origin
    ) {
      return `${parsed.pathname}${parsed.search}`;
    }

    return parsed.toString();
  } catch {
    return trimmed;
  }
}

export function resolveCoverUrl(
  value: string,
  mode: 'private' | 'public' = 'private'
) {
  if (mode === 'public') {
    return rewritePublicAssetDownloadUrl(value);
  }
  return rewriteAssetDownloadUrl(value);
}

export function getCoverSurfaceStyle(
  cover?: string | null,
  mode: 'private' | 'public' = 'private'
): React.CSSProperties {
  if (!cover) {
    return {};
  }

  if (isCoverColor(cover)) {
    return { backgroundColor: cover };
  }

  const url = resolveCoverUrl(cover, mode);
  return {
    backgroundImage: `url(${JSON.stringify(url)})`,
    backgroundRepeat: 'repeat',
    backgroundPosition: 'top left',
    backgroundSize: 'auto',
  };
}
