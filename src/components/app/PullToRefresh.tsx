'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing]     = useState(false);
  const pulling    = useRef(false);
  const startY     = useRef(0);
  const threshold  = 70;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await onRefresh(); } catch { /* ignore */ }
    setRefreshing(false);
    setPullDistance(0);
  }, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY === 0) {
        setPullDistance(Math.min(delta * 0.5, threshold * 1.5));
      }
    };
    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistance >= threshold) handleRefresh();
      else setPullDistance(0);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove',  onTouchMove,  { passive: true });
    document.addEventListener('touchend',   onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove',  onTouchMove);
      document.removeEventListener('touchend',   onTouchEnd);
    };
  }, [pullDistance, refreshing, handleRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || refreshing;

  return (
    <div className={className} style={{ position: 'relative', overflowX: 'hidden' }}>
      {showIndicator && (
        <div className="absolute left-0 right-0 z-50 flex justify-center pointer-events-none"
          style={{ top: refreshing ? 8 : Math.max(0, pullDistance - 44), transition: refreshing ? 'top 0.2s' : 'none' }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--wl-border)] bg-[var(--wl-elevated)]"
            style={{ transform: `scale(${0.6 + progress * 0.4})`, transition: 'transform 0.1s' }}>
            {refreshing
              ? <div className="h-4 w-4 rounded-full border-2 border-violet-400/30 border-t-violet-400 animate-spin" />
              : <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  style={{ transform: `rotate(${progress * 180}deg)`, transition: 'transform 0.1s' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            }
          </div>
        </div>
      )}
      <div style={{ transform: `translateY(${refreshing ? 44 : pullDistance}px)`, transition: refreshing ? 'transform 0.2s' : 'none' }}>
        {children}
      </div>
    </div>
  );
}
