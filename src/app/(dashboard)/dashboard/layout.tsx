'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/dashboard/SidebarContext';
import AppSidebar from '@/components/dashboard/AppSidebar';
import TopNav from '@/components/dashboard/TopNav';
import CommandPalette from '@/components/dashboard/CommandPalette';

/**
 * Client-side auth guard. Prevents dashboard from rendering
 * until the session is confirmed. If unauthenticated, redirects
 * to /login. Includes a safety timeout for CLIENT_FETCH_ERROR resilience.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [timedOut, setTimedOut] = useState(false);
  const mountTime = useRef(Date.now());

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/login';
    }
  }, [status]);

  // Safety timeout: if session is still "loading" after 15 seconds,
  // it likely means the session fetch failed (CLIENT_FETCH_ERROR).
  // Show a retry UI instead of an infinite spinner.
  useEffect(() => {
    if (status !== 'loading') return;

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, [status]);

  // While session is loading, show a centered spinner
  if (status === 'loading') {
    if (timedOut) {
      return (
        <div className="flex h-screen items-center justify-center bg-[#0b0b0f]">
          <div className="flex flex-col items-center gap-4 text-center px-4">
            <Loader2 className="h-8 w-8 text-brand animate-spin" />
            <div>
              <p className="text-sm text-white/60">La sesión está tardando en cargar</p>
              <p className="text-xs text-white/30 mt-1">Esto puede deberse a un problema de conexión</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-2 border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.06]"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0b0f]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm text-white/40">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if unauthenticated (redirect is in progress)
  if (status === 'unauthenticated') {
    return null;
  }

  // Only render dashboard when authenticated
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
