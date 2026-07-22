import { all, createLowlight } from 'lowlight';

import { CODE_BLOCK_LANGUAGES } from '@/lib/code-block-languages';

export const lowlight = createLowlight(all);

/** Register UI languages that highlight.js does not ship, as plaintext. */
for (const { value } of CODE_BLOCK_LANGUAGES) {
  if (value === 'auto' || value === 'plaintext') continue;
  if (!lowlight.registered(value)) {
    lowlight.register(value, all.plaintext);
  }
}
