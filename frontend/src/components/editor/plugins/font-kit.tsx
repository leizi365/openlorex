'use client';

import type { PlatePluginConfig } from 'platejs/react';

import {
  FontBackgroundColorPlugin,
  FontColorPlugin,
  FontFamilyPlugin,
  FontSizePlugin,
} from '@platejs/basic-styles/react';
import { KEYS } from 'platejs';

import { PAGE_REF_KEY } from '@/features/pages/page-ref';

const options = {
  inject: {
    targetPlugins: [
      KEYS.p,
      KEYS.h1,
      KEYS.h2,
      KEYS.h3,
      KEYS.h4,
      KEYS.h5,
      KEYS.h6,
      KEYS.blockquote,
      KEYS.callout,
      KEYS.li,
      KEYS.toggle,
      KEYS.codeBlock,
      PAGE_REF_KEY,
    ],
  },
} satisfies PlatePluginConfig;

export const FontKit = [
  FontColorPlugin.configure({
    inject: {
      ...options.inject,
      nodeProps: {
        defaultNodeValue: 'black',
      },
    },
  }),
  FontBackgroundColorPlugin.configure(options),
  FontSizePlugin.configure(options),
  FontFamilyPlugin.configure(options),
];
