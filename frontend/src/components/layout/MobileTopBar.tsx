import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { useLayout } from '@/components/layout/layout-context';
import { getNavLabelFontClass } from '@/lib/nav-font';
import { cn } from '@/lib/utils';

function getTitleFromPath(pathname: string) {
  if (pathname === '/') {
    return 'Home';
  }
  if (pathname === '/shared') {
    return '共享的知识';
  }
  if (pathname === '/communities') {
    return '社区';
  }
  if (pathname.startsWith('/communities/')) {
    return '社区';
  }
  if (pathname === '/settings') {
    return '设置';
  }
  if (pathname.includes('/access')) {
    return '社区用户授权';
  }
  return 'Knowledge';
}

type MobileTopBarProps = {
  title?: string;
  trailing?: React.ReactNode;
};

export function MobileTopBar({ title: titleProp, trailing }: MobileTopBarProps) {
  const { toggleSidebar, mobileTopBarTitle } = useLayout();
  const { pathname } = useLocation();
  const title = titleProp ?? mobileTopBarTitle ?? getTitleFromPath(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-11 shrink-0 items-center gap-2 border-b border-border/60 bg-white px-3 pt-[env(safe-area-inset-top)] md:hidden">
      <button
        type="button"
        onClick={toggleSidebar}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/4"
        aria-label="打开菜单"
      >
        <Menu className="size-5" />
      </button>
      <h1
        className={cn(
          'min-w-0 flex-1 truncate text-sm font-medium text-foreground',
          getNavLabelFontClass(title)
        )}
      >
        {title}
      </h1>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </header>
  );
}
