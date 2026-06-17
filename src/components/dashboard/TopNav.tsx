'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

// Destino de logout: app nativa Capacitor → /login, móvil browser → /login, desktop → /weeklink
function getLogoutUrl(): string {
  if (typeof window === 'undefined') return '/weeklink';
  const isNative = (window as any).Capacitor?.isNativePlatform?.();
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isPwa = window.matchMedia('(display-mode: standalone)').matches;
  return (isNative || isMobile || isPwa) ? '/login' : '/weeklink';
}

import { Menu, Search, User, LogOut, Settings, Palette, Zap, HelpCircle, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useSidebar } from './SidebarContext';
import { NotificationsDropdown } from './NotificationsDropdown';

const pageTitles: Record<string, string> = {
  '/dashboard':           'Dashboard',
  '/dashboard/crm':       'Leads',
  '/dashboard/tasks':     'Tareas',
  '/dashboard/calendar':  'Calendario',
  '/dashboard/clients':   'Usuarios',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/settings':  'Ajustes',
};

export default function TopNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const { setMobileOpen, setCommandOpen } = useSidebar();
  const { data: session } = useSession();

  const userName      = session?.user?.name  || 'Usuario';
  const userImage     = session?.user?.image;
  const workspaceName = session?.user?.workspaceName || 'Weeklink';
  const role          = session?.user?.role;
  const isClient      = role === 'CLIENT';

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getPageTitle = () => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (pathname === path || pathname.startsWith(path + '/')) return title;
    }
    return 'Dashboard';
  };

  return (
    <header className="border-b border-[var(--wl-border-subtle)] sticky top-0 z-30" style={{ background: "var(--wl-sidebar-bg)", borderBottom: "1px solid var(--wl-border-subtle)", paddingTop: "max(env(safe-area-inset-top, 0px), 12px)", minHeight: "calc(48px + max(env(safe-area-inset-top, 0px), 0px))" }}>
      <div className="flex items-center h-12 px-4 md:px-6 gap-3">

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-[var(--wl-text-secondary)] hover:text-white hover:bg-[var(--wl-hover)]"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-white/85 truncate">{workspaceName}</span>
        </div>

        <div className="flex-1 max-w-sm mx-auto hidden sm:block">
          <button
            onClick={() => setCommandOpen(true)}
            className="w-full flex items-center gap-2 h-7 px-3 rounded-md border border-[var(--wl-border)] bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-white/30 hover:text-white/50"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs flex-1 text-left">Buscar...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 h-4 px-1.5 rounded border border-[var(--wl-border)] bg-white/[0.04] text-[10px] text-white/25 font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden text-[var(--wl-text-secondary)] hover:text-white hover:bg-[var(--wl-hover)]"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="w-5 h-5" />
          </Button>

          <ThemeToggle variant="icon" />
        <NotificationsDropdown />

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button className="relative h-9 w-9 rounded-full flex items-center justify-center cursor-pointer">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={userImage || undefined} alt={userName} />
                  <AvatarFallback
                    style={{ backgroundColor: (session?.user?.color || '#7c3aed') + '33', color: session?.user?.color || '#a78bfa' }}
                    className="text-xs font-medium"
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 border-[var(--wl-border)] text-white p-0 overflow-hidden relative"
              style={{
                background: 'rgba(10,10,14,0.85)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
              align="end"
            >
              {/* Glow morado esquina inferior derecha */}
              <div className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none z-0"
                style={{ background: 'radial-gradient(ellipse at bottom right, rgba(88,28,220,0.12) 0%, transparent 70%)' }} />

              {/* Header: Avatar + nombre + rol */}
              <div className="relative z-10 flex items-center gap-2.5 px-3 py-2.5 border-b border-[var(--wl-border)]">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={userImage || undefined} alt={userName} />
                  <AvatarFallback
                    style={{ backgroundColor: (session?.user?.color || '#7c3aed') + '33', color: session?.user?.color || '#a78bfa' }}
                    className="text-[11px] font-semibold"
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white/90 truncate">{userName}</p>
                  {session?.user?.customRoleLabel ? (
                    <span
                      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium mt-0.5"
                      style={{ backgroundColor: (session?.user?.customRoleColor || '#7c3aed') + '22', color: session?.user?.customRoleColor || '#a78bfa' }}
                    >
                      {session?.user?.customRoleLabel}
                    </span>
                  ) : (
                    <p className="text-[10px] text-white/35 truncate">{session?.user?.email || ''}</p>
                  )}
                </div>
              </div>

              {/* Menu items */}
              <div className="relative z-10 p-1.5 space-y-0.5">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-white/55 hover:text-white/90 focus:text-white/90 hover:bg-white/[0.05] focus:bg-white/[0.05] cursor-pointer transition-all"
                    onClick={() => router.push('/dashboard/settings')}
                  >
                    <User className="h-3.5 w-3.5 shrink-0 transition-all group-hover:text-violet-400" strokeWidth={1.5} />
                    <span className="text-[12px]">Mi perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-white/55 hover:text-white/90 focus:text-white/90 hover:bg-white/[0.05] focus:bg-white/[0.05] cursor-pointer transition-all"
                    onClick={() => router.push('/dashboard/settings')}
                  >
                    <Settings className="h-3.5 w-3.5 shrink-0 transition-all group-hover:text-violet-400" strokeWidth={1.5} />
                    <span className="text-[12px]">Ajustes</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-white/55 hover:text-white/90 focus:text-white/90 hover:bg-white/[0.05] focus:bg-white/[0.05] cursor-pointer transition-all"
                  >
                    <Palette className="h-3.5 w-3.5 shrink-0 transition-all group-hover:text-violet-400" strokeWidth={1.5} />
                    <span className="text-[12px]">Apariencia</span>
                  </DropdownMenuItem>
                  {session?.user?.role === 'ADMIN' && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/billing"
                        className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-white/55 hover:text-white/90 focus:text-white/90 hover:bg-white/[0.05] focus:bg-white/[0.05] cursor-pointer transition-all"
                      >
                        <Zap className="h-3.5 w-3.5 shrink-0 transition-all group-hover:text-amber-400" strokeWidth={1.5} />
                        <span className="text-[12px] flex-1">Billing & Plan</span>
                        <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">Upgrade</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-white/55 hover:text-white/90 focus:text-white/90 hover:bg-white/[0.05] focus:bg-white/[0.05] cursor-pointer transition-all"
                  >
                    <HelpCircle className="h-3.5 w-3.5 shrink-0 transition-all group-hover:text-violet-400" strokeWidth={1.5} />
                    <span className="text-[12px]">Soporte</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-white/55 hover:text-white/90 focus:text-white/90 hover:bg-white/[0.05] focus:bg-white/[0.05] cursor-pointer transition-all"
                  >
                    <Command className="h-3.5 w-3.5 shrink-0 transition-all group-hover:text-violet-400" strokeWidth={1.5} />
                    <span className="text-[12px] flex-1">Atajos</span>
                    <span className="text-[10px] text-white/25 font-mono">⌘K</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
                <DropdownMenuItem
                  className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-red-400/70 hover:text-red-400 focus:text-red-400 hover:bg-red-500/[0.08] focus:bg-red-500/[0.08] cursor-pointer transition-all"
                  onClick={() => signOut({ callbackUrl: getLogoutUrl() })}
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  <span className="text-[12px]">Cerrar sesión</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </header>
  );
}