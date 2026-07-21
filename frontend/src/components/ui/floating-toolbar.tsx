'use client';

import * as React from 'react';

import {
  type FloatingToolbarState,
  flip,
  inline,
  offset,
  shift,
  useFloatingToolbar,
  useFloatingToolbarState,
} from '@platejs/floating';
import { useComposedRef } from '@udecode/cn';
import { KEYS } from 'platejs';
import {
  useEditorId,
  useEventEditorValue,
  usePluginOption,
} from 'platejs/react';

import { cn } from '@/app/api/ai/command/utils';
import { useTableSelectionState } from '@/lib/use-table-selection-state';

import { Toolbar } from './toolbar';

export function FloatingToolbar({
  children,
  className,
  state,
  ...props
}: React.ComponentProps<typeof Toolbar> & {
  state?: FloatingToolbarState;
}) {
  const editorId = useEditorId();
  const focusedEditorId = useEventEditorValue('focus');
  const isFloatingLinkOpen = !!usePluginOption({ key: KEYS.link }, 'mode');
  const { shouldHideTextFloatingToolbar } = useTableSelectionState();

  const floatingToolbarState = useFloatingToolbarState({
    editorId,
    focusedEditorId,
    hideToolbar: isFloatingLinkOpen || shouldHideTextFloatingToolbar,
    ...state,
    floatingOptions: {
      middleware: [
        inline(),
        offset(16),
        flip({
          fallbackPlacements: [
            'bottom',
            'top-start',
            'top-end',
            'bottom-start',
            'bottom-end',
          ],
          padding: 16,
        }),
        shift({ padding: 16 }),
      ],
      placement: 'top',
      ...state?.floatingOptions,
    },
  });

  const {
    clickOutsideRef,
    hidden,
    props: rootProps,
    ref: floatingRef,
  } = useFloatingToolbar(floatingToolbarState);

  const ref = useComposedRef<HTMLDivElement>(props.ref, floatingRef);

  if (hidden) return null;

  return (
    <div ref={clickOutsideRef}>
      <Toolbar
        {...props}
        {...rootProps}
        ref={ref}
        className={cn(
          'scrollbar-hide absolute z-50 overflow-x-auto whitespace-nowrap rounded-[6px] border border-[rgba(55,53,47,0.09)] bg-white p-0.5 opacity-100 shadow-[0_4px_12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.02)] print:hidden',
          'max-w-[min(100vw-24px,560px)]',
          className
        )}
      >
        {children}
      </Toolbar>
    </div>
  );
}
