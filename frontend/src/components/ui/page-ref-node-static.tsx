import type { TElement } from 'platejs';
import type { SlateElementProps } from 'platejs/static';
import { NodeApi } from 'platejs';
import { SlateElement } from 'platejs/static';

import { cn } from '@/app/api/ai/command/utils';
import type { TPageRefElement } from '@/features/pages/page-ref';
import { getPageRefLabel } from '@/features/pages/page-ref';
import { inlineSuggestionVariants } from '@/lib/suggestion';

export function PageRefElementStatic(
  props: SlateElementProps<TElement>
) {
  const element = props.element as TPageRefElement;
  const text = NodeApi.string(element).trim();
  const fallback = getPageRefLabel(element);
  const href = element.pageCode ? `/page/${element.pageCode}` : undefined;

  return (
    <SlateElement
      {...props}
      as="a"
      className={cn(
        'cursor-pointer font-medium text-primary no-underline hover:underline hover:decoration-primary hover:underline-offset-4',
        inlineSuggestionVariants()
      )}
      attributes={{
        ...props.attributes,
        href,
      }}
    >
      {text ? props.children : fallback}
    </SlateElement>
  );
}
