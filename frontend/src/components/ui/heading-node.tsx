'use client';

import * as React from 'react';

import type { PlateElementProps } from 'platejs/react';

import { type VariantProps, cva } from 'class-variance-authority';
import { PlateElement } from 'platejs/react';

const headingVariants = cva(
  'relative mb-1 text-[rgba(55,53,47,1)] data-[nav-target=true]:rounded-md data-[nav-target=true]:bg-(--color-highlight)',
  {
    variants: {
      variant: {
        h1: 'mt-[2em] pb-1 text-[40px] font-bold leading-[1.2] tracking-[-0.02em] first:mt-0',
        h2: 'mt-[1.4em] pb-px text-[1.5em] font-semibold leading-[1.3]',
        h3: 'mt-[1em] pb-px text-[1.25em] font-semibold leading-[1.3]',
        h4: 'mt-[0.75em] text-[1.1em] font-semibold tracking-tight',
        h5: 'mt-[0.75em] text-[1em] font-semibold tracking-tight',
        h6: 'mt-[0.75em] text-[0.95em] font-semibold tracking-tight',
      },
    },
  }
);

export function HeadingElement({
  variant = 'h1',
  ...props
}: PlateElementProps & VariantProps<typeof headingVariants>) {
  const id = props.element.id as string | undefined;

  return (
    <PlateElement
      as={variant!}
      {...props}
      className={headingVariants({ variant })}
      attributes={{
        ...props.attributes,
        ...(id ? { id } : null),
      }}
    >
      {props.children}
    </PlateElement>
  );
}

export function H1Element(props: PlateElementProps) {
  return <HeadingElement variant="h1" {...props} />;
}

export function H2Element(props: PlateElementProps) {
  return <HeadingElement variant="h2" {...props} />;
}

export function H3Element(props: PlateElementProps) {
  return <HeadingElement variant="h3" {...props} />;
}

export function H4Element(props: PlateElementProps) {
  return <HeadingElement variant="h4" {...props} />;
}

export function H5Element(props: PlateElementProps) {
  return <HeadingElement variant="h5" {...props} />;
}

export function H6Element(props: PlateElementProps) {
  return <HeadingElement variant="h6" {...props} />;
}
