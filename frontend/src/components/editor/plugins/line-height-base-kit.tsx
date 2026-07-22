import { BaseLineHeightPlugin } from '@platejs/basic-styles';
import { KEYS } from 'platejs';

export const BaseLineHeightKit = [
  BaseLineHeightPlugin.configure({
    inject: {
      nodeProps: {
        defaultNodeValue: 1.75,
        validNodeValues: [1, 1.15, 1.2, 1.5, 1.75, 2, 2.5, 3],
      },
      targetPlugins: [...KEYS.heading, KEYS.p],
    },
  }),
];
