'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ActivityAssignee } from '@/lib/types';

interface UserAvatarStackProps {
  users: ActivityAssignee[];
  max?: number;
  size?: 'xs' | 'sm';
}

function initials(name: string | null | undefined, email: string | null | undefined) {
  return ((name || email || 'U')).split(/[\s@]/).map((n) => n[0] || '').join('').toUpperCase().slice(0, 2) || 'U';
}

export default function UserAvatarStack({ users, max = 4, size = 'xs' }: UserAvatarStackProps) {
  if (!users || users.length === 0) return null;

  const visible  = users.slice(0, max);
  const overflow = users.length - max;
  const dim      = size === 'xs' ? 'h-5 w-5' : 'h-6 w-6';
  const textSize = size === 'xs' ? 'text-[8px]' : 'text-[9px]';

  return (
    <div className="flex items-center -space-x-1.5 ml-auto">
      {visible.map((u) => (
        <Avatar
          key={u.id}
          className={`${dim} ring-1 ring-[#15151c] shrink-0`}
          title={u.name || u.email}
        >
          <AvatarImage src={u.image || undefined} />
          <AvatarFallback
            className={`${textSize} font-medium`}
            style={{
              backgroundColor: (u.color || '#7c3aed') + '33',
              color:            u.color || '#7c3aed',
            }}
          >
            {initials(u.name, u.email)}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div
          className={`${dim} ${textSize} font-semibold rounded-full ring-1 ring-[#15151c] bg-[var(--wl-border)] text-[var(--wl-text-secondary)] flex items-center justify-center shrink-0`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
