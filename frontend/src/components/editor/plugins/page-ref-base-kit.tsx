import { NodeApi, createSlatePlugin } from 'platejs';

import { PageRefElementStatic } from '@/components/ui/page-ref-node-static';
import {
  PAGE_REF_KEY,
  getPageRefLabel,
  type TPageRefElement,
} from '@/features/pages/page-ref';

export const BasePageRefPlugin = createSlatePlugin({
  key: PAGE_REF_KEY,
  node: {
    isElement: true,
    isInline: true,
  },
})
  .overrideEditor(({ editor, tf: { normalizeNode } }) => ({
    transforms: {
      normalizeNode(entry) {
        const [node, path] = entry;

        if ((node as TPageRefElement).type === PAGE_REF_KEY) {
          const pageRef = node as TPageRefElement;
          if (!NodeApi.string(pageRef).trim()) {
            const display = getPageRefLabel(pageRef);
            const textPath = [...path, 0] as typeof path;
            editor.tf.insertText(display, { at: textPath });
            return;
          }
        }

        return normalizeNode(entry);
      },
    },
  }))
  .withComponent(PageRefElementStatic);

export const BasePageRefKit = [BasePageRefPlugin];
