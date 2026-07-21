'use client';

import { createPlatePlugin } from 'platejs/react';
import { KEYS } from 'platejs';

import { stripFontSizeFromFragment } from '@/lib/editor-font-size';
import { shouldPreferMarkdownPaste } from '@/lib/paste-markdown';

const AST_PLUGIN_KEY = 'ast';

const shouldSkipHtmlPaste = (dataTransfer: DataTransfer) => {
  if (dataTransfer.getData('vscode-editor-data')) {
    return true;
  }

  const plain = dataTransfer.getData('text/plain');
  return Boolean(plain && shouldPreferMarkdownPaste(plain));
};

const normalizePastedFragment = ({ fragment }: { fragment: Parameters<typeof stripFontSizeFromFragment>[0] }) =>
  stripFontSizeFromFragment(fragment);

export const PasteKit = [
  createPlatePlugin({
    key: 'pasteNormalize',
    inject: {
      plugins: {
        [KEYS.html]: {
          parser: {
            query: ({ dataTransfer }) => !shouldSkipHtmlPaste(dataTransfer),
            transformFragment: normalizePastedFragment,
          },
        },
        [KEYS.markdown]: {
          parser: {
            transformFragment: normalizePastedFragment,
          },
        },
        [AST_PLUGIN_KEY]: {
          parser: {
            transformFragment: normalizePastedFragment,
          },
        },
      },
    },
  }),
];
