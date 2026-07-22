'use client';

import { LineHeightPlugin } from '@platejs/basic-styles/react';
import { KEYS } from 'platejs';

export const LineHeightKit = [
  LineHeightPlugin.configure({
    inject: {
      nodeProps: {
        defaultNodeValue: 1.75,
        validNodeValues: [1, 1.15, 1.2, 1.5, 1.75, 2, 2.5, 3],
      },
      targetPlugins: [...KEYS.heading, KEYS.p],
    },
  }),
];
