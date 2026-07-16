/** Internal workspace page URL (authenticated editor). */
export function pagePath(code: string) {
  return `/page/${code}`;
}

/** Manage page collaborators / grants. */
export function pageAccessPath(code: string) {
  return `/pages/${code}/access`;
}

/** Public read-only page URL (shareable link). */
export function publicPagePath(code: string) {
  return `/public/${code}`;
}

export function publicPageUrl(code: string, origin = window.location.origin) {
  return `${origin}${publicPagePath(code)}`;
}
