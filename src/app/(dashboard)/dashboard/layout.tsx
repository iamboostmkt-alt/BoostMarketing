'use client';

import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/dashboard/SidebarContext';
import AppSidebar from '@/components/dashboard/AppSidebar';
import TopNav from '@/components/dashboard/TopNav';
import CommandPalette from '@/components/dashboard/CommandPalette';

/**
 * PASSIVE auth guard — NO redirects.
 *
 * Middleware is the SOLE source of truth for route protection.
 * This component only controls what renders client-side:
 *   - "loading"   → show spinner (session hydrating)
 *   - "unauthenticated" → render nothing (middleware already redirected)
 *   - "authenticated"   → render children
 *
 * NEVER add window.location.href, router.push, or any redirect here.
 * That creates a race condition with middleware + NextAuth session hydration.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  // Session is hydrating — show a spinner
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0b0f]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm text-white/40">Cargando...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated — render nothing.
  // Middleware already redirected to /login on the server side.
  // If we got here, it means middleware allowed the request through
  // but the client session hasn't hydrated yet, or the user just
  // signed out. In any case, do NOT redirect — that causes loops.
  if (status === 'unauthenticated') {
    return null;
  }

  // Authenticated — render the dashboard
  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <TooltipProvider delayDuration={0}>
        <SidebarProvider>
          <div className="flex h-screen overflow-hidden bg-[#0b0b0f]">
            {/* Sidebar */}
            <AppSidebar />

            {/* Main area */}
            <div className="flex flex-1 flex-col min-w-0">
              {/* Top navigation */}
              <TopNav />

              {/* Main content */}
              <main className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-4 md:p-6 lg:p-8">
                  {children}
                </div>
              </main>
            </div>

            {/* Command Palette */}
            <CommandPalette />
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </AuthGuard>
  );
}
