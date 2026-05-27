'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/dashboard/SidebarContext';
import AppSidebar from '@/components/dashboard/AppSidebar';
import TopNav from '@/components/dashboard/TopNav';
import CommandPalette from '@/components/dashboard/CommandPalette';
import ErrorBoundary from '@/components/dashboard/ErrorBoundary';
import { AuthProvider } from '@/context/AuthContext';
import { BrandingProvider } from '@/context/BrandingContext';
import { RealtimeProvider } from '@/providers/RealtimeProvider';

function ForbiddenBanner() {
  const searchParams = useSearchParams();
  if (!searchParams.get('forbidden')) return null;
  return (
    <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      No tienes permisos para acceder a esa sección.
    </div>
  );
}

/**
 * Dashboard layout — AuthProvider is HERE, not in root layout.
 *
 * This ensures the landing page, login, and register pages
 * render INSTANTLY without waiting for session hydration.
 *
 * Only dashboard pages need session context.
 * Middleware (next-auth/middleware) protects /dashboard/* routes.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <BrandingProvider>
      <RealtimeProvider>
      <TooltipProvider delayDuration={0}>
        <SidebarProvider>
          <div className="flex h-screen overflow-hidden" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #0f0f0f 50%, #0a0a0a 100%)" }}>
            {/* Sidebar */}
            <AppSidebar />

            {/* Main area */}
            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
              {/* Top navigation — shrink-0 garantiza que no scrollea */}
              <div className="shrink-0">
                <TopNav />
              </div>

              {/* Main content — ÚNICO área scrolleable */}
              <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #0f0f0f 50%, #0a0a0a 100%)" }}>
                <div className="p-4 md:p-6 lg:p-8">
                  <Suspense fallback={null}>
                    <ForbiddenBanner />
                  </Suspense>
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </div>
              </main>
            </div>

            {/* Command Palette */}
            <CommandPalette />
          </div>
        </SidebarProvider>
      </TooltipProvider>
      </RealtimeProvider>
      </BrandingProvider>
    </AuthProvider>
  );
}
