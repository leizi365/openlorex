import * as React from 'react';
import { Outlet, useParams } from 'react-router-dom';

import { LayoutProvider, useLayout } from '@/components/layout/layout-context';
import { PublicSidebar } from '@/components/layout/PublicSidebar';

function PublicWikiLayoutContent({ children }: { children?: React.ReactNode }) {
  const { pageId = '' } = useParams();
  const { sidebarOpen, setSidebarOpen } = useLayout();

  return (
    <div className="flex h-svh overflow-hidden bg-white">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden={false}
        />
      ) : null}

      <PublicSidebar pageId={pageId} />

      <main className="relative z-10 min-w-0 flex-1 overflow-hidden bg-white">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}

export function PublicWikiLayout({ children }: { children?: React.ReactNode }) {
  return (
    <LayoutProvider>
      <PublicWikiLayoutContent>{children}</PublicWikiLayoutContent>
    </LayoutProvider>
  );
}
