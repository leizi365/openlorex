export const RECENT_VISITS_STORAGE_KEY = 'wiki:recent-page-visits';
export const RECENT_VISITS_UPDATED_EVENT = 'wiki:recent-visits-updated';
export const RECENT_VISITS_STORE_LIMIT = 20;
export const RECENT_VISITS_DISPLAY_LIMIT = 8;

export type RecentPageVisit = {
  pageId: string;
  title: string;
  icon?: string;
  coverColor?: string;
  visitedAt: number;
};

export type RecentPageVisitInput = Omit<RecentPageVisit, 'visitedAt'>;

function getStorageKey(userId: string) {
  return `${RECENT_VISITS_STORAGE_KEY}:${userId}`;
}

function readVisits(userId: string): RecentPageVisit[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as RecentPageVisit[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        typeof item?.pageId === 'string' &&
        typeof item?.title === 'string' &&
        typeof item?.visitedAt === 'number'
    );
  } catch {
    return [];
  }
}

function writeVisits(userId: string, visits: RecentPageVisit[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(visits));
  window.dispatchEvent(new Event(RECENT_VISITS_UPDATED_EVENT));
}

export function getRecentPageVisits(
  userId: string | null | undefined,
  limit = RECENT_VISITS_DISPLAY_LIMIT
) {
  if (!userId) {
    return [];
  }

  return readVisits(userId)
    .sort((left, right) => right.visitedAt - left.visitedAt)
    .slice(0, limit);
}

export function recordPageVisit(
  userId: string | null | undefined,
  input: RecentPageVisitInput
) {
  if (!userId) {
    return;
  }

  const title = input.title.trim() || '无标题';
  const nextVisit: RecentPageVisit = {
    pageId: input.pageId,
    title,
    icon: input.icon,
    coverColor: input.coverColor,
    visitedAt: Date.now(),
  };

  const visits = readVisits(userId).filter((item) => item.pageId !== input.pageId);
  visits.unshift(nextVisit);
  writeVisits(userId, visits.slice(0, RECENT_VISITS_STORE_LIMIT));
}
