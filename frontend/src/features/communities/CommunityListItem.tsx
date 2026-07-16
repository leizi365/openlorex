import * as React from 'react';

import { cn } from '@/lib/utils';

type CommunityListItemProps = React.LiHTMLAttributes<HTMLLIElement>;

export function CommunityListItem({
  className,
  children,
  ...props
}: CommunityListItemProps) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <li
      {...props}
      onMouseEnter={(event) => {
        setHovered(true);
        props.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setHovered(false);
        props.onMouseLeave?.(event);
      }}
      className={cn(
        'rounded-md transition-colors duration-150',
        hovered && 'bg-primary/4',
        className
      )}
    >
      {children}
    </li>
  );
}
