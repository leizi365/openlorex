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

/** Uniform light gray for any cell that had a fill color in the editor. */
const DOCX_TABLE_FILL = '#E8E8E8';
/**
 * Table grid border for html-to-docx.
 * Use `pt` + named color so the parser gets a clean `single` stroke
 * (hex/rgb with spaces can break; HTML border=1 maps to an ultra-thin sz=1).
 */
const DOCX_TABLE_BORDER = '1pt solid black';

/**
 * DOCX table wrapper.
 * Borders must live ONLY on <table> with border-collapse.
 * Cell borders + table insideH/insideV stack into hollow double lines in Word.
 */
export function TableElementDocx({
  children,
  ...props
}: SlateElementProps<TTableElement>) {
  const { disableMarginLeft } = props.editor.getOptions(BaseTablePlugin);
  const marginLeft = disableMarginLeft ? 0 : props.element.marginLeft;

  return (
    <SlateElement {...props} style={{ paddingLeft: marginLeft }}>
      <table
        cellPadding={0}
        cellSpacing={0}
        style={{
          border: DOCX_TABLE_BORDER,
          borderCollapse: 'collapse',
          borderSpacing: 0,
          margin: '8pt 0',
          width: 'auto',
        }}
      >
        <tbody>{children}</tbody>
      </table>
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

/**
 * DOCX-compatible table cells.
 * - Any cell fill → uniform light gray
 * - No per-cell borders (table grid handles lines; avoids hollow double borders)
 */
export function TableCellElementDocx({
  isHeader,
  ...props
}: SlateElementProps<TTableCellElement> & {
  isHeader?: boolean;
}) {
  const { editor, element } = props;
  const { api } = editor.getPlugin(BaseTablePlugin);

  const { minHeight, width } = api.table.getCellSize({ element });
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

  const hasFill = Boolean(element.background);
  const backgroundColor = hasFill ? DOCX_TABLE_FILL : 'transparent';

  return (
    <SlateElement
      {...props}
      as={isHeader ? 'th' : 'td'}
      style={{
        background: backgroundColor,
        backgroundColor,
        // Must be 0 — any cell border stacks with table insideH/V and looks hollow.
        border: '0',
        borderBottom: '0',
        borderLeft: '0',
        borderRight: '0',
        borderTop: '0',
        color: '#37352f',
        padding: '4pt 7pt',
        textAlign: horizontalAlign,
        verticalAlign,
        width: width || 120,
      }}
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
      <div style={{ minHeight }}>{props.children}</div>
    </SlateElement>
  );
}

export function TableCellHeaderElementDocx(
  props: SlateElementProps<TTableCellElement>
) {
  return <TableCellElementDocx {...props} isHeader />;
}
