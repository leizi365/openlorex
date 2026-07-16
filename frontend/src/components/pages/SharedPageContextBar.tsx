import { Link2 } from 'lucide-react';

import type { PageAccess } from '@/features/pages/types';
import { cn } from '@/lib/utils';

function formatVia(access: PageAccess) {
  if (access.via?.type === 'community') {
    return access.via.name;
  }
  if (access.via?.type === 'user') {
    return '直接共享';
  }
  if (access.via?.type === 'public') {
    return '公开链接';
  }
  return null;
}

export function formatSharedPageAccess(access: PageAccess) {
  const permissionLabel = access.level === 'edit' ? '可编辑' : '只读';
  const viaLabel = formatVia(access);
  const parts = ['共享知识', permissionLabel];

  if (viaLabel) {
    parts.push(viaLabel);
  }

  if (access.ownerName) {
    parts.push(access.ownerName);
  }

  return parts.join(' · ');
}

export function SharedPageAccessLabel({
  access,
  className,
  compact = false,
}: {
  access: PageAccess;
  className?: string;
  compact?: boolean;
}) {
  if (access.level === 'owner') {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5 text-muted-foreground/80',
        compact ? 'text-xs' : 'text-sm',
        className
      )}
    >
      <Link2 className="size-3.5 shrink-0 opacity-70" />
      <span className="truncate">{formatSharedPageAccess(access)}</span>
    </span>
  );
}
