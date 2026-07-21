'use client';

import { TablePlugin } from '@platejs/table/react';
import { KEYS } from 'platejs';
import { useEditorSelector } from 'platejs/react';

/** Shared table selection signals for coordinating floating toolbars. */
export function useTableSelectionState() {
  const isInTable = useEditorSelector(
    (editor) =>
      editor.api.some({ match: { type: editor.getType(KEYS.table) } }),
    []
  );

  const selectedCellCount = useEditorSelector(
    (editor) =>
      editor.getApi(TablePlugin).table.getSelectedCellIds()?.length ?? 0,
    []
  );

  const isCollapsed = useEditorSelector((editor) => editor.api.isCollapsed(), []);

  const isMultiCellSelection = selectedCellCount > 1;

  return {
    isCollapsed,
    isInTable,
    isMultiCellSelection,
    selectedCellCount,
    /** Text bubble menu yields to the multi-cell table toolbar. */
    shouldHideTextFloatingToolbar: isInTable && isMultiCellSelection,
    /** Table structure toolbar only when the caret sits in one cell. */
    shouldShowSingleCellTableToolbar: (
      isFocusedLast: boolean,
      isTableSelected: boolean
    ) =>
      isFocusedLast &&
      isTableSelected &&
      selectedCellCount === 0 &&
      isCollapsed,
  };
}
