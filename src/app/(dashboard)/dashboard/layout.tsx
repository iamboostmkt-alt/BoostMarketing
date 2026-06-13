'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'next-auth/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/dashboard/SidebarContext';
import AppSidebar from '@/components/dashboard/AppSidebar';
import TopNav from '@/components/dashboard/TopNav';
import CommandPalette from '@/components/dashboard/CommandPalette';
import ErrorBoundary from '@/components/dashboard/ErrorBoundary';
import { AuthProvider } from '@/context/AuthContext';
import { BrandingProvider } from '@/context/BrandingContext';
import { RealtimeProvider } from '@/providers/RealtimeProvider';
import { ActivityToastListener } from '@/components/dashboard/ActivityToastListener';
import PushNotificationManager from '@/components/pwa/PushNotificationManager';

function ForbiddenBanner() {
  const searchParams = useSearchParams();
  if (!searchParams.get('forbidden')) return null;
  return (
    <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      No tienes permisos para acceder a esa sección.
    </div>
  );
}

// Guard: si el usuario tiene rol UNASSIGNED muestra página de espera
function UnassignedGuard({ children }: { children: React.ReactNode }) {
  const { userRole, session } = useAuth();
  // Esperar a que la sesión cargue antes de verificar
  if (!session) return <>{children}</>;
  if (userRole === 'UNASSIGNED') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-6 px-4"
        style={{ background: '#07070A' }}>
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
            style={{ background: 'rgba(139,92,246,0.12)' }}>
            ⏳
          </div>
          <div>
            <h2 className="text-[20px] font-semibold text-white/90 mb-2">
              Tu cuenta está pendiente
            </h2>
            <p className="text-[14px] text-white/50 leading-relaxed">
              El administrador de tu workspace te asignará un rol pronto.
              Una vez asignado podrás acceder al dashboard.
            </p>
          </div>
          <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[13px] text-white/40 text-center">
            {session.user?.email}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="mt-2 flex h-10 items-center rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-5 text-[13px] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/80">
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
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
        <ActivityToastListener />
          <PushNotificationManager />
      <TooltipProvider delayDuration={0}>
        <SidebarProvider>
          <UnassignedGuard>
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
              <main className="flex-1 min-h-0 overflow-hidden flex flex-col" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #0f0f0f 50%, #0a0a0a 100%)" }}>
                <Suspense fallback={null}>
                  <ForbiddenBanner />
                </Suspense>
                <ErrorBoundary>
                  <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {children}
                  </div>
                </ErrorBoundary>
              </main>
            </div>

            {/* Command Palette */}
            <CommandPalette />
          </div>
          </UnassignedGuard>
        </SidebarProvider>
      </TooltipProvider>
      </RealtimeProvider>
      </BrandingProvider>
    </AuthProvider>
  );
}
