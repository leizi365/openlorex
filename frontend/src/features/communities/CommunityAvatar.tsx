import { getCommunityColor, getCommunityInitial } from '@/features/communities/presentation';
import { cn } from '@/lib/utils';

type CommunityAvatarProps = {
  name: string;
  seed: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE_CLASS = {
  sm: 'size-9 text-sm',
  md: 'size-10 text-sm',
  lg: 'size-12 text-lg',
} as const;

export function CommunityAvatar({
  name,
  seed,
  size = 'md',
  className,
}: CommunityAvatarProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl font-semibold text-foreground/90',
        SIZE_CLASS[size],
        className
      )}
      style={{ backgroundColor: getCommunityColor(seed) }}
    >
      {getCommunityInitial(name)}
    </div>
  );
}
