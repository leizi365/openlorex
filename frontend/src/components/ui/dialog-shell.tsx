import * as React from 'react';

import { PAGE_COVER_COLORS } from '@/features/pages/cover-colors';
import { cn } from '@/lib/utils';

export const dialogShellContentClass =
  'font-nav-cjk gap-0 overflow-hidden rounded-2xl border-border/70 p-0 shadow-lg';

export const dialogShellHeaderClass =
  'place-items-start gap-2 px-6 pt-5 text-left sm:place-items-start sm:text-left';

export const dialogShellTitleClass = 'text-base font-semibold tracking-tight';

export const dialogShellBodyClass = 'px-6 pb-5';

export const dialogShellFooterClass = 'px-6 pt-4 pb-6 sm:justify-end';

export const dialogShellCancelClass =
  'h-9 border-border/70 bg-background hover:bg-accent';

export function DialogColorStrip() {
  const decorColors = PAGE_COVER_COLORS.filter((color) => color.value).slice(
    0,
    5
  );

  return (
    <div className="flex gap-1.5 px-6 pt-5">
      {decorColors.map((color) => (
        <div
          key={color.name}
          className="h-1.5 flex-1 rounded-full"
          style={{ backgroundColor: color.value }}
        />
      ))}
    </div>
  );
}

export function DialogShellBody({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div className={cn(dialogShellBodyClass, className)} {...props} />;
}
