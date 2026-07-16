'use client';

import { toPlatePlugin } from 'platejs/react';

import { PageRefElement } from '@/components/ui/page-ref-node';
import { BasePageRefPlugin } from '@/components/editor/plugins/page-ref-base-kit';

export const PageRefPlugin = toPlatePlugin(BasePageRefPlugin).withComponent(
  PageRefElement
);

export const PageRefKit = [PageRefPlugin];
