import * as React from 'react';

import type { SlateElementProps } from 'platejs/static';

import { SlateElement } from 'platejs/static';

import { ColorEmoji } from '@/components/ui/color-emoji';
import { cn } from '@/lib/utils';

export function CalloutElementStatic({
  children,
  className,
  ...props
}: SlateElementProps) {
  const icon = (props.element.icon as string | undefined) || '💡';
  const backgroundColor = props.element.backgroundColor as string | undefined;

  return (
    <SlateElement
      className={cn(
        'my-1 flex rounded-md p-4 pl-3',
        !backgroundColor && 'bg-muted',
        className
      )}
      style={{
        backgroundColor: backgroundColor || undefined,
      }}
      {...props}
    >
      <div className="flex w-full gap-2 rounded-md">
        <div
          className="flex size-7 shrink-0 select-none items-center justify-center"
          contentEditable={false}
        >
          <span data-plate-prevent-deserialization>
            <ColorEmoji size={20}>{icon}</ColorEmoji>
          </span>
        </div>
        <div className="w-full min-w-0">{children}</div>
      </div>
    </SlateElement>
  );
}

/**
 * DOCX-compatible callout component using table layout for side-by-side icon and content.
 */
export function CalloutElementDocx({ children, ...props }: SlateElementProps) {
  const backgroundColor =
    (props.element.backgroundColor as string) || '#f4f4f5';
  const icon = (props.element.icon as string) || '💡';

  return (
    <SlateElement {...props}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: 'none',
          backgroundColor,
          borderRadius: '4px',
          marginTop: '4pt',
          marginBottom: '4pt',
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                width: '30px',
                verticalAlign: 'top',
                padding: '8px 4px 8px 8px',
                border: 'none',
                fontSize: '18px',
              }}
            >
              <span data-plate-prevent-deserialization>{icon}</span>
            </td>
            <td
              style={{
                verticalAlign: 'top',
                padding: '8px 8px 8px 4px',
                border: 'none',
              }}
            >
              {children}
            </td>
          </tr>
        </tbody>
      </table>
    </SlateElement>
  );
}
