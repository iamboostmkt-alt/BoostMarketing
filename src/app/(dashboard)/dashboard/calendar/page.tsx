'use client';

import dynamic from 'next/dynamic';

// Dynamic import with ssr: false to prevent any hydration mismatch
// This ensures the calendar content only renders on the client side,
// avoiding issues with Date objects, locale formatting, and Framer Motion
const CalendarContent = dynamic(
  () => import('@/components/dashboard/CalendarContent'),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-36 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="h-9 w-28 rounded-lg bg-white/[0.06] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-6 w-48 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-64 w-full rounded-xl bg-white/[0.06] animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-6 w-32 rounded bg-white/[0.06] animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 w-full rounded-xl bg-white/[0.06] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    ),
  }
);

export default function CalendarPage() {
  return <CalendarContent />;
}
