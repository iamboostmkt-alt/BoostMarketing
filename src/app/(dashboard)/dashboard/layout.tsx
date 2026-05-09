'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/dashboard/SidebarContext';
import AppSidebar from '@/components/dashboard/AppSidebar';
import TopNav from '@/components/dashboard/TopNav';
import CommandPalette from '@/components/dashboard/CommandPalette';

/**
 * Client-side auth guard. Prevents dashboard from rendering
 * until the session is confirmed. If unauthenticated, redirects
 * to /login. This is a safety net in addition to middleware.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      // Use window.location for a full redirect to ensure
      // middleware cookie check works on the new request
      window.location.href = '/login';
    }
  }, [status]);

  // While session is loading, show a centered spinner
  if (status === 'loading') {
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
