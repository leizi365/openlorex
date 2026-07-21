import {
  BaseFootnoteDefinitionPlugin,
  BaseFootnoteReferencePlugin,
} from '@platejs/footnote';
import { MarkdownPlugin, remarkMdx, remarkMention } from '@platejs/markdown';
import { isUrl, KEYS } from 'platejs';
import remarkEmoji from 'remark-emoji';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { shouldPreferMarkdownPaste } from '@/lib/paste-markdown';

export const MarkdownKit = [
  BaseFootnoteReferencePlugin,
  BaseFootnoteDefinitionPlugin,
  MarkdownPlugin.configure({
    options: {
      plainMarks: [KEYS.suggestion, KEYS.comment],
      remarkPlugins: [
        remarkMath,
        remarkGfm,
        remarkEmoji as any,
        remarkMdx,
        remarkMention,
      ],
    },
  }).extend({
    parser: {
      query: ({ data, dataTransfer }) => {
        if (dataTransfer.getData('vscode-editor-data')) {
          return false;
        }

        const plain = data || dataTransfer.getData('text/plain');
        if (plain && shouldPreferMarkdownPaste(plain)) {
          return true;
        }

        // Prefer HTML to preserve rich formatting (bold, colors, lists, etc.).
        if (dataTransfer.getData('text/html')) {
          return false;
        }

        const { files } = dataTransfer;
        if (!files?.length && isUrl(data)) {
          return false;
        }

        return true;
      },
    },
  }),
];
