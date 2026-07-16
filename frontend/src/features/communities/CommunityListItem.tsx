import * as React from 'react';

import { cn } from '@/lib/utils';

type CommunityListItemProps = React.LiHTMLAttributes<HTMLLIElement> & {
  disableHover?: boolean;
};

export function CommunityListItem({
  className,
  children,
  disableHover = false,
  ...props
}: CommunityListItemProps) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <li
      {...props}
      onMouseEnter={(event) => {
        if (!disableHover) {
          setHovered(true);
        }
        props.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        if (!disableHover) {
          setHovered(false);
        }
        props.onMouseLeave?.(event);
      }}
      className={cn(
        'rounded-md transition-colors duration-150',
        !disableHover && hovered && 'bg-primary/4',
        className
      )}
    >
      {children}
    </li>
  );
}
