import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';

import { LayoutProvider, useLayout } from '@/components/layout/layout-context';
import { MobileTopBar } from '@/components/layout/MobileTopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';

function WikiLayoutContent({ children }: { children?: React.ReactNode }) {
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

      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
        {children ?? (
          <>
            <MobileTopBar />
            <div className="min-h-0 flex-1 overflow-hidden">
              <Outlet />
            </div>
          </>
        )}
      </main>
      <Toaster position="bottom-center" />
    </div>
  );
}

export function WikiLayout({ children }: { children?: React.ReactNode }) {
  return (
    <LayoutProvider>
      <WikiLayoutContent>{children}</WikiLayoutContent>
    </LayoutProvider>
  );
}
