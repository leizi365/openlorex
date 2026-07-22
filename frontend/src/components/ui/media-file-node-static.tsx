import * as React from 'react';

import type { TFileElement, TResizableProps } from 'platejs';
import type { TSuggestionData } from 'platejs';
import type { SlateElementProps } from 'platejs/static';

import { SlateElement } from 'platejs/static';

import { cn } from '@/lib/utils';

import {
  ColoredFileIcon,
  getFileBlockStyle,
  type TFileElementWithStyle,
} from './media-file-appearance';

export function FileElementStatic(
  props: SlateElementProps<TFileElement & TResizableProps>
) {
  const element = props.element as TFileElementWithStyle & {
    align?: string;
    suggestion?: TSuggestionData;
  };
  const { align = 'left', name, url, width } = element;
  const suggestionData = element.suggestion;
  const isRemoveSuggestion = suggestionData?.type === 'remove';
  const alignClass =
    align === 'right' || align === 'end'
      ? 'ml-auto'
      : align === 'center'
        ? 'mx-auto'
        : 'mr-auto';

  return (
    <SlateElement className="my-px rounded-sm" {...props}>
      <a
        className={cn(
          'group relative m-0 flex max-w-full items-center gap-2 rounded-md px-2 py-0.5 no-underline transition-opacity hover:opacity-95',
          alignClass,
          isRemoveSuggestion && 'bg-red-100 text-red-700'
        )}
        contentEditable={false}
        href={isRemoveSuggestion ? undefined : url}
        rel="noopener noreferrer"
        style={{
          width,
          ...(isRemoveSuggestion ? {} : getFileBlockStyle(element)),
        }}
        target="_blank"
      >
        <ColoredFileIcon />

        <div
          className={cn(
            'min-w-0 truncate text-sm font-medium',
            isRemoveSuggestion && 'line-through decoration-current'
          )}
        >
          {name}
        </div>
      </a>
      {props.children}
    </SlateElement>
  );
}
