'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
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

  const userName  = session?.user?.name  || 'Usuario';
  const userImage = session?.user?.image;

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
    <header className="h-12 border-b border-white/[0.06] bg-[#0b0b0f]/80 backdrop-blur-xl sticky top-0 z-30">
      <div className="flex items-center h-full px-4 md:px-6 gap-3">

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-white/60 hover:text-white hover:bg-white/[0.06]"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-white/50 truncate">{getPageTitle()}</span>
        </div>

        <div className="flex-1 max-w-sm mx-auto hidden sm:block">
          <button
            onClick={() => setCommandOpen(true)}
            className="w-full flex items-center gap-2 h-7 px-3 rounded-md border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-white/30 hover:text-white/50"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs flex-1 text-left">Buscar...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 h-4 px-1.5 rounded border border-white/[0.08] bg-white/[0.04] text-[10px] text-white/25 font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden text-white/60 hover:text-white hover:bg-white/[0.06]"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="w-5 h-5" />
          </Button>

          <NotificationsDropdown />

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={userImage || undefined} alt={userName} />
                  <AvatarFallback
                    style={{ backgroundColor: ((session?.user as any)?.color || '#7c3aed') + '33', color: (session?.user as any)?.color || '#a78bfa' }}
                    className="text-xs font-medium"
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 bg-[#16161e] border-white/[0.08] text-white p-0 overflow-hidden"
              align="end"
            >
              {/* Header: Avatar + nombre + rol */}
              <div className="flex items-center gap-3 px-3 py-3 border-b border-white/[0.06]">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={userImage || undefined} alt={userName} />
                  <AvatarFallback
                    style={{ backgroundColor: ((session?.user as any)?.color || '#7c3aed') + '33', color: (session?.user as any)?.color || '#a78bfa' }}
                    className="text-xs font-semibold"
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate">{userName}</p>
                  {(session?.user as any)?.customRoleLabel ? (
                    <span
                      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium mt-0.5"
                      style={{ backgroundColor: ((session?.user as any)?.customRoleColor || '#7c3aed') + '22', color: (session?.user as any)?.customRoleColor || '#a78bfa' }}
                    >
                      {(session?.user as any)?.customRoleLabel}
                    </span>
                  ) : (
                    <p className="text-[11px] text-white/40 truncate">{session?.user?.email || ''}</p>
                  )}
                </div>
              </div>

              {/* Menu items */}
              <div className="p-1">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="text-white/70 focus:text-white focus:bg-white/[0.05] cursor-pointer gap-3"
                    onClick={() => router.push('/dashboard/settings')}
                  >
                    <User className="h-4 w-4" strokeWidth={1.5} />
                    Mi perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-white/70 focus:text-white focus:bg-white/[0.05] cursor-pointer gap-3"
                    onClick={() => router.push('/dashboard/settings')}
                  >
                    <Settings className="h-4 w-4" strokeWidth={1.5} />
                    Ajustes
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-white/70 focus:text-white focus:bg-white/[0.05] cursor-pointer gap-3">
                    <Palette className="h-4 w-4" strokeWidth={1.5} />
                    Apariencia
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-white/70 focus:text-white focus:bg-white/[0.05] cursor-pointer gap-3">
                    <Zap className="h-4 w-4" strokeWidth={1.5} />
                    <span className="flex-1">Upgrade</span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">PRO</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="text-white/70 focus:text-white focus:bg-white/[0.05] cursor-pointer gap-3">
                    <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
                    Soporte
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-white/70 focus:text-white focus:bg-white/[0.05] cursor-pointer gap-3">
                    <Command className="h-4 w-4" strokeWidth={1.5} />
                    <span className="flex-1">Atajos</span>
                    <span className="text-[10px] text-white/25 font-mono">⌘K</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem
                  className="text-red-400/80 focus:text-red-400 focus:bg-red-500/10 cursor-pointer gap-3"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                  Cerrar sesión
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </header>
  );
}