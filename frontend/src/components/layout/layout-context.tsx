import * as React from 'react';

const SIDEBAR_COLLAPSED_KEY = 'wiki-sidebar-collapsed';

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

type LayoutContextValue = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  mobileTopBarTitle: string | null;
  setMobileTopBarTitle: (title: string | null) => void;
};

const LayoutContext = React.createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsedState] = React.useState(
    readSidebarCollapsed
  );
  const [mobileTopBarTitle, setMobileTopBarTitle] = React.useState<string | null>(
    null
  );

  const setSidebarCollapsed = React.useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);

    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const value = React.useMemo(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      toggleSidebar: () => setSidebarOpen((open) => !open),
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapsed: () => setSidebarCollapsed(!sidebarCollapsed),
      mobileTopBarTitle,
      setMobileTopBarTitle,
    }),
    [mobileTopBarTitle, sidebarCollapsed, setSidebarCollapsed, sidebarOpen]
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = React.useContext(LayoutContext);

  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider');
  }

  return context;
}
