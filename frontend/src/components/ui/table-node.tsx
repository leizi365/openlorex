'use client';

import * as React from 'react';

import {
  BlockSelectionPlugin,
  useBlockSelected,
} from '@platejs/selection/react';
import { resizeLengthClampStatic } from '@platejs/resizable';
import {
  getTableColumnCount,
  setCellBackground,
  setTableColSize,
  setTableMarginLeft,
  setTableRowSize,
  getCellTypes,
} from '@platejs/table';
import {
  TablePlugin,
  TableProvider,
  roundCellSizeToStep,
  useCellIndices,
  useOverrideColSize,
  useOverrideMarginLeft,
  useOverrideRowSize,
  useTableCellBorders,
  useTableBordersDropdownMenuContentState,
  useTableColSizes,
  useTableElement,
  useTableMergeState,
  useTableSelectionDom,
  useTableValue,
} from '@platejs/table/react';
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignVerticalJustifyCenterIcon,
  AlignVerticalJustifyEndIcon,
  AlignVerticalJustifyStartIcon,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CombineIcon,
  EraserIcon,
  Grid2X2Icon,
  PaintBucketIcon,
  SquareSplitHorizontalIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import {
  type TTableCellElement,
  type TTableElement,
  type TTableRowElement,
  KEYS,
  PathApi,
} from 'platejs';
import {
  type PlateElementProps,
  PlateElement,
  useEditorPlugin,
  useEditorRef,
  useEditorSelector,
  useElement,
  useFocusedLast,
  usePluginOption,
  useReadOnly,
  useRemoveNodeButton,
  useSelected,
  withHOC,
} from 'platejs/react';
import { useElementSelector } from 'platejs/react';

import { useTableSelectionState } from '@/lib/use-table-selection-state';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { cn } from '@/app/api/ai/command/utils';

import { blockSelectionVariants } from './block-selection';
import {
  ColorDropdownMenuItems,
  DEFAULT_COLORS,
} from './font-color-toolbar-button';
import {
  BorderAllIcon,
  BorderBottomIcon,
  BorderLeftIcon,
  BorderNoneIcon,
  BorderRightIcon,
  BorderTopIcon,
} from './table-icons';
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarMenuGroup,
} from './toolbar';

type TableResizeDirection = 'bottom' | 'left' | 'right';

type TableResizeStartOptions = {
  colIndex: number;
  direction: TableResizeDirection;
  handleKey: string;
  rowIndex: number;
};

type TableResizeDragState = {
  colIndex: number;
  direction: TableResizeDirection;
  initialPosition: number;
  initialSize: number;
  marginLeft: number;
  rowIndex: number;
};

type TableResizeContextValue = {
  disableMarginLeft: boolean;
  clearResizePreview: (handleKey: string) => void;
  setResizePreview: (
    event: React.PointerEvent<HTMLDivElement>,
    options: TableResizeStartOptions
  ) => void;
  startResize: (
    event: React.PointerEvent<HTMLDivElement>,
    options: TableResizeStartOptions
  ) => void;
};


const TABLE_DEFAULT_COLUMN_WIDTH = 120;
const TABLE_DEFERRED_COLUMN_RESIZE_CELL_COUNT = 1200;
const TABLE_MULTI_SELECTION_TOOLBAR_DELAY_MS = 150;

type TableCellHorizontalAlign = 'left' | 'center' | 'right';
type TableCellVerticalAlign = 'top' | 'middle' | 'bottom';

type TableCellAlignElement = TTableCellElement & {
  align?: TableCellHorizontalAlign;
  verticalAlign?: TableCellVerticalAlign;
};

function getTableCellHorizontalAlign(
  element: TableCellAlignElement
): TableCellHorizontalAlign {
  if (
    element.align === 'center' ||
    element.align === 'right' ||
    element.align === 'left'
  ) {
    return element.align;
  }

  return 'left';
}

function getTableCellVerticalAlign(
  element: TableCellAlignElement
): TableCellVerticalAlign {
  if (
    element.verticalAlign === 'middle' ||
    element.verticalAlign === 'bottom' ||
    element.verticalAlign === 'top'
  ) {
    return element.verticalAlign;
  }

  return 'top';
}

function setCellAlignment(
  editor: ReturnType<typeof useEditorRef>,
  options: {
    align?: TableCellHorizontalAlign;
    selectedCells?: TTableCellElement[];
    verticalAlign?: TableCellVerticalAlign;
  }
) {
  const { align, selectedCells, verticalAlign } = options;
  const patch: Partial<TableCellAlignElement> = {};

  if (align !== undefined) patch.align = align;
  if (verticalAlign !== undefined) patch.verticalAlign = verticalAlign;
  if (Object.keys(patch).length === 0) return;

  if (selectedCells && selectedCells.length > 0) {
    selectedCells.forEach((cell) => {
      const cellPath = editor.api.findPath(cell);
      if (cellPath) editor.tf.setNodes(patch, { at: cellPath });
    });
    return;
  }

  const currentCell = editor.api.node({
    match: { type: getCellTypes(editor) },
  })?.[0] as TTableCellElement | undefined;

  if (currentCell) {
    const cellPath = editor.api.findPath(currentCell);
    if (cellPath) editor.tf.setNodes(patch, { at: cellPath });
  }
}

function getTableCellContentAlignStyle(element: TableCellAlignElement) {
  const horizontalAlign = getTableCellHorizontalAlign(element);
  const verticalAlign = getTableCellVerticalAlign(element);

  return {
    justifyContent:
      verticalAlign === 'middle'
        ? 'center'
        : verticalAlign === 'bottom'
          ? 'flex-end'
          : 'flex-start',
    textAlign: horizontalAlign,
  } as React.CSSProperties;
}

const TableResizeContext = React.createContext<TableResizeContextValue | null>(
  null
);

function useTableResizeContext() {
  const context = React.useContext(TableResizeContext);

  if (!context) {
    throw new Error('TableResizeContext is missing');
  }

  return context;
}

function useTableResizeController({
  deferColumnResize,
  dragIndicatorRef,
  hoverIndicatorRef,
  marginLeft,
  controlColumnWidth,
  tablePath,
  tableRef,
  wrapperRef,
}: {
  deferColumnResize: boolean;
  dragIndicatorRef: React.RefObject<HTMLDivElement | null>;
  hoverIndicatorRef: React.RefObject<HTMLDivElement | null>;
  marginLeft: number;
  controlColumnWidth: number;
  tablePath: number[];
  tableRef: React.RefObject<HTMLTableElement | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { editor, getOptions } = useEditorPlugin(TablePlugin);
  const { disableMarginLeft = false, minColumnWidth = 0 } = getOptions();
  const colSizes = useTableColSizes({
    disableOverrides: true,
  });
  const effectiveColSizes = React.useMemo(
    () => colSizes.map((colSize) => colSize || TABLE_DEFAULT_COLUMN_WIDTH),
    [colSizes]
  );
  const effectiveColSizesRef = React.useRef(effectiveColSizes);
  const activeHandleKeyRef = React.useRef<string | null>(null);
  const activeRowElementRef = React.useRef<HTMLTableRowElement | null>(null);
  const cleanupListenersRef = React.useRef<(() => void) | null>(null);
  const marginLeftRef = React.useRef(marginLeft);
  const dragStateRef = React.useRef<TableResizeDragState | null>(null);
  const frozenRowIndicesRef = React.useRef<number[] | null>(null);
  const previewHandleKeyRef = React.useRef<string | null>(null);
  const overrideColSize = useOverrideColSize();
  const overrideMarginLeft = useOverrideMarginLeft();
  const overrideRowSize = useOverrideRowSize();

  React.useEffect(() => {
    effectiveColSizesRef.current = effectiveColSizes;
  }, [effectiveColSizes]);

  React.useEffect(() => {
    marginLeftRef.current = marginLeft;
  }, [marginLeft]);

  const hideDeferredResizeIndicator = React.useCallback(() => {
    const indicator = dragIndicatorRef.current;

    if (!indicator) return;

    indicator.style.display = 'none';
    indicator.style.removeProperty('left');
  }, [dragIndicatorRef]);

  const showDeferredResizeIndicator = React.useCallback(
    (offset: number) => {
      const indicator = dragIndicatorRef.current;

      if (!indicator) return;

      indicator.style.display = 'block';
      indicator.style.left = `${offset}px`;
    },
    [dragIndicatorRef]
  );

  const hideResizeIndicator = React.useCallback(() => {
    const indicator = hoverIndicatorRef.current;

    if (!indicator) return;

    indicator.style.display = 'none';
    indicator.style.removeProperty('left');
  }, [hoverIndicatorRef]);

  const clearFrozenRowHeights = React.useCallback(() => {
    const frozenRowIndices = frozenRowIndicesRef.current;

    if (!frozenRowIndices) return;

    frozenRowIndicesRef.current = null;

    frozenRowIndices.forEach((rowIndex) => {
      overrideRowSize(rowIndex, null);
    });
  }, [overrideRowSize]);

  const freezeRowHeights = React.useCallback(() => {
    const table = tableRef.current;

    if (!table || deferColumnResize) return;

    clearFrozenRowHeights();

    const frozenRowIndices: number[] = [];

    Array.from(table.rows).forEach((row, rowIndex) => {
      const height = row.getBoundingClientRect().height;

      if (!height) return;

      overrideRowSize(rowIndex, height);
      frozenRowIndices.push(rowIndex);
    });

    frozenRowIndicesRef.current = frozenRowIndices;
  }, [clearFrozenRowHeights, deferColumnResize, overrideRowSize, tableRef]);

  const showResizeIndicatorAtOffset = React.useCallback(
    (offset: number) => {
      const indicator = hoverIndicatorRef.current;

      if (!indicator) return;

      indicator.style.display = 'block';
      indicator.style.left = `${offset}px`;
    },
    [hoverIndicatorRef]
  );

  const showResizeIndicator = React.useCallback(
    ({
      event,
      direction,
    }: Pick<TableResizeStartOptions, 'direction'> & {
      event: React.PointerEvent<HTMLDivElement>;
    }) => {
      if (direction === 'bottom') return;

      const wrapper = wrapperRef.current;

      if (!wrapper) return;

      const handleRect = event.currentTarget.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const boundaryOffset =
        handleRect.left - wrapperRect.left + handleRect.width / 2;

      showResizeIndicatorAtOffset(boundaryOffset);
    },
    [showResizeIndicatorAtOffset, wrapperRef]
  );

  const setResizePreview = React.useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      options: TableResizeStartOptions
    ) => {
      if (activeHandleKeyRef.current) return;

      previewHandleKeyRef.current = options.handleKey;
      showResizeIndicator({ ...options, event });
    },
    [showResizeIndicator]
  );

  const clearResizePreview = React.useCallback(
    (handleKey: string) => {
      if (activeHandleKeyRef.current) return;
      if (previewHandleKeyRef.current !== handleKey) return;

      previewHandleKeyRef.current = null;
      hideResizeIndicator();
    },
    [hideResizeIndicator]
  );

  const commitColSize = React.useCallback(
    (colIndex: number, width: number) => {
      setTableColSize(editor, { colIndex, width }, { at: tablePath });
      setTimeout(() => overrideColSize(colIndex, null), 0);
    },
    [editor, overrideColSize, tablePath]
  );

  const commitRowSize = React.useCallback(
    (rowIndex: number, height: number) => {
      setTableRowSize(editor, { height, rowIndex }, { at: tablePath });
      setTimeout(() => overrideRowSize(rowIndex, null), 0);
    },
    [editor, overrideRowSize, tablePath]
  );

  const commitMarginLeft = React.useCallback(
    (nextMarginLeft: number) => {
      setTableMarginLeft(
        editor,
        { marginLeft: nextMarginLeft },
        { at: tablePath }
      );
      setTimeout(() => overrideMarginLeft(null), 0);
    },
    [editor, overrideMarginLeft, tablePath]
  );

  const getColumnBoundaryOffset = React.useCallback(
    (colIndex: number, currentWidth: number) =>
      controlColumnWidth +
      effectiveColSizesRef.current
        .slice(0, colIndex)
        .reduce((total, colSize) => total + colSize, 0) +
      currentWidth,
    [controlColumnWidth]
  );

  const applyResize = React.useCallback(
    (event: PointerEvent, finished: boolean) => {
      const dragState = dragStateRef.current;

      if (!dragState) return;

      const currentPosition =
        dragState.direction === 'bottom' ? event.clientY : event.clientX;
      const delta = currentPosition - dragState.initialPosition;

      if (dragState.direction === 'bottom') {
        const newHeight = roundCellSizeToStep(
          dragState.initialSize + delta,
          undefined
        );

        if (finished) {
          commitRowSize(dragState.rowIndex, newHeight);
        } else {
          overrideRowSize(dragState.rowIndex, newHeight);
        }

        return;
      }

      if (dragState.direction === 'left') {
        const initial =
          effectiveColSizesRef.current[dragState.colIndex] ??
          dragState.initialSize;
        const complement = (width: number) =>
          initial + dragState.marginLeft - width;
        const nextMarginLeft = roundCellSizeToStep(
          resizeLengthClampStatic(dragState.marginLeft + delta, {
            max: complement(minColumnWidth),
            min: 0,
          }),
          undefined
        );
        const nextWidth = complement(nextMarginLeft);

        if (finished) {
          commitMarginLeft(nextMarginLeft);
          commitColSize(dragState.colIndex, nextWidth);
        } else if (deferColumnResize) {
          showDeferredResizeIndicator(
            controlColumnWidth + (nextMarginLeft - dragState.marginLeft)
          );
        } else {
          showResizeIndicatorAtOffset(
            controlColumnWidth + (nextMarginLeft - dragState.marginLeft)
          );
          overrideMarginLeft(nextMarginLeft);
          overrideColSize(dragState.colIndex, nextWidth);
        }

        return;
      }

      const currentInitial =
        effectiveColSizesRef.current[dragState.colIndex] ??
        dragState.initialSize;
      const nextInitial = effectiveColSizesRef.current[dragState.colIndex + 1];
      const complement = (width: number) =>
        currentInitial + nextInitial - width;
      const currentWidth = roundCellSizeToStep(
        resizeLengthClampStatic(currentInitial + delta, {
          max: nextInitial ? complement(minColumnWidth) : undefined,
          min: minColumnWidth,
        }),
        undefined
      );
      const nextWidth = nextInitial ? complement(currentWidth) : undefined;

      if (finished) {
        commitColSize(dragState.colIndex, currentWidth);

        if (nextWidth !== undefined) {
          commitColSize(dragState.colIndex + 1, nextWidth);
        }
      } else if (deferColumnResize) {
        showDeferredResizeIndicator(
          getColumnBoundaryOffset(dragState.colIndex, currentWidth)
        );
      } else {
        showResizeIndicatorAtOffset(
          getColumnBoundaryOffset(dragState.colIndex, currentWidth)
        );
        overrideColSize(dragState.colIndex, currentWidth);

        if (nextWidth !== undefined) {
          overrideColSize(dragState.colIndex + 1, nextWidth);
        }
      }
    },
    [
      commitColSize,
      commitMarginLeft,
      commitRowSize,
      controlColumnWidth,
      deferColumnResize,
      getColumnBoundaryOffset,
      showDeferredResizeIndicator,
      showResizeIndicatorAtOffset,
      minColumnWidth,
      overrideColSize,
      overrideMarginLeft,
      overrideRowSize,
    ]
  );

  const stopResize = React.useCallback(() => {
    cleanupListenersRef.current?.();
    cleanupListenersRef.current = null;
    activeHandleKeyRef.current = null;
    previewHandleKeyRef.current = null;
    dragStateRef.current = null;

    if (activeRowElementRef.current) {
      delete activeRowElementRef.current.dataset.tableResizing;
      activeRowElementRef.current = null;
    }

    hideDeferredResizeIndicator();
    hideResizeIndicator();
    clearFrozenRowHeights();
  }, [clearFrozenRowHeights, hideDeferredResizeIndicator, hideResizeIndicator]);

  React.useEffect(() => stopResize, [stopResize]);

  const startResize = React.useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      { colIndex, direction, handleKey, rowIndex }: TableResizeStartOptions
    ) => {
      const rowHeight =
        tableRef.current?.rows.item(rowIndex)?.getBoundingClientRect().height ??
        0;

      dragStateRef.current = {
        colIndex,
        direction,
        initialPosition: direction === 'bottom' ? event.clientY : event.clientX,
        initialSize:
          direction === 'bottom'
            ? rowHeight
            : (effectiveColSizesRef.current[colIndex] ??
              TABLE_DEFAULT_COLUMN_WIDTH),
        marginLeft: marginLeftRef.current,
        rowIndex,
      };
      activeHandleKeyRef.current = handleKey;
      previewHandleKeyRef.current = null;

      const rowElement = tableRef.current?.rows.item(rowIndex) ?? null;

      if (
        activeRowElementRef.current &&
        activeRowElementRef.current !== rowElement
      ) {
        delete activeRowElementRef.current.dataset.tableResizing;
      }

      activeRowElementRef.current = rowElement;

      if (rowElement) {
        rowElement.dataset.tableResizing = 'true';
      }

      cleanupListenersRef.current?.();

      if (direction !== 'bottom') {
        freezeRowHeights();
      }

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        applyResize(pointerEvent, false);
      };

      const handlePointerEnd = (pointerEvent: PointerEvent) => {
        applyResize(pointerEvent, true);
        stopResize();
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);

      cleanupListenersRef.current = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
      };

      if (deferColumnResize && direction !== 'bottom') {
        hideResizeIndicator();
        showDeferredResizeIndicator(
          direction === 'left'
            ? controlColumnWidth
            : getColumnBoundaryOffset(
                colIndex,
                effectiveColSizesRef.current[colIndex] ??
                  TABLE_DEFAULT_COLUMN_WIDTH
              )
        );
      } else {
        showResizeIndicator({ direction, event });
      }

      event.preventDefault();
      event.stopPropagation();
    },
    [
      controlColumnWidth,
      deferColumnResize,
      getColumnBoundaryOffset,
      hideResizeIndicator,
      showDeferredResizeIndicator,
      showResizeIndicator,
      stopResize,
      tableRef,
      applyResize,
      freezeRowHeights,
    ]
  );

  return React.useMemo(
    () => ({
      clearResizePreview,
      disableMarginLeft,
      setResizePreview,
      startResize,
    }),
    [clearResizePreview, disableMarginLeft, setResizePreview, startResize]
  );
}

export const TableElement = withHOC(
  TableProvider,
  function TableElement({
    children,
    ...props
  }: PlateElementProps<TTableElement>) {
    const readOnly = useReadOnly();
    const editor = useEditorRef();
    const { marginLeft, props: tableProps } = useTableElement();
    const colSizes = useTableColSizes();
    const controlColumnWidth = 0;
    const dragIndicatorRef = React.useRef<HTMLDivElement>(null);
    const hoverIndicatorRef = React.useRef<HTMLDivElement>(null);
    const columnCount = getTableColumnCount(props.element);
    const deferColumnResize =
      columnCount * props.element.children.length >
      TABLE_DEFERRED_COLUMN_RESIZE_CELL_COUNT;
    const tablePath = useElementSelector(([, path]) => path, [], {
      key: KEYS.table,
    });
    const tableRef = React.useRef<HTMLTableElement>(null);
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    useTableSelectionDom(tableRef);
    const resizeController = useTableResizeController({
      controlColumnWidth,
      deferColumnResize,
      dragIndicatorRef,
      hoverIndicatorRef,
      marginLeft,
      tablePath,
      tableRef,
      wrapperRef,
    });
    const resolvedColSizes = React.useMemo(() => {
      const fallback = Array.from(
        { length: columnCount },
        () => TABLE_DEFAULT_COLUMN_WIDTH
      );

      if (columnCount <= 0) {
        return [];
      }

      if (colSizes.length === 0) {
        return fallback;
      }

      const normalized = colSizes.map(
        (colSize) => colSize || TABLE_DEFAULT_COLUMN_WIDTH
      );

      if (normalized.length === columnCount) {
        return normalized;
      }

      if (normalized.length > columnCount) {
        return normalized.slice(0, columnCount);
      }

      return [
        ...normalized,
        ...fallback.slice(normalized.length),
      ];
    }, [colSizes, columnCount]);

    React.useEffect(() => {
      if (readOnly) return;

      const storedColSizes = props.element.colSizes;
      if (!storedColSizes || storedColSizes.length <= columnCount) return;
      if (columnCount <= 0) return;

      editor.tf.setNodes(
        { colSizes: storedColSizes.slice(0, columnCount) },
        { at: tablePath }
      );
    }, [
      columnCount,
      editor,
      props.element.colSizes,
      readOnly,
      tablePath,
    ]);
    const tableVariableStyle = React.useMemo(() => {
      if (resolvedColSizes.length === 0) {
        return;
      }

      return {
        ...Object.fromEntries(
          resolvedColSizes.map((colSize, index) => [
            `--table-col-${index}`,
            `${colSize}px`,
          ])
        ),
      } as React.CSSProperties;
    }, [resolvedColSizes]);
    const tableStyle = React.useMemo(
      () =>
        ({
          width: `${
            resolvedColSizes.reduce((total, colSize) => total + colSize, 0) +
            controlColumnWidth
          }px`,
        }) as React.CSSProperties,
      [controlColumnWidth, resolvedColSizes]
    );

    const isSelectingTable = useBlockSelected(props.element.id as string);

    const content = (
      <PlateElement
        {...props}
        className={cn(
          'wiki-table-block min-w-0 max-w-full overflow-x-auto overflow-y-visible py-0'
        )}
        style={{ paddingLeft: marginLeft }}
      >
        <TableResizeContext.Provider value={resizeController}>
          <div
            ref={wrapperRef}
            className="group/table relative w-max"
            style={tableVariableStyle}
          >
            <div
              ref={dragIndicatorRef}
              className="-translate-x-[1.5px] pointer-events-none absolute inset-y-0 z-36 hidden w-[3px] bg-ring/70"
              contentEditable={false}
            />
            <div
              ref={hoverIndicatorRef}
              className="-translate-x-[1.5px] pointer-events-none absolute inset-y-0 z-35 hidden w-[3px] bg-ring/80"
              contentEditable={false}
            />
            <table
              ref={tableRef}
              className={cn(
                'mr-0 ml-0 table h-px w-auto table-fixed border-collapse',
                'data-[table-selecting=true]:[&_*::selection]:!bg-transparent',
                'data-[table-selecting=true]:[&_*::selection]:!text-inherit',
                'data-[table-selecting=true]:[&_*::-moz-selection]:!bg-transparent',
                'data-[table-selecting=true]:[&_*::-moz-selection]:!text-inherit',
                'data-[table-selecting=true]:[&_*]:!caret-transparent'
              )}
              style={tableStyle}
              {...tableProps}
            >
              {resolvedColSizes.length > 0 && (
                <colgroup>
                  {resolvedColSizes.map((colSize, index) => (
                    <col
                      key={index}
                      style={{
                        width: colSize,
                      }}
                    />
                  ))}
                </colgroup>
              )}
              <tbody>{children}</tbody>
            </table>

            {isSelectingTable && (
              <div
                className={blockSelectionVariants()}
                contentEditable={false}
              />
            )}
          </div>
        </TableResizeContext.Provider>
      </PlateElement>
    );

    if (readOnly) {
      return content;
    }

    return <TableFloatingToolbar>{content}</TableFloatingToolbar>;
  }
);

function TableFloatingToolbar({
  children,
  ...props
}: React.ComponentProps<typeof PopoverContent>) {
  const { shouldShowSingleCellTableToolbar } = useTableSelectionState();
  const element = useElement<TTableElement>();
  const selectedCellCountInTable = useEditorSelector((editor) => {
    const selectedCells =
      editor.getApi(TablePlugin).table.getSelectedCells() ?? [];

    if (selectedCells.length === 0) return 0;

    const tablePath = editor.api.findPath(element);
    if (!tablePath) return 0;

    let count = 0;
    for (const cell of selectedCells) {
      const cellPath = editor.api.findPath(cell);
      if (cellPath && PathApi.isAncestor(tablePath, cellPath)) {
        count += 1;
      }
    }

    return count;
  }, [element]);
  const selected = useSelected();
  const isFocusedLast = useFocusedLast();
  const [isExpandedSelectionToolbarReady, setIsExpandedSelectionToolbarReady] =
    React.useState(false);
  const isSingleCellToolbarOpen = shouldShowSingleCellTableToolbar(
    isFocusedLast,
    selected
  );
  const isExpandedSelectionPending =
    isFocusedLast && selectedCellCountInTable > 1;

  React.useEffect(() => {
    if (!isExpandedSelectionPending) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset the delayed toolbar gate when selection is no longer expanded.
      setIsExpandedSelectionToolbarReady(false);

      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsExpandedSelectionToolbarReady(true);
    }, TABLE_MULTI_SELECTION_TOOLBAR_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isExpandedSelectionPending]);

  const shouldRenderExpandedSelectionToolbar =
    isExpandedSelectionToolbarReady && isExpandedSelectionPending;
  // Never show single-cell and multi-cell toolbars together.
  const isToolbarOpen =
    (isSingleCellToolbarOpen && !isExpandedSelectionPending) ||
    shouldRenderExpandedSelectionToolbar;

  return (
    <Popover open={isToolbarOpen} modal={false}>
      <PopoverAnchor className="block max-w-full">{children}</PopoverAnchor>
      {isToolbarOpen ? (
        isSingleCellToolbarOpen && !isExpandedSelectionPending ? (
          <SingleCellTableFloatingToolbarContent key="single" {...props} />
        ) : shouldRenderExpandedSelectionToolbar ? (
          <ExpandedSelectionTableFloatingToolbarContent
            key="multi"
            {...props}
          />
        ) : null
      ) : null}
    </Popover>
  );
}

function ExpandedSelectionTableFloatingToolbarContent(
  props: React.ComponentProps<typeof PopoverContent>
) {
  const { tf } = useEditorPlugin(TablePlugin);
  const { canMerge, canSplit } = useTableMergeState();

  return (
    <TableFloatingToolbarContent
      canMerge={canMerge}
      canSplit={canSplit}
      onMerge={canMerge ? () => tf.table.merge() : undefined}
      onSplit={canSplit ? () => tf.table.split() : undefined}
      {...props}
    />
  );
}

function SingleCellTableFloatingToolbarContent(
  props: React.ComponentProps<typeof PopoverContent>
) {
  const { tf } = useEditorPlugin(TablePlugin);
  const element = useElement<TTableElement>();
  const { props: buttonProps } = useRemoveNodeButton({ element });
  const { canSplit } = useTableMergeState();

  return (
    <TableFloatingToolbarContent
      buttonProps={buttonProps}
      canSplit={canSplit}
      singleCellMode
      onDeleteColumn={() => {
        tf.remove.tableColumn();
      }}
      onDeleteRow={() => {
        tf.remove.tableRow();
      }}
      onInsertColumnAfter={() => {
        tf.insert.tableColumn();
      }}
      onInsertColumnBefore={() => {
        tf.insert.tableColumn({ before: true });
      }}
      onInsertRowAfter={() => {
        tf.insert.tableRow();
      }}
      onInsertRowBefore={() => {
        tf.insert.tableRow({ before: true });
      }}
      onSplit={() => tf.table.split()}
      {...props}
    />
  );
}

function TableFloatingToolbarContent({
  buttonProps,
  canMerge = false,
  canSplit = false,
  singleCellMode = false,
  onDeleteColumn,
  onDeleteRow,
  onInsertColumnAfter,
  onInsertColumnBefore,
  onInsertRowAfter,
  onInsertRowBefore,
  onMerge,
  onSplit,
  ...props
}: React.ComponentProps<typeof PopoverContent> & {
  buttonProps?: React.ComponentProps<typeof ToolbarButton>;
  canMerge?: boolean;
  canSplit?: boolean;
  singleCellMode?: boolean;
  onDeleteColumn?: () => void;
  onDeleteRow?: () => void;
  onInsertColumnAfter?: () => void;
  onInsertColumnBefore?: () => void;
  onInsertRowAfter?: () => void;
  onInsertRowBefore?: () => void;
  onMerge?: () => void;
  onSplit?: () => void;
}) {
  return (
    <PopoverContent
      onOpenAutoFocus={(e) => e.preventDefault()}
      contentEditable={false}
      side="top"
      sideOffset={8}
      align="center"
      className="w-auto max-w-[min(100vw-24px,560px)] border-0 bg-transparent p-0 shadow-none"
      {...props}
    >
      <Toolbar
        contentEditable={false}
        className="scrollbar-hide flex w-auto max-w-[min(100vw-24px,560px)] flex-row overflow-x-auto rounded-[6px] border border-[rgba(55,53,47,0.09)] bg-white p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.02)] print:hidden"
      >
        <ToolbarGroup>
          <ColorDropdownMenu tooltip="背景色">
            <PaintBucketIcon />
          </ColorDropdownMenu>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              render={<ToolbarButton tooltip="单元格边框" />}
            >
              <Grid2X2Icon />
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <TableBordersDropdownMenuContent />
            </DropdownMenuPortal>
          </DropdownMenu>

          <TableCellHorizontalAlignMenu />
          <TableCellVerticalAlignMenu />

          {canMerge && onMerge ? (
            <ToolbarButton
              onClick={onMerge}
              onMouseDown={(e) => e.preventDefault()}
              tooltip="合并单元格"
            >
              <CombineIcon />
            </ToolbarButton>
          ) : null}

          {canSplit && onSplit ? (
            <ToolbarButton
              onClick={onSplit}
              onMouseDown={(e) => e.preventDefault()}
              tooltip="拆分单元格"
            >
              <SquareSplitHorizontalIcon />
            </ToolbarButton>
          ) : null}
        </ToolbarGroup>

        {singleCellMode ? (
          <ToolbarGroup>
            <ToolbarButton
              onClick={onInsertRowBefore}
              onMouseDown={(e) => e.preventDefault()}
              tooltip="在上方插入行"
            >
              <ArrowUp />
            </ToolbarButton>
            <ToolbarButton
              onClick={onInsertRowAfter}
              onMouseDown={(e) => e.preventDefault()}
              tooltip="在下方插入行"
            >
              <ArrowDown />
            </ToolbarButton>
            <ToolbarButton
              onClick={onDeleteRow}
              onMouseDown={(e) => e.preventDefault()}
              tooltip="删除行"
            >
              <XIcon />
            </ToolbarButton>
          </ToolbarGroup>
        ) : null}

        {singleCellMode ? (
          <ToolbarGroup>
            <ToolbarButton
              onClick={onInsertColumnBefore}
              onMouseDown={(e) => e.preventDefault()}
              tooltip="在左侧插入列"
            >
              <ArrowLeft />
            </ToolbarButton>
            <ToolbarButton
              onClick={onInsertColumnAfter}
              onMouseDown={(e) => e.preventDefault()}
              tooltip="在右侧插入列"
            >
              <ArrowRight />
            </ToolbarButton>
            <ToolbarButton
              onClick={onDeleteColumn}
              onMouseDown={(e) => e.preventDefault()}
              tooltip="删除列"
            >
              <XIcon />
            </ToolbarButton>
          </ToolbarGroup>
        ) : null}

        {singleCellMode ? (
          <ToolbarGroup>
            <ToolbarButton tooltip="删除表格" {...buttonProps}>
              <Trash2Icon />
            </ToolbarButton>
          </ToolbarGroup>
        ) : null}
      </Toolbar>
    </PopoverContent>
  );
}

function TableBordersDropdownMenuContent(
  props: React.ComponentProps<typeof DropdownMenuContent>
) {
  const editor = useEditorRef();
  const {
    getOnSelectTableBorder,
    hasBottomBorder,
    hasLeftBorder,
    hasNoBorders,
    hasOuterBorders,
    hasRightBorder,
    hasTopBorder,
  } = useTableBordersDropdownMenuContentState();

  return (
    <DropdownMenuContent
      className="min-w-[220px]"
      onCloseAutoFocus={(e) => {
        e.preventDefault();
        editor.tf.focus();
      }}
      align="start"
      side="bottom"
      sideOffset={4}
      {...props}
    >
      <DropdownMenuGroup>
        <DropdownMenuCheckboxItem
          checked={hasTopBorder}
          onCheckedChange={getOnSelectTableBorder('top')}
        >
          <BorderTopIcon />
          <div>上边框</div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={hasRightBorder}
          onCheckedChange={getOnSelectTableBorder('right')}
        >
          <BorderRightIcon />
          <div>右边框</div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={hasBottomBorder}
          onCheckedChange={getOnSelectTableBorder('bottom')}
        >
          <BorderBottomIcon />
          <div>下边框</div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={hasLeftBorder}
          onCheckedChange={getOnSelectTableBorder('left')}
        >
          <BorderLeftIcon />
          <div>左边框</div>
        </DropdownMenuCheckboxItem>
      </DropdownMenuGroup>

      <DropdownMenuGroup>
        <DropdownMenuCheckboxItem
          checked={hasNoBorders}
          onCheckedChange={getOnSelectTableBorder('none')}
        >
          <BorderNoneIcon />
          <div>无边框</div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={hasOuterBorders}
          onCheckedChange={getOnSelectTableBorder('outer')}
        >
          <BorderAllIcon />
          <div>外边框</div>
        </DropdownMenuCheckboxItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  );
}

function ColorDropdownMenu({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip: string;
}) {
  const [open, setOpen] = React.useState(false);

  const editor = useEditorRef();

  const onUpdateColor = React.useCallback(
    (color: string) => {
      setOpen(false);
      setCellBackground(editor, {
        color,
        selectedCells:
          editor.getApi(TablePlugin).table.getSelectedCells() ?? [],
      });
    },
    [editor]
  );

  const onClearColor = React.useCallback(() => {
    setOpen(false);
    setCellBackground(editor, {
      color: null,
      selectedCells: editor.getApi(TablePlugin).table.getSelectedCells() ?? [],
    });
  }, [editor]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger render={<ToolbarButton tooltip={tooltip} />}>{children}</DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <ToolbarMenuGroup label="颜色">
          <ColorDropdownMenuItems
            className="px-2"
            colors={DEFAULT_COLORS}
            updateColor={onUpdateColor}
          />
        </ToolbarMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem className="p-2" onClick={onClearColor}>
            <EraserIcon />
            <span>清除</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const horizontalAlignItems: {
  icon: typeof AlignLeftIcon;
  label: string;
  value: TableCellHorizontalAlign;
}[] = [
  { icon: AlignLeftIcon, label: '左对齐', value: 'left' },
  { icon: AlignCenterIcon, label: '水平居中', value: 'center' },
  { icon: AlignRightIcon, label: '右对齐', value: 'right' },
];

const verticalAlignItems: {
  icon: typeof AlignVerticalJustifyStartIcon;
  label: string;
  value: TableCellVerticalAlign;
}[] = [
  { icon: AlignVerticalJustifyStartIcon, label: '顶端对齐', value: 'top' },
  {
    icon: AlignVerticalJustifyCenterIcon,
    label: '垂直居中',
    value: 'middle',
  },
  { icon: AlignVerticalJustifyEndIcon, label: '底端对齐', value: 'bottom' },
];

function TableCellHorizontalAlignMenu() {
  const [open, setOpen] = React.useState(false);
  const editor = useEditorRef();
  const element = useElement<TableCellAlignElement>();
  const value = getTableCellHorizontalAlign(element);
  const Icon =
    horizontalAlignItems.find((item) => item.value === value)?.icon ??
    AlignLeftIcon;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        render={
          <ToolbarButton tooltip="水平对齐" isDropdown pressed={open} />
        }
      >
        <Icon />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-0" align="start">
        {horizontalAlignItems.map(({ icon: ItemIcon, label, value: itemValue }) => (
          <DropdownMenuItem
            key={itemValue}
            className="gap-2"
            onClick={() => {
              setCellAlignment(editor, {
                align: itemValue,
                selectedCells:
                  editor.getApi(TablePlugin).table.getSelectedCells() ?? [],
              });
              setOpen(false);
            }}
          >
            <ItemIcon />
            <span>{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableCellVerticalAlignMenu() {
  const [open, setOpen] = React.useState(false);
  const editor = useEditorRef();
  const element = useElement<TableCellAlignElement>();
  const value = getTableCellVerticalAlign(element);
  const Icon =
    verticalAlignItems.find((item) => item.value === value)?.icon ??
    AlignVerticalJustifyStartIcon;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        render={
          <ToolbarButton tooltip="垂直对齐" isDropdown pressed={open} />
        }
      >
        <Icon />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-0" align="start">
        {verticalAlignItems.map(({ icon: ItemIcon, label, value: itemValue }) => (
          <DropdownMenuItem
            key={itemValue}
            className="gap-2"
            onClick={() => {
              setCellAlignment(editor, {
                selectedCells:
                  editor.getApi(TablePlugin).table.getSelectedCells() ?? [],
                verticalAlign: itemValue,
              });
              setOpen(false);
            }}
          >
            <ItemIcon />
            <span>{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TableRowElement({
  children,
  ...props
}: PlateElementProps<TTableRowElement>) {
  const rowIndex = useElementSelector(([, path]) => path.at(-1) as number, [], {
    key: KEYS.tr,
  });
  const rowSize = useElementSelector(
    ([node]) => (node as TTableRowElement).size,
    [],
    {
      key: KEYS.tr,
    }
  );
  const rowSizeOverrides = useTableValue('rowSizeOverrides');
  const rowMinHeight = rowSizeOverrides.get?.(rowIndex) ?? rowSize;

  return (
    <PlateElement
      {...props}
      as="tr"
      className="group/row"
      style={
        {
          ...props.style,
          '--tableRowMinHeight': rowMinHeight ? `${rowMinHeight}px` : undefined,
        } as React.CSSProperties
      }
    >
      {children}
    </PlateElement>
  );
}

function useTableCellPresentation(element: TTableCellElement) {
  const { api } = useEditorPlugin(TablePlugin);
  const borders = useTableCellBorders({ element });
  const { col, row } = useCellIndices();

  const colSpan = api.table.getColSpan(element);
  const rowSpan = api.table.getRowSpan(element);
  const width = React.useMemo(() => {
    const terms = Array.from(
      { length: colSpan },
      (_, offset) => `var(--table-col-${col + offset}, 120px)`
    );

    return terms.length === 1 ? terms[0]! : `calc(${terms.join(' + ')})`;
  }, [col, colSpan]);

  return {
    borders,
    colIndex: col + colSpan - 1,
    colSpan,
    rowIndex: row + rowSpan - 1,
    rowSpan,
    width,
  };
}

export function TableCellElement({
  isHeader,
  ...props
}: PlateElementProps<TTableCellElement> & {
  isHeader?: boolean;
}) {
  const readOnly = useReadOnly();
  const element = props.element;

  const tableId = useElementSelector(([node]) => node.id as string, [], {
    key: KEYS.table,
  });
  const rowId = useElementSelector(([node]) => node.id as string, [], {
    key: KEYS.tr,
  });
  const isSelectingTable = useBlockSelected(tableId);
  const isSelectingRow = useBlockSelected(rowId) || isSelectingTable;
  const isSelectionAreaVisible = usePluginOption(
    BlockSelectionPlugin,
    'isSelectionAreaVisible'
  );

  const { borders, colIndex, colSpan, rowIndex, rowSpan, width } =
    useTableCellPresentation(element);
  const alignElement = element as TableCellAlignElement;
  const contentAlignStyle = getTableCellContentAlignStyle(alignElement);
  const {
    colspan: _colspan,
    rowspan: _rowspan,
    ...cellAttributes
  } = (props.attributes ?? {}) as Record<string, unknown>;

  return (
    <PlateElement
      {...props}
      as={isHeader ? 'th' : 'td'}
      className={cn(
        'relative h-full overflow-hidden border-none bg-background p-0',
        element.background ? 'bg-(--cellBackground)' : 'bg-background',
        // Override UA th { text-align: center } so pasted headers line up with body cells.
        isHeader && 'text-left font-normal *:m-0',
        'before:size-full',
        'data-[table-cell-selected=true]:before:z-10',
        'data-[table-cell-selected=true]:before:bg-brand/5',
        "before:absolute before:box-border before:select-none before:content-['']",
        borders.bottom?.size && 'before:border-b before:border-b-border',
        borders.right?.size && 'before:border-r before:border-r-border',
        borders.left?.size && 'before:border-l before:border-l-border',
        borders.top?.size && 'before:border-t before:border-t-border'
      )}
      style={
        {
          '--cellBackground': element.background,
          // Prefer min/max over width so colgroup stays authoritative (avoids th/td drift).
          maxWidth: width,
          minWidth: width,
          verticalAlign: getTableCellVerticalAlign(alignElement),
        } as React.CSSProperties
      }
      attributes={{
        ...cellAttributes,
        colSpan,
        'data-table-cell-id': element.id,
        rowSpan,
      }}
    >
      <div
        className="relative z-20 box-border flex h-full flex-col px-2.5 py-0"
        style={
          {
            ...(rowSpan === 1
              ? { minHeight: 'var(--tableRowMinHeight, 0px)' }
              : undefined),
            ...contentAlignStyle,
          } as React.CSSProperties
        }
      >
        {props.children}
      </div>

      {!readOnly && !isSelectionAreaVisible && (
        <TableCellResizeControls colIndex={colIndex} rowIndex={rowIndex} />
      )}

      {isSelectingRow && (
        <div className={blockSelectionVariants()} contentEditable={false} />
      )}
    </PlateElement>
  );
}

export function TableCellHeaderElement(
  props: React.ComponentProps<typeof TableCellElement>
) {
  return <TableCellElement {...props} isHeader />;
}

const TableCellResizeControls = React.memo(function TableCellResizeControls({
  colIndex,
  rowIndex,
}: {
  colIndex: number;
  rowIndex: number;
}) {
  const {
    clearResizePreview,
    disableMarginLeft,
    setResizePreview,
    startResize,
  } = useTableResizeContext();
  const rightHandleKey = `right:${rowIndex}:${colIndex}`;
  const bottomHandleKey = `bottom:${rowIndex}:${colIndex}`;
  const leftHandleKey = `left:${rowIndex}:${colIndex}`;
  const isLeftHandle = colIndex === 0 && !disableMarginLeft;

  return (
    <div
      className="group/resize pointer-events-none absolute inset-0 z-30 select-none"
      contentEditable={false}
      suppressContentEditableWarning={true}
    >
      <div
        className="pointer-events-auto absolute top-0 right-0 z-40 h-full w-1.5 cursor-col-resize touch-none"
        onPointerEnter={(event) => {
          setResizePreview(event, {
            colIndex,
            direction: 'right',
            handleKey: rightHandleKey,
            rowIndex,
          });
        }}
        onPointerLeave={() => {
          clearResizePreview(rightHandleKey);
        }}
        onPointerDown={(event) => {
          startResize(event, {
            colIndex,
            direction: 'right',
            handleKey: rightHandleKey,
            rowIndex,
          });
        }}
      />
      <div
        className="pointer-events-auto absolute bottom-0 left-0 z-40 h-1.5 w-full cursor-row-resize touch-none"
        onPointerEnter={(event) => {
          setResizePreview(event, {
            colIndex,
            direction: 'bottom',
            handleKey: bottomHandleKey,
            rowIndex,
          });
        }}
        onPointerLeave={() => {
          clearResizePreview(bottomHandleKey);
        }}
        onPointerDown={(event) => {
          startResize(event, {
            colIndex,
            direction: 'bottom',
            handleKey: bottomHandleKey,
            rowIndex,
          });
        }}
      />
      {isLeftHandle && (
        <div
          className="pointer-events-auto absolute top-0 left-0 z-40 h-full w-1.5 cursor-col-resize touch-none"
          onPointerEnter={(event) => {
            setResizePreview(event, {
              colIndex,
              direction: 'left',
              handleKey: leftHandleKey,
              rowIndex,
            });
          }}
          onPointerLeave={() => {
            clearResizePreview(leftHandleKey);
          }}
          onPointerDown={(event) => {
            startResize(event, {
              colIndex,
              direction: 'left',
              handleKey: leftHandleKey,
              rowIndex,
            });
          }}
        />
      )}
    </div>
  );
});

TableCellResizeControls.displayName = 'TableCellResizeControls';
