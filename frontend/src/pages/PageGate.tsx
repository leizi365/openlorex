import { Navigate, useParams } from 'react-router-dom';

import { RequireAuth } from '@/components/auth/RequireAuth';
import { WikiLayout } from '@/components/layout/WikiLayout';
import { PagesProvider } from '@/features/pages/page-context';
import { EditorPage } from '@/pages/EditorPage';
import { publicPagePath } from '@/lib/page-paths';

/** Short `/p/:pageId` → canonical public path `/public/:pageId`. */
export function ShortPublicPageRedirect() {
  const { pageId = '' } = useParams();
  return <Navigate to={publicPagePath(pageId)} replace />;
}

/**
 * `/page/:id` is workspace-only. Guests must log in.
 * Public read-only access is only via `/public/:id` for pages with 对外公开.
 */
export function PageGate() {
  return (
    <RequireAuth>
      <PagesProvider>
        <WikiLayout>
          <EditorPage />
        </WikiLayout>
      </PagesProvider>
    </RequireAuth>
  );
}
