import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';

import { RequireAuth } from '@/components/auth/RequireAuth';
import { PublicWikiLayout } from '@/components/layout/PublicWikiLayout';
import { WikiLayout } from '@/components/layout/WikiLayout';
import { AuthProvider } from '@/features/auth/auth-context';
import { PagesProvider } from '@/features/pages/page-context';
import { CommunitiesPage } from '@/pages/CommunitiesPage';
import { CommunityDetailPage } from '@/pages/CommunityDetailPage';
import { HomePage } from '@/pages/HomePage';
import { InviteAcceptPage } from '@/pages/InviteAcceptPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';
import { PageAccessManagePage } from '@/pages/PageAccessManagePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SharedPagesPage } from '@/pages/SharedPagesPage';
import { PageGate, ShortPublicPageRedirect } from '@/pages/PageGate';
import { PublicPageView } from '@/pages/PublicPageView';

function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
        errorElement: <RouteErrorPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
        errorElement: <RouteErrorPage />,
      },
      {
        path: '/public/:pageId',
        element: <PublicWikiLayout />,
        errorElement: <RouteErrorPage />,
        children: [
          {
            index: true,
            element: <PublicPageView />,
            errorElement: <RouteErrorPage />,
          },
        ],
      },
      {
        path: '/p/:pageId',
        element: <ShortPublicPageRedirect />,
        errorElement: <RouteErrorPage />,
      },
      {
        path: '/page/:pageId',
        element: <PageGate />,
        errorElement: <RouteErrorPage />,
      },
      {
        path: '/invite/:inviteCode',
        element: (
          <RequireAuth>
            <PagesProvider>
              <InviteAcceptPage />
            </PagesProvider>
          </RequireAuth>
        ),
        errorElement: <RouteErrorPage />,
      },
      {
        path: '/',
        element: (
          <RequireAuth>
            <PagesProvider>
              <WikiLayout />
            </PagesProvider>
          </RequireAuth>
        ),
        errorElement: <RouteErrorPage />,
        children: [
          {
            index: true,
            element: <HomePage />,
            errorElement: <RouteErrorPage />,
          },
          {
            path: 'shared',
            element: <SharedPagesPage />,
            errorElement: <RouteErrorPage />,
          },
          {
            path: 'communities',
            element: <CommunitiesPage />,
            errorElement: <RouteErrorPage />,
          },
          {
            path: 'communities/:communityId',
            element: <CommunityDetailPage />,
            errorElement: <RouteErrorPage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
            errorElement: <RouteErrorPage />,
          },
          {
            path: 'pages/:pageId/access',
            element: <PageAccessManagePage />,
            errorElement: <RouteErrorPage />,
          },
          {
            path: '*',
            element: <Navigate to="/" replace />,
          },
        ],
      },
    ],
  },
]);
