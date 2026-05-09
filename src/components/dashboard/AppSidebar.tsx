'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebar } from './SidebarContext';
import { useMounted } from '@/hooks/use-mounted';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'CRM', href: '/dashboard/crm', icon: Users },
  { label: 'Tareas', href: '/dashboard/tasks', icon: CheckSquare },
  { label: 'Calendario', href: '/dashboard/calendar', icon: Calendar },
  { label: 'Clientes', href: '/dashboard/clients', icon: UserCircle },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Ajustes', href: '/dashboard/settings', icon: Settings },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { data: session, status } = useSession();
  const mounted = useMounted();

  const isLoading = status === 'loading';
  const userName = session?.user?.name || 'Usuario';
  const userRole = (session?.user as any)?.role || 'client';
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
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-semibold text-white whitespace-nowrap overflow-hidden"
              >
                BoostMarketing
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
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
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-brand rounded-r-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-brand-light' : ''}`} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
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
          {isLoading ? (
            <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          ) : (
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarImage src={userImage || undefined} alt={userName} />
              <AvatarFallback className="bg-brand/20 text-brand-light text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                {isLoading ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-white truncate">{userName}</p>
                    <p className="text-xs text-white/40 capitalize truncate">{userRole}</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!collapsed && !isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/[0.06]"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
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
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden md:flex flex-col bg-[#0e0e14] border-r border-white/[0.06] h-screen sticky top-0 overflow-hidden shrink-0"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ x: mobileOpen ? 0 : -280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed top-0 left-0 z-50 h-screen w-[256px] bg-[#0e0e14] border-r border-white/[0.06] md:hidden"
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
