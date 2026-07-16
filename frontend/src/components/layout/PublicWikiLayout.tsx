import * as React from 'react';
import { Outlet, useParams } from 'react-router-dom';

import { LayoutProvider, useLayout } from '@/components/layout/layout-context';
import { PublicSidebar } from '@/components/layout/PublicSidebar';
import { cn } from '@/lib/utils';

function PublicWikiLayoutContent({ children }: { children?: React.ReactNode }) {
  const { pageId = '' } = useParams();
  const { sidebarOpen, setSidebarOpen } = useLayout();

  return (
    <div className="flex h-svh overflow-hidden bg-white">
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      <PublicSidebar pageId={pageId} />

      <main className="min-w-0 flex-1 overflow-hidden bg-white">
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
