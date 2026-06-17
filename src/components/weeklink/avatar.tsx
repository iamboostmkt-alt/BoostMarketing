'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type AvatarProps = {
  initials: string;
  color: string;
  size?: number;
  status?: 'online' | 'away' | 'offline';
  className?: string;
  ring?: boolean;
  image?: string | null;
};

const statusColor: Record<string, string> = {
  online:  '#10b981',
  away:    '#f59e0b',
  offline: 'rgba(245,247,250,0.3)',
};

function isValidUrl(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function Avatar({ initials, color, size = 32, status, className, ring, image }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = isValidUrl(image) && !imgError;

  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      {showImage ? (
        <img
          src={image!}
          alt={initials}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => setImgError(true)}
          className={cn('h-full w-full rounded-full object-cover', ring && 'ring-2 ring-background')}
        />
      ) : (
        <span
          className={cn(
            'flex h-full w-full items-center justify-center rounded-full font-medium text-[var(--wl-text-primary)] select-none',
            ring && 'ring-2 ring-background',
          )}
          style={{
            background: `linear-gradient(140deg, ${color}, ${color}cc)`,
            fontSize: size * 0.36,
            letterSpacing: '-0.02em',
          }}
          aria-hidden="true"
        >
          {initials}
        </span>
      )}
      {status && (
        <span
          className="absolute bottom-0 right-0 rounded-full ring-2 ring-[#0f1117]"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            backgroundColor: statusColor[status],
          }}
        />
      )}
    </span>
  );
}
