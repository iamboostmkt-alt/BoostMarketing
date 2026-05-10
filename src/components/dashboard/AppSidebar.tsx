'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  UserCircle,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  LogOut,
  Shield,
} from 'lucide-react';
import { isAdminRole, canAccessRoute, getRoleLabel } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

import { useSidebar } from './SidebarContext';

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const navItemsBase: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'CRM', href: '/dashboard/crm', icon: Users },
  { label: 'Tareas', href: '/dashboard/tasks', icon: CheckSquare },
  { label: 'Calendario', href: '/dashboard/calendar', icon: Calendar },
  { label: 'Clientes', href: '/dashboard/clients', icon: UserCircle },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Admin', href: '/dashboard/admin', icon: Shield, adminOnly: true },
  { label: 'Ajustes', href: '/dashboard/settings', icon: Settings },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { data: session } = useSession();

  // NON-BLOCKING: always render with defaults, update when session resolves
  const userName = session?.user?.name || 'Usuario';
  const role = session?.user?.role;
  const userRoleLabel = getRoleLabel(role);
  const userImage = session?.user?.image;

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand text-white">
            <Zap className="w-5 h-5" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-white whitespace-nowrap overflow-hidden transition-all duration-200">
              BoostMarketing
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItemsBase
          .filter((item) => canAccessRoute(item.href, role))
          .map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          const linkContent = (
            <Link
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 relative group
                ${
                  active
                    ? 'bg-white/[0.06] text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                }
              `}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-brand rounded-r-full transition-all duration-200" />
              )}
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-brand-light' : ''}`} />
              {!collapsed && (
                <span className="whitespace-nowrap overflow-hidden transition-all duration-200">
                  {item.label}
                </span>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="bg-surface-card text-white border-white/[0.06]">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>

      {/* Bottom: User + Collapse */}
      <div className="mt-auto border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarImage src={userImage || undefined} alt={userName} />
            <AvatarFallback className="bg-brand/20 text-brand-light text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0 overflow-hidden transition-all duration-200">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-white/40 truncate">{userRoleLabel}</p>
            </div>
          )}
          {/* Logout: always visible on mobile, always visible on desktop (collapsed or expanded) */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/[0.06] flex"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {/* Collapse toggle - desktop only */}
        <div className="hidden md:flex items-center justify-center py-2 border-t border-white/[0.06]">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar - pure CSS transition, no Framer Motion */}
      <aside
        style={{ width: collapsed ? 72 : 256 }}
        className="hidden md:flex flex-col bg-[#0e0e14] border-r border-white/[0.06] h-screen sticky top-0 overflow-hidden shrink-0 transition-[width] duration-300 ease-in-out"
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar panel - pure CSS transition */}
      <aside
        className="fixed top-0 left-0 z-50 h-screen w-[256px] bg-[#0e0e14] border-r border-white/[0.06] md:hidden transition-transform duration-300 ease-in-out"
        style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-280px)' }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
