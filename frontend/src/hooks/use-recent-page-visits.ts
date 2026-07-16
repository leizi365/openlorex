import * as React from 'react';

import {
  getRecentPageVisits,
  RECENT_VISITS_DISPLAY_LIMIT,
  RECENT_VISITS_UPDATED_EVENT,
  type RecentPageVisit,
} from '@/features/pages/recent-visits';

export function useRecentPageVisits(
  limit = RECENT_VISITS_DISPLAY_LIMIT
): RecentPageVisit[] {
  const [visits, setVisits] = React.useState(() => getRecentPageVisits(limit));

  React.useEffect(() => {
    const refresh = () => setVisits(getRecentPageVisits(limit));
    window.addEventListener(RECENT_VISITS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(RECENT_VISITS_UPDATED_EVENT, refresh);
  }, [limit]);

  return visits;
}
