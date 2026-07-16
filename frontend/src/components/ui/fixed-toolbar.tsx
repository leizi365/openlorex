'use client';

import { cn } from '@/app/api/ai/command/utils';

import { Toolbar } from './toolbar';

export function FixedToolbar(props: React.ComponentProps<typeof Toolbar>) {
  return (
    <Toolbar
      {...props}
      className={cn(
        'scrollbar-hide sticky top-0 left-0 z-50 mb-4 w-full justify-start gap-0.5 overflow-x-auto rounded-md border border-[rgba(55,53,47,0.09)] bg-white/90 p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-sm',
        props.className
      )}
    />
  );
}
