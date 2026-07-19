import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';

import { LayoutProvider, useLayout } from '@/components/layout/layout-context';
import { MobileTopBar } from '@/components/layout/MobileTopBar';
import { Sidebar } from '@/components/layout/Sidebar';

function WikiLayoutContent({ children }: { children?: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useLayout();
  const { pathname } = useLocation();
  const showMobileTopBar = !pathname.startsWith('/page/');

  return (
    <div className="flex h-svh overflow-hidden bg-white">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden={false}
        />
      ) : null}

      <Sidebar />

      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
        {children ?? (
          <>
            {showMobileTopBar ? <MobileTopBar /> : null}
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
