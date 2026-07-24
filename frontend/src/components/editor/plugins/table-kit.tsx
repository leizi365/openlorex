'use client';

import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from '@platejs/table/react';

import {
  TableCellElement,
  TableCellHeaderElement,
  TableElement,
  TableRowElement,
} from '@/components/ui/table-node';

export const TableKit = [
  TablePlugin.configure({
    options: {
      // Ensures pasted tables get explicit colSizes so header/body columns stay aligned.
      initialTableWidth: 720,
      minColumnWidth: 48,
    },
  }).withComponent(TableElement),
  TableRowPlugin.withComponent(TableRowElement),
  TableCellPlugin.withComponent(TableCellElement),
  TableCellHeaderPlugin.withComponent(TableCellHeaderElement),
];
