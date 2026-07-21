import type { Descendant } from 'platejs';

import { ElementApi, KEYS } from 'platejs';

export const DEFAULT_FONT_SIZE = '14';
export const DEFAULT_FONT_SIZE_PX = `${DEFAULT_FONT_SIZE}px`;

const isCodeSubtree = (node: Descendant) =>
  ElementApi.isElement(node) &&
  (node.type === KEYS.codeBlock || node.type === KEYS.codeLine);

/** Remove pasted font-size marks so text inherits the editor default (14px). */
export const stripFontSizeFromFragment = (nodes: Descendant[]): Descendant[] =>
  nodes.map((node) => {
    if (isCodeSubtree(node)) {
      return node;
    }

    if ('text' in node && typeof node.text === 'string') {
      const { [KEYS.fontSize]: _fontSize, ...textNode } = node as Descendant & {
        [KEYS.fontSize]?: string;
      };
      return textNode;
    }

    if ('children' in node && Array.isArray(node.children)) {
      return {
        ...node,
        children: stripFontSizeFromFragment(node.children as Descendant[]),
      };
    }

    return node;
  });
