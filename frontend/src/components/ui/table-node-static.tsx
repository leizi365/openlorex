import * as React from 'react';

import type { TTableCellElement, TTableElement } from 'platejs';
import type { SlateElementProps } from 'platejs/static';

import { BaseTablePlugin } from '@platejs/table';
import { SlateElement } from 'platejs/static';

import { cn } from '@/app/api/ai/command/utils';

export function TableElementStatic({
  children,
  ...props
}: SlateElementProps<TTableElement>) {
  const { disableMarginLeft } = props.editor.getOptions(BaseTablePlugin);
  const marginLeft = disableMarginLeft ? 0 : props.element.marginLeft;

  return (
    <SlateElement
      {...props}
      className="wiki-table-block min-w-0 max-w-full overflow-x-auto py-0"
      style={{ paddingLeft: marginLeft }}
    >
      <div className="group/table relative w-max">
        <table
          className="mr-0 ml-0 table h-px w-auto table-fixed border-collapse"
          style={{ borderCollapse: 'collapse' }}
        >
          <tbody>{children}</tbody>
        </table>
      </div>
    </SlateElement>
  );
}

export function TableRowElementStatic(props: SlateElementProps) {
  return (
    <SlateElement {...props} as="tr" className="h-full">
      {props.children}
    </SlateElement>
  );
}

export function TableCellElementStatic({
  isHeader,
  ...props
}: SlateElementProps<TTableCellElement> & {
  isHeader?: boolean;
}) {
  const { editor, element } = props;
  const { api } = editor.getPlugin(BaseTablePlugin);

  const { minHeight, width } = api.table.getCellSize({ element });
  const borders = api.table.getCellBorders({ element });
  const alignElement = element as TTableCellElement & {
    align?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
  };
  const horizontalAlign =
    alignElement.align === 'center' ||
    alignElement.align === 'right' ||
    alignElement.align === 'left'
      ? alignElement.align
      : 'left';
  const verticalAlign =
    alignElement.verticalAlign === 'middle' ||
    alignElement.verticalAlign === 'bottom' ||
    alignElement.verticalAlign === 'top'
      ? alignElement.verticalAlign
      : 'top';

  return (
    <SlateElement
      {...props}
      as={isHeader ? 'th' : 'td'}
      className={cn(
        'h-full overflow-hidden border-none bg-background p-0',
        element.background ? 'bg-(--cellBackground)' : 'bg-background',
        isHeader && 'font-normal *:m-0',
        'before:size-full',
        "before:absolute before:box-border before:select-none before:content-['']",
        borders &&
          cn(
            borders.bottom?.size && 'before:border-b before:border-b-border',
            borders.right?.size && 'before:border-r before:border-r-border',
            borders.left?.size && 'before:border-l before:border-l-border',
            borders.top?.size && 'before:border-t before:border-t-border'
          )
      )}
      style={
        {
          '--cellBackground': element.background,
          verticalAlign,
          width: width || 120,
        } as React.CSSProperties
      }
      attributes={{
        ...Object.fromEntries(
          Object.entries(props.attributes ?? {}).filter(
            ([key]) => key !== 'colspan' && key !== 'rowspan'
          )
        ),
        colSpan: api.table.getColSpan(element),
        rowSpan: api.table.getRowSpan(element),
      }}
    >
      <div
        className="relative z-20 box-border flex h-full flex-col px-2.5 py-0"
        style={{
          justifyContent:
            verticalAlign === 'middle'
              ? 'center'
              : verticalAlign === 'bottom'
                ? 'flex-end'
                : 'flex-start',
          minHeight,
          textAlign: horizontalAlign,
        }}
      >
        {props.children}
      </div>
    </SlateElement>
  );
}

export function TableCellHeaderElementStatic(
  props: SlateElementProps<TTableCellElement>
) {
  return <TableCellElementStatic {...props} isHeader />;
}
