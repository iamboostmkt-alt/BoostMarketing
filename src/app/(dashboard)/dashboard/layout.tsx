'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/dashboard/SidebarContext';
import AppSidebar from '@/components/dashboard/AppSidebar';
import TopNav from '@/components/dashboard/TopNav';
import CommandPalette from '@/components/dashboard/CommandPalette';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
  );
}
