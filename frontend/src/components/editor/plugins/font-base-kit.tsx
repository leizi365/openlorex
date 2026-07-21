import type { SlatePluginConfig } from 'platejs';

import {
  BaseFontBackgroundColorPlugin,
  BaseFontColorPlugin,
  BaseFontFamilyPlugin,
  BaseFontSizePlugin,
} from '@platejs/basic-styles';
import { KEYS } from 'platejs';

import { PAGE_REF_KEY } from '@/features/pages/page-ref';
import { DEFAULT_FONT_SIZE_PX } from '@/lib/editor-font-size';

const options = {
  inject: { targetPlugins: [KEYS.p, PAGE_REF_KEY] },
} satisfies SlatePluginConfig;

export const BaseFontKit = [
  BaseFontColorPlugin.configure(options),
  BaseFontBackgroundColorPlugin.configure(options),
  BaseFontSizePlugin.configure({
    inject: {
      ...options.inject,
      nodeProps: {
        defaultNodeValue: DEFAULT_FONT_SIZE_PX,
      },
    },
    parsers: {
      html: {
        deserializer: {
          isLeaf: true,
          rules: [{ validStyle: { fontSize: '*' } }],
          query: () => false,
        },
      },
    },
  }),
  BaseFontFamilyPlugin.configure(options),
];
