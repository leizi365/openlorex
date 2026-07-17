import { Navigate, useParams } from 'react-router-dom';

import { publicPagePath } from '@/lib/page-paths';

/** Short `/p/:pageId` → canonical public path `/public/:pageId`. */
export function ShortPublicPageRedirect() {
  const { pageId = '' } = useParams();
  return <Navigate to={publicPagePath(pageId)} replace />;
}
